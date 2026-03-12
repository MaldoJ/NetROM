export type Era = 'DIAL_UP' | 'BULLETIN_RELAY' | 'EARLY_INTERNET' | 'MODERN_GRID';

export type NodeArchetype =
  | 'RELAY_NODE'
  | 'VAULT_NODE'
  | 'MARKET_NODE'
  | 'HUNTER_NODE'
  | 'GHOST_NODE';

export type DiscoveryType =
  | 'ABANDONED_RELAY'
  | 'VULNERABLE_NODE'
  | 'ARCHIVE_CACHE'
  | 'FACTION_CONTRACT';

export type ResourceWallet = {
  credits: number;
  data: number;
  cycles: number;
  parts: number;
};
