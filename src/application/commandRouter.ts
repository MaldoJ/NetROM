export type ShellCommand =
  | '.sh start'
  | '.sh help'
  | '.sh status'
  | '.sh profile'
  | '.sh collection'
  | '.sh leaderboard'
  | '.sh factions'
  | '.sh factions tasks'
  | '.sh factions shop'
  | '.sh factions contracts'
  | '.sh resume'
  | '.sh tasks'
  | '.sh tasks claim'
  | '.sh next'
  | '.sh scan'
  | '.sh connect'
  | '.sh claim'
  | '.sh upgrade'
  | `.sh upgrade ${UpgradePath}`;

type UpgradePath = 'modem' | 'storage' | 'cpu';

const UPGRADE_COMMAND_PATTERN = /^\.sh upgrade(?: (modem|storage|cpu))?$/;

export function normalizeCommand(content: string): string {
  return content.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isSupportedCommand(content: string): content is ShellCommand {
  const normalized = normalizeCommand(content);
  if (UPGRADE_COMMAND_PATTERN.test(normalized)) {
    return true;
  }

  return [
    '.sh start',
    '.sh help',
    '.sh status',
    '.sh profile',
    '.sh collection',
    '.sh leaderboard',
    '.sh factions',
    '.sh factions tasks',
    '.sh factions shop',
    '.sh factions contracts',
    '.sh resume',
    '.sh tasks',
    '.sh tasks claim',
    '.sh next',
    '.sh scan',
    '.sh connect',
    '.sh claim',
  ].includes(normalized);
}
