# NETROM

NETROM is a Discord-native multiplayer terminal game where players evolve from dial-up era sysops into modern network operators.

## Phase 2 deliverable (current increment)

This repository now includes the Phase 1 MVP foundation plus the current Phase 2 progression increment:

- TypeScript + Node 24+ project scaffold
- Domain-first game engine skeleton
- `.sh` command normalization + support map
- MVP data model draft for MariaDB
- Initial MariaDB migration runner + repository layer implementation
- Task progression + reward claiming loop (`.sh tasks`, `.sh tasks claim`)
- Collectible progression surfaces (`.sh collection`, profile collectible stats)
- Session recovery workflow (`.sh resume`)
- Faction standing + progression surfaces (`.sh factions`, `.sh factions tasks`, `.sh factions shop`, `.sh factions contracts`)
- Contract-side faction reputation payouts from successful claim loops
- Design docs for architecture, command UX, and phased roadmap

See `docs/netrom-foundation.md` for complete design + implementation details.

## Database setup

Configure DB credentials with environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`) then run:

```bash
npm run migrate
```

Migrations are in `src/infrastructure/db/migrations`.
