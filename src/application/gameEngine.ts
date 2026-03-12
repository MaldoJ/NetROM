import type { DiscoveryType, NodeArchetype } from '../domain/types.js';
import type { Player, PlayerNode, ScanResult } from '../domain/entities.js';

const BASE_RESOURCES = { credits: 100, data: 25, cycles: 5, parts: 10 };

export class GameEngine {
  onboard(discordUserId: string, handle: string, nodeName: string, archetype: NodeArchetype): { player: Player; node: PlayerNode } {
    const playerId = `plr_${discordUserId}`;
    const now = new Date();

    const player: Player = {
      id: playerId,
      discordUserId,
      handle,
      currentEra: 'DIAL_UP',
      reputation: 0,
      createdAt: now,
    };

    const node: PlayerNode = {
      id: `node_${discordUserId}`,
      playerId,
      name: nodeName,
      archetype,
      integrity: 100,
      bandwidth: 1,
      storage: 1,
      processing: 1,
      security: 1,
      wallet: { ...BASE_RESOURCES },
    };

    return { player, node };
  }

  scan(playerId: string): ScanResult {
    const discoveries: DiscoveryType[] = ['ABANDONED_RELAY', 'VULNERABLE_NODE', 'ARCHIVE_CACHE', 'FACTION_CONTRACT'];
    const discoveryType = discoveries[Math.floor(Math.random() * discoveries.length)];

    return {
      id: `scan_${Date.now()}`,
      playerId,
      discoveryType,
      threatLevel: Math.ceil(Math.random() * 3),
      rewardHint: this.rewardHint(discoveryType),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
  }

  claim(node: PlayerNode, discoveryType: DiscoveryType): PlayerNode {
    const next = structuredClone(node);
    switch (discoveryType) {
      case 'ABANDONED_RELAY':
        next.wallet.credits += 35;
        next.wallet.parts += 4;
        break;
      case 'VULNERABLE_NODE':
        next.wallet.data += 20;
        next.wallet.cycles += 2;
        break;
      case 'ARCHIVE_CACHE':
        next.wallet.data += 40;
        next.wallet.credits += 20;
        break;
      case 'FACTION_CONTRACT':
        next.wallet.credits += 50;
        next.wallet.cycles += 1;
        break;
    }
    return next;
  }

  upgrade(node: PlayerNode, path: 'MODEM' | 'STORAGE' | 'CPU'): PlayerNode {
    const next = structuredClone(node);
    if (next.wallet.credits < 50 || next.wallet.parts < 5) {
      throw new Error('Insufficient credits or parts.');
    }
    next.wallet.credits -= 50;
    next.wallet.parts -= 5;

    if (path === 'MODEM') next.bandwidth += 1;
    if (path === 'STORAGE') next.storage += 1;
    if (path === 'CPU') next.processing += 1;
    return next;
  }

  private rewardHint(type: DiscoveryType): string {
    if (type === 'ARCHIVE_CACHE') return 'Possible ANSI relic trace detected.';
    if (type === 'VULNERABLE_NODE') return 'Low firewall signature, high data yield.';
    if (type === 'FACTION_CONTRACT') return 'Faction packet waiting for handshake.';
    return 'Parts and credits likely recoverable.';
  }
}
