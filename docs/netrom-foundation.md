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
- `.sh factions`: shows current faction standing tracks (Phase 2 progression hook).

### Private thread
- `.sh help`: command catalog.
- `.sh status`: node health + resources + active task.
- `.sh tasks`: list active daily/weekly objectives with progress + rewards.
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

## 8) Phase 1 completion status (locked)

Phase 1 acceptance criteria are now locked and met in this repository.

### Acceptance criteria

| Area | Phase 1 criteria | Status |
| --- | --- | --- |
| Onboarding + sessions | `.sh start` provisions player/node and creates private thread session. `.sh resume` restores archived/missing sessions and re-provisions thread when needed. | ✅ Complete |
| Node state + wallet | Persistent node stats + wallet resources (credits/data/cycles/parts) are loaded and mutated through game actions. | ✅ Complete |
| Core loop | `.sh scan` → `.sh connect` → `.sh claim` flow implemented with expiring targets and deterministic reward packets. | ✅ Complete |
| Upgrades | `.sh upgrade <modem|storage|cpu>` consumes resources and advances node capabilities. | ✅ Complete |
| Objectives | Daily + weekly tasks are generated, tracked by action hooks, surfaced with progress, and paid out via `.sh tasks claim`. | ✅ Complete |
| Collectibles | Claim loop can drop collectibles with rarity effects, collection summary, set forge progression, and profile surfacing. | ✅ Complete |
| Social surfaces | `.sh profile`, `.sh collection`, and `.sh leaderboard` provide MVP public/progression visibility. | ✅ Complete |
| Quality gate | Test suite validates game engine, command routing, loop behavior, and discord formatting helpers. | ✅ Complete |

### Phase transition gate

With the criteria above locked and met, the project is ready to enter Phase 2 (progression + factions).


## 9) Phase 2 kickoff status (completed increment)

- Added persistent player-faction reputation rows for Helix Syndicate, Null Sector, and Lattice Collective.
- Added `.sh factions` command surface to view faction standings in-game.
- Added `.sh factions tasks` board preview plus `.sh factions shop` and `.sh factions contracts` views to expose rank-gated progression surfaces.
- Claim loop now awards faction contract reputation and applies rank progression in persistent standings.
- Next implementation targets: unlockable shop inventory and era transition contract gates.
