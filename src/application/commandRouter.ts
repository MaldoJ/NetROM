export type ShellCommand =
  | '.sh start'
  | '.sh help'
  | '.sh status'
  | '.sh profile'
  | '.sh scan'
  | '.sh connect'
  | '.sh claim'
  | '.sh upgrade';

export function normalizeCommand(content: string): string {
  return content.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isSupportedCommand(content: string): content is ShellCommand {
  return [
    '.sh start',
    '.sh help',
    '.sh status',
    '.sh profile',
    '.sh scan',
    '.sh connect',
    '.sh claim',
    '.sh upgrade',
  ].includes(normalizeCommand(content));
}
