# NETROM

NETROM is a Discord-native multiplayer terminal game where players evolve from dial-up era sysops into modern network operators.

## Phase 1 deliverable (implemented here)

This repository now includes a concrete MVP foundation:

- TypeScript + Node 24+ project scaffold
- Domain-first game engine skeleton
- `.sh` command normalization + support map
- MVP data model draft for MariaDB
- Initial MariaDB migration runner + repository layer scaffolding
- Design docs for architecture, command UX, and phased roadmap

See `docs/netrom-foundation.md` for complete design + implementation details.

## Database setup

Configure DB credentials with environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`) then run:

```bash
npm run migrate
```

Migrations are in `src/infrastructure/db/migrations`.
