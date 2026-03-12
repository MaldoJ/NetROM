import type { Connection } from 'mariadb';
import type { PlayerNode } from '../../domain/entities.js';
import type { PlayerNodeRepository } from '../../application/ports/repositories.js';

type PlayerNodeRow = {
  id: string;
  player_id: string;
  node_name: string;
  archetype: PlayerNode['archetype'];
  integrity: number;
  bandwidth: number;
  storage: number;
  processing: number;
  security: number;
  credits: number;
  data: number;
  cycles: number;
  parts: number;
};

export class MariaDbPlayerNodeRepository implements PlayerNodeRepository {
  constructor(private readonly connection: Connection) {}

  async create(node: PlayerNode): Promise<void> {
    await this.connection.query(
      `INSERT INTO player_nodes (
        id, player_id, node_name, archetype,
        integrity, bandwidth, storage, processing, security,
        credits, data, cycles, parts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        node.id,
        node.playerId,
        node.name,
        node.archetype,
        node.integrity,
        node.bandwidth,
        node.storage,
        node.processing,
        node.security,
        node.wallet.credits,
        node.wallet.data,
        node.wallet.cycles,
        node.wallet.parts,
      ],
    );
  }

  async findByPlayerId(playerId: string): Promise<PlayerNode | null> {
    const rows = await this.connection.query<PlayerNodeRow[]>(
      `SELECT
        id, player_id, node_name, archetype,
        integrity, bandwidth, storage, processing, security,
        credits, data, cycles, parts
      FROM player_nodes
      WHERE player_id = ?
      LIMIT 1`,
      [playerId],
    );

    return rows[0] ? mapPlayerNode(rows[0]) : null;
  }

  async update(node: PlayerNode): Promise<void> {
    await this.connection.query(
      `UPDATE player_nodes
       SET node_name = ?, archetype = ?, integrity = ?, bandwidth = ?, storage = ?, processing = ?, security = ?,
           credits = ?, data = ?, cycles = ?, parts = ?
       WHERE id = ?`,
      [
        node.name,
        node.archetype,
        node.integrity,
        node.bandwidth,
        node.storage,
        node.processing,
        node.security,
        node.wallet.credits,
        node.wallet.data,
        node.wallet.cycles,
        node.wallet.parts,
        node.id,
      ],
    );
  }
}

function mapPlayerNode(row: PlayerNodeRow): PlayerNode {
  return {
    id: row.id,
    playerId: row.player_id,
    name: row.node_name,
    archetype: row.archetype,
    integrity: row.integrity,
    bandwidth: row.bandwidth,
    storage: row.storage,
    processing: row.processing,
    security: row.security,
    wallet: {
      credits: row.credits,
      data: row.data,
      cycles: row.cycles,
      parts: row.parts,
    },
  };
}
