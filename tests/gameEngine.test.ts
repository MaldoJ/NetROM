import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/application/gameEngine.js';
import { SequenceRandomSource } from '../src/application/random.js';

describe('GameEngine', () => {
  it('onboards a player with dial-up defaults', () => {
    const engine = new GameEngine();
    const { player, node } = engine.onboard('123', 'sysop', 'alpha-node', 'RELAY_NODE');

    expect(player.currentEra).toBe('DIAL_UP');
    expect(node.wallet.credits).toBe(100);
    expect(node.name).toBe('alpha-node');
  });

  it('applies upgrade cost and stat increase', () => {
    const engine = new GameEngine();
    const { node } = engine.onboard('123', 'sysop', 'alpha-node', 'RELAY_NODE');

    const upgraded = engine.upgrade(node, 'MODEM');
    expect(upgraded.bandwidth).toBe(node.bandwidth + 1);
    expect(upgraded.wallet.credits).toBe(50);
    expect(upgraded.wallet.parts).toBe(5);
  });

  it('uses injected random source for deterministic scan outcomes', () => {
    const engine = new GameEngine(new SequenceRandomSource([0.51, 0.8]));

    const scan = engine.scan('plr_123');
    expect(scan.discoveryType).toBe('ARCHIVE_CACHE');
    expect(scan.threatLevel).toBe(3);
  });
});
