import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/application/gameEngine.js';
import { SequenceRandomSource } from '../src/application/random.js';

describe('scan -> connect -> claim loop', () => {
  it('claims deterministic rewards from an active scan target', () => {
    const engine = new GameEngine(new SequenceRandomSource([0.3, 0.4]));
    const { node } = engine.onboard('123', 'sysop', 'alpha-node', 'RELAY_NODE');

    const scan = engine.scan('plr_123');
    expect(scan.discoveryType).toBe('VULNERABLE_NODE');

    const connected = engine.connect(scan, new Date(scan.expiresAt.getTime() - 1000));
    const claimedNode = engine.claim(node, connected.discoveryType);

    expect(claimedNode.wallet.data).toBe(node.wallet.data + 20);
    expect(claimedNode.wallet.cycles).toBe(node.wallet.cycles + 2);
  });

  it('rejects connect when the target lock has expired', () => {
    const engine = new GameEngine(new SequenceRandomSource([0.1, 0.2]));
    const scan = engine.scan('plr_123');

    expect(() => engine.connect(scan, new Date(scan.expiresAt.getTime() + 1))).toThrow('Target lock expired.');
  });
});
