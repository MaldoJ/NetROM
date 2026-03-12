import type { Connection } from 'mariadb';
import type { ScanResult } from '../../domain/entities.js';
import type { ScanResultRepository } from '../../application/ports/repositories.js';

type ScanResultRow = {
  id: string;
  player_id: string;
  discovery_type: ScanResult['discoveryType'];
  threat_level: number;
  reward_hint: string;
  expires_at: Date;
};

export class MariaDbScanResultRepository implements ScanResultRepository {
  constructor(private readonly connection: Connection) {}

  async create(scanResult: ScanResult): Promise<void> {
    await this.connection.query(
      `INSERT INTO scan_results (id, player_id, discovery_type, threat_level, reward_hint, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        scanResult.id,
        scanResult.playerId,
        scanResult.discoveryType,
        scanResult.threatLevel,
        scanResult.rewardHint,
        scanResult.expiresAt,
      ],
    );
  }

  async findLatestActiveByPlayerId(playerId: string, now: Date): Promise<ScanResult | null> {
    const rows = await this.connection.query<ScanResultRow[]>(
      `SELECT id, player_id, discovery_type, threat_level, reward_hint, expires_at
       FROM scan_results
       WHERE player_id = ?
         AND expires_at > ?
         AND resolved_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [playerId, now],
    );

    return rows[0] ? mapScanResult(rows[0]) : null;
  }

  async markResolved(id: string): Promise<void> {
    await this.connection.query(
      `UPDATE scan_results
       SET resolved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id],
    );
  }
}

function mapScanResult(row: ScanResultRow): ScanResult {
  return {
    id: row.id,
    playerId: row.player_id,
    discoveryType: row.discovery_type,
    threatLevel: row.threat_level,
    rewardHint: row.reward_hint,
    expiresAt: new Date(row.expires_at),
  };
}
