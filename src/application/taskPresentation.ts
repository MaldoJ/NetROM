import type { TaskDefinition } from '../domain/entities.js';
import type { TaskKey } from '../domain/types.js';

const TASK_LABELS: Record<TaskKey, string> = {
  RUN_SCANS: 'Run scans',
  CONNECT_TARGETS: 'Connect targets',
  CLAIM_REWARDS: 'Claim rewards',
  UPGRADE_NODE: 'Upgrade node',
};

export function taskLabel(taskKey: TaskKey): string {
  return TASK_LABELS[taskKey];
}

export function formatTaskProgressLabel(task: TaskDefinition, progressValue: number): string {
  const clamped = Math.max(0, Math.min(progressValue, task.objectiveValue));
  const percent = Math.floor((clamped / task.objectiveValue) * 100);
  return `${taskLabel(task.key)} ${clamped}/${task.objectiveValue} (${percent}%)`;
}
