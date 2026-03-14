import { describe, expect, it } from 'vitest';
import { formatTaskProgressLabel, taskLabel } from '../src/application/taskPresentation.js';
import type { TaskDefinition } from '../src/domain/entities.js';

function makeTask(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id: 'task_1',
    scope: 'DAILY',
    key: 'RUN_SCANS',
    objectiveValue: 5,
    reward: { credits: 10, parts: 1, reputation: 2 },
    activeFrom: new Date('2026-01-01T00:00:00Z'),
    activeTo: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  };
}

describe('taskLabel', () => {
  it('maps task keys to human-readable labels', () => {
    expect(taskLabel('RUN_SCANS')).toBe('Run scans');
    expect(taskLabel('CONNECT_TARGETS')).toBe('Connect targets');
    expect(taskLabel('CLAIM_REWARDS')).toBe('Claim rewards');
    expect(taskLabel('UPGRADE_NODE')).toBe('Upgrade node');
  });
});

describe('formatTaskProgressLabel', () => {
  it('clamps progress below zero to zero', () => {
    const label = formatTaskProgressLabel(makeTask(), -10);

    expect(label).toBe('Run scans 0/5 (0%)');
  });

  it('clamps progress above objective to objective value', () => {
    const label = formatTaskProgressLabel(makeTask(), 9);

    expect(label).toBe('Run scans 5/5 (100%)');
  });

  it('handles zero-objective tasks without NaN percent output', () => {
    const label = formatTaskProgressLabel(makeTask({ objectiveValue: 0 }), 3);

    expect(label).toBe('Run scans 0/0 (0%)');
  });
});
