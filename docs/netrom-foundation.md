# NETROM: MVP Foundation (Phase 1 Start)

## 1) Concise technical restatement

NETROM is a Discord-first asynchronous multiplayer game built around a terminal fantasy. Each player owns a persistent node and uses `.sh`-style commands in a shared game channel + private player thread to run a compact loop:

`scan -> connect -> claim -> upgrade -> progress`.

The architecture should keep game rules independent of Discord rendering, so command transport can evolve without rewriting progression logic.

## 2) MVP feature set

### Core scope (must-have)
- Onboarding (`.sh start`) with node creation.
- Private player thread session model for immersive command flow.
- Core gameplay loop:
  - `.sh scan` discovers one actionable target.
  - `.sh connect` resolves encounter gate.
  - `.sh claim` grants deterministic reward packet.
- Wallet resources: Credits, Data, Cycles, Parts.
- First upgrades: modem (bandwidth), storage array, CPU.
- Early progression: level/reputation + Dial-Up era baseline.
- Basic collectibles drop chance (ANSI relic / archived log / malware specimen).
- Daily + weekly objective hooks (single active set).
- Basic player profile + leaderboard.

### Explicit non-goals for MVP
- Full PvP combat.
- Full economy depth for market tokens.
- Multi-faction narrative branches.
- Real-time event engine.

## 3) Recommended stack

- Runtime: Node.js 24+
- Language: TypeScript (strict mode)
- Bot framework: discord.js v14+
- DB: MariaDB 11+
- DB access: thin repository layer (mariadb driver)
- Validation: zod
- Testing: vitest
- Config: dotenv

## 4) Clean architecture

### Layers
1. **Domain**: entities, enums, and pure game rules.
2. **Application**: use-cases (`onboard`, `scan`, `claim`, `upgrade`) and command routing.
3. **Infrastructure**: MariaDB repositories, transaction boundaries, ID/time providers.
4. **Transport (Discord)**: message/slash adapters that parse `.sh` grammar and render terminal embeds.

### Key rule
Discord-specific structures (embeds, threads, mentions) must not live inside domain logic.

## 5) MVP database schema proposal

```sql
-- players
id (pk), discord_user_id (unique), handle, current_era, reputation, created_at

-- player_nodes
id (pk), player_id (fk), node_name, archetype,
integrity, bandwidth, storage, processing, security,
credits, data, cycles, parts,
created_at, updated_at

-- scan_results
id (pk), player_id (fk), discovery_type, threat_level,
reward_hint, expires_at, resolved_at, created_at

-- collectibles
id (pk), player_id (fk), category, rarity, name,
serial_code, source_tag, acquired_at

-- tasks
id (pk), scope(daily|weekly), task_key, objective_value, reward_json, active_from, active_to

-- player_task_progress
id (pk), player_id (fk), task_id (fk), progress_value, completed_at

-- player_sessions
id (pk), player_id (fk), guild_id, core_channel_id, thread_channel_id, status, created_at
```

## 6) Core command + interaction flow

### Core channel
- `.sh start`: creates player + node and opens private thread.
- `.sh profile`: returns public snapshot.
- `.sh leaderboard`: returns top reputation/resources.

### Private thread
- `.sh help`: command catalog.
- `.sh status`: node health + resources + active task.
- `.sh scan`: generate one temporary target.
- `.sh connect`: attempt handshake to active target.
- `.sh claim`: claim rewards from successful connection.
- `.sh upgrade <modem|storage|cpu>`: spend credits + parts.

### Presentation pattern
- Routine: terminal text + embed.
- Notable discovery: image + embed.
- Major milestone (era unlock / rare collectible): image + embed + image.

## 7) Roadmap

## Phase 1: MVP foundation
- Implement onboarding, sessions, node state, scan/connect/claim loop, wallet, first upgrades, minimal tasks, profile/leaderboard.

## Phase 2: progression + factions
- Faction reputation tracks, faction dailies/weeklies, unlockable faction shop lines, era transition gates.

## Phase 3: market + collectibles
- Simulated exchange (BITL/ANSI/BLKR/GRID/WRM), event-driven token volatility, collectible set bonuses, Chainprint mint/provenance.

## Phase 4: advanced systems + polish
- Cooperative ops, asynchronous PvP raids, malware loadout meta, seasonal world events, deep terminal UX pack.

## 8) Phase 1 implementation started in this repo

Implemented now:
- Domain entities/types for players, nodes, scan results, collectibles.
- `GameEngine` use-cases for onboarding, scanning, claiming, and upgrading.
- `.sh` command normalization + supported command map.
- TypeScript project/test scaffold.

Immediate next implementation steps:
1. Expand objective depth beyond basic hooks (task generation, rewards, completion UX).
2. Add richer collectible systems (set tracking, rarity effects, profile surfacing).
3. Harden session lifecycle (thread archival handling, recovery, and re-provisioning).
4. Advance progression tuning (reputation gain paths, era-gate balancing, upgrade economy).
5. Start Phase 2 faction progression once Phase 1 acceptance criteria are locked.
