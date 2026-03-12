import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Message,
  type TextChannel,
} from 'discord.js';
import { GameEngine } from '../../application/gameEngine.js';
import { normalizeCommand } from '../../application/commandRouter.js';
import type { NodeArchetype } from '../../domain/types.js';
import { createDbPool } from '../../infrastructure/db/mariadb.js';
import { MariaDbPlayerRepository } from '../../infrastructure/repositories/mariadbPlayerRepository.js';
import { MariaDbPlayerNodeRepository } from '../../infrastructure/repositories/mariadbPlayerNodeRepository.js';
import { MariaDbScanResultRepository } from '../../infrastructure/repositories/mariadbScanResultRepository.js';

const HELP_TEXT = [
  '```',
  '.sh start [handle] [node-name] [archetype]',
  '.sh profile',
  '.sh status',
  '.sh scan',
  '.sh connect',
  '.sh claim',
  '.sh upgrade <modem|storage|cpu>',
  '```',
].join('\n');

export function createDiscordBotClient(): Client {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  const engine = new GameEngine();
  const pool = createDbPool();

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = normalizeCommand(message.content);
    if (!content.startsWith('.sh')) return;

    const connection = await pool.getConnection();
    const players = new MariaDbPlayerRepository(connection);
    const nodes = new MariaDbPlayerNodeRepository(connection);
    const scans = new MariaDbScanResultRepository(connection);

    try {
      if (content === '.sh help') {
        await message.reply(HELP_TEXT);
        return;
      }

      if (content.startsWith('.sh start')) {
        await handleStart(message, content, players, nodes, engine);
        return;
      }

      const existingPlayer = await players.findByDiscordUserId(message.author.id);
      if (!existingPlayer) {
        await message.reply('Run `.sh start` first to initialize your node.');
        return;
      }

      if (content === '.sh profile') {
        const node = await nodes.findByPlayerId(existingPlayer.id);
        if (!node) {
          await message.reply('Node not found. Contact an operator.');
          return;
        }

        await message.reply(
          `Handle: **${existingPlayer.handle}** | Era: **${existingPlayer.currentEra}** | Rep: **${existingPlayer.reputation}**\n` +
            `Node: **${node.name}** (${node.archetype})`,
        );
        return;
      }

      if (content === '.sh status') {
        const node = await nodes.findByPlayerId(existingPlayer.id);
        if (!node) {
          await message.reply('Node not found. Contact an operator.');
          return;
        }

        await message.reply(
          `Integrity ${node.integrity}% | BW ${node.bandwidth} | Storage ${node.storage} | CPU ${node.processing} | Sec ${node.security}\n` +
            `Wallet => credits:${node.wallet.credits} data:${node.wallet.data} cycles:${node.wallet.cycles} parts:${node.wallet.parts}`,
        );
        return;
      }

      if (content === '.sh scan') {
        const scan = engine.scan(existingPlayer.id);
        await scans.create(scan);
        await message.reply(
          `Scan locked: **${scan.discoveryType}** | Threat ${scan.threatLevel}/3\nHint: ${scan.rewardHint}\nExpires: <t:${Math.floor(
            scan.expiresAt.getTime() / 1000,
          )}:R>`,
        );
        return;
      }

      if (content === '.sh connect') {
        const scan = await scans.findLatestActiveByPlayerId(existingPlayer.id, new Date());
        if (!scan) {
          await message.reply('No active target. Run `.sh scan` first.');
          return;
        }

        await message.reply(`Handshake complete with **${scan.discoveryType}**. Run \.sh claim to capture rewards.`);
        return;
      }

      if (content === '.sh claim') {
        const scan = await scans.findLatestActiveByPlayerId(existingPlayer.id, new Date());
        if (!scan) {
          await message.reply('No active target to claim.');
          return;
        }

        const node = await nodes.findByPlayerId(existingPlayer.id);
        if (!node) {
          await message.reply('Node not found. Contact an operator.');
          return;
        }

        const upgraded = engine.claim(node, scan.discoveryType);
        await nodes.update(upgraded);
        await scans.markResolved(scan.id);

        await message.reply(
          `Claim complete for **${scan.discoveryType}**. Wallet => credits:${upgraded.wallet.credits} data:${upgraded.wallet.data} cycles:${upgraded.wallet.cycles} parts:${upgraded.wallet.parts}`,
        );
        return;
      }

      if (content.startsWith('.sh upgrade')) {
        const node = await nodes.findByPlayerId(existingPlayer.id);
        if (!node) {
          await message.reply('Node not found. Contact an operator.');
          return;
        }

        const path = parseUpgradePath(content);
        if (!path) {
          await message.reply('Usage: `.sh upgrade <modem|storage|cpu>`');
          return;
        }

        const upgraded = engine.upgrade(node, path);
        await nodes.update(upgraded);
        await message.reply(
          `Upgrade applied: **${path}**. BW ${upgraded.bandwidth} | Storage ${upgraded.storage} | CPU ${upgraded.processing}`,
        );
        return;
      }

      await message.reply('Unknown command. Use `.sh help`.');
    } catch (error) {
      const response = error instanceof Error ? error.message : 'Unexpected transport error.';
      await message.reply(response);
    } finally {
      connection.release();
    }
  });

  return client;
}

