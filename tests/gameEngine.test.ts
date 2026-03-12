import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/application/gameEngine.js';

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
});
