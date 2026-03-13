CREATE TABLE IF NOT EXISTS player_faction_reputation (
  id VARCHAR(96) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  faction ENUM('HELIX_SYNDICATE','NULL_SECTOR','LATTICE_COLLECTIVE') NOT NULL,
  reputation INT NOT NULL DEFAULT 0,
  rank_level INT NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_player_faction_reputation_player FOREIGN KEY (player_id) REFERENCES players(id),
  UNIQUE KEY uq_player_faction_reputation_player_faction (player_id, faction)
);

CREATE INDEX idx_player_faction_reputation_faction_rank
  ON player_faction_reputation (faction, reputation DESC);
