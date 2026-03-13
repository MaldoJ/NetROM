import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Message,
  type ThreadChannel,
  type TextChannel,
} from 'discord.js';
import { GameEngine } from '../../application/gameEngine.js';
import { normalizeCommand } from '../../application/commandRouter.js';
import {
  collectiblePrestigeScore,
  collectiblePrestigeTier,
  setForgeProgress,
} from '../../application/collectibleProgression.js';
import { formatTaskProgressLabel, taskLabel } from '../../application/taskPresentation.js';
import type { Player, PlayerNode, TaskDefinition } from '../../domain/entities.js';
import type { Faction, NodeArchetype } from '../../domain/types.js';
import { createDbPool } from '../../infrastructure/db/mariadb.js';
import { MariaDbPlayerRepository } from '../../infrastructure/repositories/mariadbPlayerRepository.js';
import { MariaDbPlayerNodeRepository } from '../../infrastructure/repositories/mariadbPlayerNodeRepository.js';
import { MariaDbScanResultRepository } from '../../infrastructure/repositories/mariadbScanResultRepository.js';
import { MariaDbCollectibleRepository } from '../../infrastructure/repositories/mariadbCollectibleRepository.js';
import { MariaDbPlayerSessionRepository } from '../../infrastructure/repositories/mariadbPlayerSessionRepository.js';
import { MariaDbTaskRepository } from '../../infrastructure/repositories/mariadbTaskRepository.js';
import { MariaDbPlayerTaskProgressRepository } from '../../infrastructure/repositories/mariadbPlayerTaskProgressRepository.js';
import { MariaDbFactionReputationRepository } from '../../infrastructure/repositories/mariadbFactionReputationRepository.js';