async function handleStart(
  message: Message,
  content: string,
  players: MariaDbPlayerRepository,
  nodes: MariaDbPlayerNodeRepository,
  engine: GameEngine,
): Promise<void> {
  const existingPlayer = await players.findByDiscordUserId(message.author.id);
  if (existingPlayer) {
    await message.reply('Profile already exists. Use `.sh status` in your thread.');
    return;
  }

  const parsed = parseStartCommand(content, message.author.username);
  const onboarded = engine.onboard(message.author.id, parsed.handle, parsed.nodeName, parsed.archetype);

  await players.create(onboarded.player);
  await nodes.create(onboarded.node);

  await message.reply(
    `Welcome, **${onboarded.player.handle}**. Node **${onboarded.node.name}** online as **${onboarded.node.archetype}**.`,
  );

  if (message.channel.type !== ChannelType.GuildText) return;

  const channel = message.channel as TextChannel;
  await channel.threads.create({
    name: `netrom-${onboarded.player.handle}`,
    autoArchiveDuration: 1440,
    reason: 'NETROM private command session',
    type: ChannelType.PrivateThread,
    invitable: false,
  });
}

export function parseStartCommand(content: string, fallbackHandle: string): { handle: string; nodeName: string; archetype: NodeArchetype } {
  const [_, __, handle, nodeName, archetype] = content.split(' ');
  const normalizedArchetype = (archetype ?? 'relay').toUpperCase();

  return {
    handle: handle ?? fallbackHandle.toLowerCase(),
    nodeName: nodeName ?? `${fallbackHandle.toLowerCase()}-node`,
    archetype: coerceArchetype(normalizedArchetype),
  };
}

function coerceArchetype(value: string): NodeArchetype {
  if (value === 'VAULT' || value === 'VAULT_NODE') return 'VAULT_NODE';
  if (value === 'MARKET' || value === 'MARKET_NODE') return 'MARKET_NODE';
  if (value === 'HUNTER' || value === 'HUNTER_NODE') return 'HUNTER_NODE';
  if (value === 'GHOST' || value === 'GHOST_NODE') return 'GHOST_NODE';
  return 'RELAY_NODE';
}

export function parseUpgradePath(content: string): 'MODEM' | 'STORAGE' | 'CPU' | null {
  const path = content.split(' ')[2];
  if (!path) return null;
  if (path === 'modem') return 'MODEM';
  if (path === 'storage') return 'STORAGE';
  if (path === 'cpu') return 'CPU';
  return null;
}