const HELP_TEXT = [
  '```',
  '.sh start [handle] [node-name] [archetype]',
  '.sh profile',
  '.sh collection',
  '.sh leaderboard',
  '.sh factions',
  '.sh factions shop',
  '.sh factions contracts',
  '.sh resume',
  '.sh status',
  '.sh tasks',
  '.sh tasks claim',
  '.sh next',
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
    const collectibles = new MariaDbCollectibleRepository(connection);
    const sessions = new MariaDbPlayerSessionRepository(connection);
    const tasks = new MariaDbTaskRepository(connection);
    const taskProgress = new MariaDbPlayerTaskProgressRepository(connection);
    const factionReputation = new MariaDbFactionReputationRepository(connection);

    try {
      if (content === '.sh help') {
        await message.reply(HELP_TEXT);
        return;
      }

      if (content.startsWith('.sh start')) {
        await handleStart(message, content, players, nodes, sessions, engine);
        return;
      }

      if (content === '.sh resume') {
        await handleResume(message, players, sessions);
        return;
      }

      const existingPlayer = await players.findByDiscordUserId(message.author.id);
      if (!existingPlayer) {
        await message.reply('Run `.sh start` first to initialize your node.');
        return;
      }

      const threadOnlyCommands = new Set(['.sh help', '.sh status', '.sh tasks', '.sh next', '.sh scan', '.sh connect', '.sh claim']);
      if (content.startsWith('.sh upgrade')) {
        threadOnlyCommands.add('.sh upgrade');
      }

      if (threadOnlyCommands.has(content.split(' ').slice(0, 2).join(' '))) {
        const activeSession = await ensureActiveSessionThread(existingPlayer.id, sessions, message);
        if (!activeSession) {
          await message.reply('No active private session. Run `.sh resume` in the core channel to recover one.');
          return;
        }

        if (message.channel.type !== ChannelType.PrivateThread || message.channel.id !== activeSession.threadChannelId) {
          await message.reply('Run this command in your NETROM private thread.');
          return;
        }
      }


      if (content === '.sh collection') {
        const collectibleSummary = await collectibles.getSummaryByPlayerId(existingPlayer.id);
        const recentCollectibles = await collectibles.listRecentByPlayerId(existingPlayer.id, 5);

        await message.reply(
          formatCollectionResponse(
            collectibleSummary.total,
            collectibleSummary.completedSets,
            collectibleSummary.ansiTotal,
            collectibleSummary.archiveTotal,
            collectibleSummary.malwareTotal,
            collectibleSummary.categoriesUnlocked,
            recentCollectibles,
          ),
        );
        return;
      }

      if (content === '.sh profile') {
        const node = await nodes.findByPlayerId(existingPlayer.id);
        if (!node) {
          await message.reply('Node not found. Contact an operator.');
          return;
        }

        const collectibleSummary = await collectibles.getSummaryByPlayerId(existingPlayer.id);

        await message.reply(
          formatProfileResponse(
            existingPlayer.handle,
            existingPlayer.currentEra,
            existingPlayer.reputation,
            node.name,
            node.archetype,
            collectibleSummary.total,
            collectibleSummary.commonTotal,
            collectibleSummary.uncommonTotal,
            collectibleSummary.rareTotal,
            collectibleSummary.epicTotal,
            collectibleSummary.categoriesUnlocked,
            collectibleSummary.completedSets,
          ),
        );
        return;
      }


      if (content === '.sh factions') {
        await factionReputation.ensurePlayerRows(existingPlayer.id);
        const standings = await factionReputation.listByPlayerId(existingPlayer.id);
        await message.reply(formatFactionResponse(standings));
        return;
      }

      if (content === '.sh factions shop') {
        await factionReputation.ensurePlayerRows(existingPlayer.id);
        const standings = await factionReputation.listByPlayerId(existingPlayer.id);
        await message.reply(formatFactionShopResponse(standings));
        return;
      }

      if (content === '.sh factions contracts') {
        await factionReputation.ensurePlayerRows(existingPlayer.id);
        const standings = await factionReputation.listByPlayerId(existingPlayer.id);
        await message.reply(formatFactionContractsResponse(standings));
        return;
      }

      if (content === '.sh leaderboard') {
        const leaders = await players.listTopByReputation(10);
        if (leaders.length === 0) {
          await message.reply('No operators online yet. Run `.sh start` to become the first.');
          return;
        }

        const lines = leaders.map((leader, index) => `${index + 1}. **${leader.handle}** — Rep ${leader.reputation} (${leader.currentEra})`);
        await message.reply(`Leaderboard\n${lines.join('\n')}`);
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

      if (content === '.sh tasks claim') {
        const rewardClaimMessage = await claimCompletedTaskRewards(existingPlayer.id, players, nodes, tasks, taskProgress, engine);
        await message.reply(rewardClaimMessage);
        return;
      }

      if (content === '.sh tasks') {
        await ensureActiveTasks(tasks, engine);
        const activeTasks = await tasks.findActive(new Date());
        if (activeTasks.length === 0) {
          await message.reply('No active objectives available right now. Check back soon.');
          return;
        }

        const lines: string[] = [];
        for (const task of activeTasks) {
          const progress = await taskProgress.getOrCreate(existingPlayer.id, task.id);
          lines.push(formatTaskSnapshot(task, progress.progress_value, progress.completed_at, progress.reward_claimed_at));
        }

        await message.reply(`Active objectives\n${lines.join('\n')}`);
        return;
      }


      if (content === '.sh next') {
        const activeScan = await scans.findLatestActiveByPlayerId(existingPlayer.id, new Date());

        if (!activeScan) {
          const scan = engine.scan(existingPlayer.id);
          await scans.create(scan);
          const taskUpdateMessage = await applyTaskActionProgress(existingPlayer.id, 'SCAN', tasks, taskProgress, engine);
          await message.reply(
            `Next action: scan locked **${scan.discoveryType}** | Threat ${scan.threatLevel}/3
Hint: ${scan.rewardHint}
Expires: <t:${Math.floor(
              scan.expiresAt.getTime() / 1000,
            )}:R>${taskUpdateMessage ? `
${taskUpdateMessage}` : ''}`,
          );
          return;
        }

        const connectedScan = engine.connect(activeScan);
        const connectTaskUpdateMessage = await applyTaskActionProgress(existingPlayer.id, 'CONNECT', tasks, taskProgress, engine);

        const node = await nodes.findByPlayerId(existingPlayer.id);
        if (!node) {
          await message.reply('Node not found. Contact an operator.');
          return;
        }

        let claimedNode = engine.claim(node, connectedScan.discoveryType);
        await scans.markResolved(connectedScan.id);

        let factionContractLine = '';
        if (connectedScan.discoveryType === 'FACTION_CONTRACT') {
          const contractReward = engine.resolveFactionContract(connectedScan.threatLevel);
          const standing = await factionReputation.addReputation(
            existingPlayer.id,
            contractReward.faction,
            contractReward.reputationGain,
          );

          if (standing) {
            factionContractLine = `
Faction contract settled: **${factionLabel(standing.faction)}** +${contractReward.reputationGain} rep (total ${standing.reputation}, rank ${standing.rank}).`;
          }
        }

        const claimTaskUpdateMessage = await applyTaskActionProgress(existingPlayer.id, 'CLAIM', tasks, taskProgress, engine);

        const collectible = engine.rollCollectible(existingPlayer.id);
        let collectibleBonusLine = '';
        if (collectible) {
          await collectibles.create(collectible);
          const withBonus = engine.applyCollectibleRarityEffect(claimedNode, collectible);
          claimedNode = withBonus.node;
          collectibleBonusLine = withBonus.bonusSummary;
        }

        await nodes.update(claimedNode);

        await message.reply(
          `Next action: handshake complete with **${connectedScan.discoveryType}**.` +
            `
Claim complete. Wallet => credits:${claimedNode.wallet.credits} data:${claimedNode.wallet.data} cycles:${claimedNode.wallet.cycles} parts:${claimedNode.wallet.parts}` +
            factionContractLine +
            (collectible ? `
Collectible found: **${collectible.name}** (${collectible.rarity})${collectibleBonusLine ? ` | Rarity bonus ${collectibleBonusLine}` : ''}` : '') +
            (connectTaskUpdateMessage ? `
${connectTaskUpdateMessage}` : '') +
            (claimTaskUpdateMessage ? `
${claimTaskUpdateMessage}` : ''),
        );
        return;
      }

      if (content === '.sh scan') {
        const scan = engine.scan(existingPlayer.id);
        await scans.create(scan);
        const taskUpdateMessage = await applyTaskActionProgress(existingPlayer.id, 'SCAN', tasks, taskProgress, engine);
        await message.reply(
          `Scan locked: **${scan.discoveryType}** | Threat ${scan.threatLevel}/3\nHint: ${scan.rewardHint}\nExpires: <t:${Math.floor(
            scan.expiresAt.getTime() / 1000,
          )}:R>${taskUpdateMessage ? `\n${taskUpdateMessage}` : ''}`,
        );
        return;
      }

      if (content === '.sh connect') {
        const scan = await scans.findLatestActiveByPlayerId(existingPlayer.id, new Date());
        if (!scan) {
          await message.reply('No active target. Run `.sh scan` first.');
          return;
        }

        const activeScan = engine.connect(scan);
        const taskUpdateMessage = await applyTaskActionProgress(existingPlayer.id, 'CONNECT', tasks, taskProgress, engine);
        await message.reply(
          `Handshake complete with **${activeScan.discoveryType}**. Run \`.sh claim\` to capture rewards.${taskUpdateMessage ? `
${taskUpdateMessage}` : ''}`,
        );
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

        let claimedNode = engine.claim(node, scan.discoveryType);
        await scans.markResolved(scan.id);

        let factionContractLine = '';
        if (scan.discoveryType === 'FACTION_CONTRACT') {
          const contractReward = engine.resolveFactionContract(scan.threatLevel);
          const standing = await factionReputation.addReputation(
            existingPlayer.id,
            contractReward.faction,
            contractReward.reputationGain,
          );

          if (standing) {
            factionContractLine = `
Faction contract settled: **${factionLabel(standing.faction)}** +${contractReward.reputationGain} rep (total ${standing.reputation}, rank ${standing.rank}).`;
          }
        }

        const taskUpdateMessage = await applyTaskActionProgress(existingPlayer.id, 'CLAIM', tasks, taskProgress, engine);

        const collectible = engine.rollCollectible(existingPlayer.id);
        let collectibleBonusLine = '';
        if (collectible) {
          await collectibles.create(collectible);
          const withBonus = engine.applyCollectibleRarityEffect(claimedNode, collectible);
          claimedNode = withBonus.node;
          collectibleBonusLine = withBonus.bonusSummary;
        }

        await nodes.update(claimedNode);

        await message.reply(
          `Claim complete for **${scan.discoveryType}**. Wallet => credits:${claimedNode.wallet.credits} data:${claimedNode.wallet.data} cycles:${claimedNode.wallet.cycles} parts:${claimedNode.wallet.parts}` +
            factionContractLine +
            (collectible ? `
Collectible found: **${collectible.name}** (${collectible.rarity})${collectibleBonusLine ? ` | Rarity bonus ${collectibleBonusLine}` : ''}` : '') +
            (taskUpdateMessage ? `
${taskUpdateMessage}` : ''),
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
        const taskUpdateMessage = await applyTaskActionProgress(existingPlayer.id, 'UPGRADE', tasks, taskProgress, engine);
        await message.reply(
          `Upgrade applied: **${path}**. BW ${upgraded.bandwidth} | Storage ${upgraded.storage} | CPU ${upgraded.processing}${taskUpdateMessage ? `\n${taskUpdateMessage}` : ''}`,
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


async function applyTaskActionProgress(
  playerId: string,
  action: 'SCAN' | 'CONNECT' | 'CLAIM' | 'UPGRADE',
  tasks: MariaDbTaskRepository,
  taskProgress: MariaDbPlayerTaskProgressRepository,
  engine: GameEngine,
): Promise<string | null> {
  await ensureActiveTasks(tasks, engine);
  const activeTasks = await tasks.findActive(new Date());
  if (activeTasks.length === 0) return null;

  const progressUpdates: string[] = [];
  const completions: TaskDefinition[] = [];

  for (const task of activeTasks) {
    const stored = await taskProgress.getOrCreate(playerId, task.id);
    const nextProgress = engine.advanceProgressForAction(
      {
        playerId: stored.player_id,
        taskId: stored.task_id,
        progressValue: stored.progress_value,
        completedAt: stored.completed_at ? new Date(stored.completed_at) : null,
      },
      task,
      action,
      new Date(),
    );

    const storedCompletedAt = stored.completed_at ? new Date(stored.completed_at) : null;
    const completionUnchanged =
      (storedCompletedAt === null && nextProgress.completedAt === null) ||
      (storedCompletedAt !== null && nextProgress.completedAt !== null && storedCompletedAt.getTime() === nextProgress.completedAt.getTime());

    if (nextProgress.progressValue === stored.progress_value && completionUnchanged) {
      continue;
    }

    await taskProgress.setProgress(playerId, task.id, nextProgress.progressValue, nextProgress.completedAt);
    progressUpdates.push(engine.formatTaskProgress(task, nextProgress.progressValue));

    if (!stored.completed_at && nextProgress.completedAt) {
      completions.push(task);
    }
  }

  if (progressUpdates.length === 0) return null;

  const lines: string[] = [`Task progress: ${progressUpdates.join(' | ')}`];

  if (completions.length > 0) {
    lines.push(...completions.map((task) => `Task complete: **${task.key}** (${engine.formatTaskReward(task)}). Run \`.sh tasks claim\`.`));
  }

  return lines.join('\n');
}

async function claimCompletedTaskRewards(
  playerId: string,
  players: MariaDbPlayerRepository,
  nodes: MariaDbPlayerNodeRepository,
  tasks: MariaDbTaskRepository,
  taskProgress: MariaDbPlayerTaskProgressRepository,
  engine: GameEngine,
): Promise<string> {
  await ensureActiveTasks(tasks, engine);
  const activeTasks = await tasks.findActive(new Date());
  if (activeTasks.length === 0) {
    return 'No active objectives available right now. Check back soon.';
  }

  const player = await players.findById(playerId);
  const node = await nodes.findByPlayerId(playerId);
  if (!player || !node) {
    return 'Unable to claim objective payouts right now.';
  }

  let nextPlayer: Player = player;
  let nextNode: PlayerNode = node;
  const claimLines: string[] = [];
  const claimTime = new Date();

  for (const task of activeTasks) {
    const progress = await taskProgress.getOrCreate(playerId, task.id);
    if (!progress.completed_at || progress.reward_claimed_at) {
      continue;
    }

    const claimed = await taskProgress.markRewardClaimed(playerId, task.id, claimTime);
    if (!claimed) {
      continue;
    }

    const rewarded = engine.applyTaskReward(nextNode, nextPlayer, task);
    nextNode = rewarded.node;
    nextPlayer = rewarded.player;

    claimLines.push(`Claimed [${task.scope}] ${taskLabel(task.key)} => ${engine.formatTaskReward(task)}`);
  }

  if (claimLines.length === 0) {
    return 'No completed objective payouts ready to claim. Finish tasks first.';
  }

  await nodes.update(nextNode);
  await players.updateReputation(nextPlayer.id, nextPlayer.reputation);

  return `Objective payouts credited:\n${claimLines.join('\n')}`;
}

async function ensureActiveTasks(tasks: MariaDbTaskRepository, engine: GameEngine, now: Date = new Date()): Promise<void> {
  for (const scope of ['DAILY', 'WEEKLY'] as const) {
    const activeForScope = await tasks.findActiveByScope(scope, now);
    const targetCount = engine.activeTaskTarget(scope);

    if (activeForScope.length >= targetCount) {
      continue;
    }

    const activeKeys = new Set(activeForScope.map((task) => task.key));
    const generated = engine.createActiveTaskSet(scope, now).filter((task) => !activeKeys.has(task.key));
    const missing = targetCount - activeForScope.length;

    for (const task of generated.slice(0, missing)) {
      await tasks.create(task);
    }
  }
}



function factionLabel(faction: Faction): string {
  if (faction === 'HELIX_SYNDICATE') return 'Helix Syndicate';
  if (faction === 'NULL_SECTOR') return 'Null Sector';
  return 'Lattice Collective';
}

type FactionStanding = { faction: Faction; reputation: number; rank: number };

function reputationToNextRank(reputation: number): number {
  const currentRankFloor = Math.floor(reputation / 100) * 100;
  return currentRankFloor + 100 - reputation;
}

function sortFactionStandings(standings: FactionStanding[]): FactionStanding[] {
  return standings
    .slice()
    .sort((left, right) => right.reputation - left.reputation || left.faction.localeCompare(right.faction));
}

export function formatFactionShopResponse(standings: FactionStanding[]): string {
  if (standings.length === 0) {
    return 'No faction standing found yet. Complete contracts to unlock faction shop previews.';
  }

  const lines = sortFactionStandings(standings).map((entry) => {
    const lockStatus = entry.rank >= 2 ? 'UNLOCKED' : 'LOCKED';
    return `- **${factionLabel(entry.faction)}** | Rank ${entry.rank} | Access ${lockStatus} (requires rank 2)`;
  });

  return `Faction shop preview
${lines.join('\n')}`;
}

export function formatFactionContractsResponse(standings: FactionStanding[]): string {
  if (standings.length === 0) {
    return 'No faction standing found yet. Complete contracts to unlock contract tiers.';
  }

  const lines = sortFactionStandings(standings).map((entry) => {
    const availableTier = entry.rank >= 3 ? 'Tier III' : entry.rank >= 2 ? 'Tier II' : 'Tier I';
    const nextUnlock = entry.rank >= 3 ? 'MAX' : `Rank ${entry.rank + 1}`;
    return `- **${factionLabel(entry.faction)}** | Available ${availableTier} contracts | Next unlock: ${nextUnlock}`;
  });

  return `Faction contract board
${lines.join('\n')}`;
}

export function formatFactionResponse(standings: FactionStanding[]): string {
  if (standings.length === 0) {
    return 'No faction standing found yet. Complete contracts to begin progression.';
  }

  const lines = sortFactionStandings(standings).map((entry) => {
    const repNeeded = reputationToNextRank(entry.reputation);
    return `- **${factionLabel(entry.faction)}** | Rep ${entry.reputation} | Rank ${entry.rank} | Next rank in ${repNeeded} rep`;
  });

  return `Faction standings
${lines.join('\n')}`;
}

async function handleStart(
  message: Message,
  content: string,
  players: MariaDbPlayerRepository,
  nodes: MariaDbPlayerNodeRepository,
  sessions: MariaDbPlayerSessionRepository,
  engine: GameEngine,
): Promise<void> {
  const existingPlayer = await players.findByDiscordUserId(message.author.id);
  if (existingPlayer) {
    await message.reply('Profile already exists. Use `.sh status` in your thread, or `.sh resume` in core if your thread is missing.');
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
  const thread = await channel.threads.create({
    name: `netrom-${onboarded.player.handle}`,
    autoArchiveDuration: 1440,
    reason: 'NETROM private command session',
    type: ChannelType.PrivateThread,
    invitable: false,
  });

  await sessions.create({
    id: `ses_${onboarded.player.id}`,
    playerId: onboarded.player.id,
    guildId: message.guildId ?? 'unknown',
    coreChannelId: channel.id,
    threadChannelId: thread.id,
    status: 'ACTIVE',
  });
}

async function handleResume(
  message: Message,
  players: MariaDbPlayerRepository,
  sessions: MariaDbPlayerSessionRepository,
): Promise<void> {
  if (message.channel.type !== ChannelType.GuildText) {
    await message.reply('Run `.sh resume` in the NETROM core channel.');
    return;
  }

  const existingPlayer = await players.findByDiscordUserId(message.author.id);
  if (!existingPlayer) {
    await message.reply('Run `.sh start` first to initialize your node.');
    return;
  }

  const channel = message.channel as TextChannel;
  const activeSession = await sessions.findActiveByPlayerId(existingPlayer.id);

  if (activeSession) {
    const existingThread = await message.guild?.channels.fetch(activeSession.threadChannelId).catch(() => null);
    if (existingThread?.isThread()) {
      if (existingThread.archived) {
        await existingThread.setArchived(false, 'NETROM session recovery');
      }

      await existingThread.members.add(message.author.id).catch(() => null);
      await message.reply(`Session restored in <#${activeSession.threadChannelId}>.`);
      return;
    }

    await sessions.archiveActiveByPlayerId(existingPlayer.id);
  }

  const thread = await channel.threads.create({
    name: `netrom-${existingPlayer.handle}`,
    autoArchiveDuration: 1440,
    reason: 'NETROM session recovery',
    type: ChannelType.PrivateThread,
    invitable: false,
  });

  await sessions.create({
    id: `ses_${existingPlayer.id}_${Date.now()}`,
    playerId: existingPlayer.id,
    guildId: message.guildId ?? 'unknown',
    coreChannelId: channel.id,
    threadChannelId: thread.id,
    status: 'ACTIVE',
  });

  await message.reply(`Recovered session thread: <#${thread.id}>`);
}

async function ensureActiveSessionThread(
  playerId: string,
  sessions: MariaDbPlayerSessionRepository,
  message: Message,
): Promise<{ threadChannelId: string } | null> {
  const activeSession = await sessions.findActiveByPlayerId(playerId);
  if (!activeSession) {
    return null;
  }

  const threadChannel = await message.guild?.channels.fetch(activeSession.threadChannelId).catch(() => null);
  if (!isUsablePrivateThread(threadChannel)) {
    await sessions.archiveActiveByPlayerId(playerId);
    return null;
  }

  if (threadChannel.archived || threadChannel.locked) {
    await sessions.archiveActiveByPlayerId(playerId);
    return null;
  }

  return activeSession;
}

function isUsablePrivateThread(channel: unknown): channel is ThreadChannel {
  return Boolean(channel && typeof channel === 'object' && 'isThread' in channel && typeof channel.isThread === 'function' && channel.isThread());
}

export function parseStartCommand(content: string, fallbackHandle: string): { handle: string; nodeName: string; archetype: NodeArchetype } {
  const [_, __, handle, nodeName, archetype] = content.trim().split(/\s+/);
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
  const path = content.trim().split(/\s+/)[2]?.toLowerCase();
  if (!path) return null;
  if (path === 'modem') return 'MODEM';
  if (path === 'storage') return 'STORAGE';
  if (path === 'cpu') return 'CPU';
  return null;
}

export function formatProfileResponse(
  handle: string,
  era: string,
  reputation: number,
  nodeName: string,
  nodeArchetype: string,
  totalCollectibles: number,
  commonCollectibles: number,
  uncommonCollectibles: number,
  rareCollectibles: number,
  epicCollectibles: number,
  categoriesUnlocked: number,
  completedSets: number,
): string {
  const prestigeScore = collectiblePrestigeScore({
    COMMON: commonCollectibles,
    UNCOMMON: uncommonCollectibles,
    RARE: rareCollectibles,
    EPIC: epicCollectibles,
  });
  const prestigeTier = collectiblePrestigeTier(completedSets);

  return (
    `Handle: **${handle}** | Era: **${era}** | Rep: **${reputation}**\n` +
    `Node: **${nodeName}** (${nodeArchetype})\n` +
    `Collectibles: **${totalCollectibles}** total | **${rareCollectibles + epicCollectibles}** rare+ | **${epicCollectibles}** epic\n` +
    `Rarity spread: C **${commonCollectibles}** | U **${uncommonCollectibles}** | R **${rareCollectibles}** | E **${epicCollectibles}**\n` +
    `Sets: **${completedSets}** complete | Categories unlocked: **${categoriesUnlocked}/3**\n` +
    `Forge rank: **${prestigeTier}** | Prestige score: **${prestigeScore}**`
  );
}


export function formatCollectionResponse(
  totalCollectibles: number,
  completedSets: number,
  ansiTotal: number,
  archiveTotal: number,
  malwareTotal: number,
  categoriesUnlocked: number,
  recentCollectibles: { name: string; rarity: string; category: string }[],
): string {
  const { fragments, missingPieces, nextSetTarget } = setForgeProgress(
    ansiTotal,
    archiveTotal,
    malwareTotal,
    completedSets,
  );
  const prestigeTier = collectiblePrestigeTier(completedSets);

  const recentLine =
    recentCollectibles.length === 0
      ? 'Recent drops: none yet. Run `.sh claim` to start collecting.'
      : `Recent drops: ${recentCollectibles
          .map((collectible) => `**${collectible.name}** [${collectible.rarity}] (${collectible.category})`)
          .join(' | ')}`;

  return `Collection vault
Total collectibles: **${totalCollectibles}**
Complete sets forged: **${completedSets}**
Category totals: ANSI **${ansiTotal}** | ARCHIVE **${archiveTotal}** | MALWARE **${malwareTotal}**
Set forge progress: **${fragments}/3** fragments toward set #${nextSetTarget} | Missing pieces: **${missingPieces}**
Category unlocks: **${categoriesUnlocked}/3**
Forge rank: **${prestigeTier}**
${recentLine}`;
}

export function formatTaskSnapshot(task: TaskDefinition, progressValue: number, completedAt: Date | null, rewardClaimedAt: Date | null): string {
  const clamped = Math.max(0, Math.min(progressValue, task.objectiveValue));
  const remaining = Math.max(0, task.objectiveValue - clamped);
  const timeRemainingMs = Math.max(0, task.activeTo.getTime() - Date.now());
  const hoursRemaining = Math.floor(timeRemainingMs / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));

  const state = completedAt ? (rewardClaimedAt ? '🟣' : '✅') : '🕓';
  const claimState = completedAt ? (rewardClaimedAt ? 'payout claimed' : 'payout ready') : 'in progress';
  const progressLabel = formatTaskProgressLabel(task, clamped);
  return `${state} [${task.scope}] ${progressLabel} (${remaining} left, ${hoursRemaining}h ${minutesRemaining}m remaining, ${claimState}) — ${taskLabel(task.key)} payout: ${task.reward.credits} credits, ${task.reward.parts} parts, ${task.reward.reputation} rep`;
}
