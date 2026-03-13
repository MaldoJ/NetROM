CREATE TABLE IF NOT EXISTS collectibles (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  category ENUM('ANSI_RELIC','MALWARE_SPECIMEN','ARCHIVED_LOG') NOT NULL,
  rarity ENUM('COMMON','UNCOMMON','RARE','EPIC') NOT NULL,
  name VARCHAR(128) NOT NULL,
  acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_collectibles_player FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  scope ENUM('DAILY','WEEKLY') NOT NULL,
  task_key VARCHAR(64) NOT NULL,
  objective_value INT NOT NULL,
  reward_json JSON NOT NULL,
  active_from DATETIME NOT NULL,
  active_to DATETIME NOT NULL,
  UNIQUE KEY uq_tasks_scope_key_active (scope, task_key, active_from)
);

CREATE TABLE IF NOT EXISTS player_task_progress (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  task_id VARCHAR(64) NOT NULL,
  progress_value INT NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  CONSTRAINT fk_player_task_progress_player FOREIGN KEY (player_id) REFERENCES players(id),
  CONSTRAINT fk_player_task_progress_task FOREIGN KEY (task_id) REFERENCES tasks(id),
  UNIQUE KEY uq_player_task_progress_player_task (player_id, task_id)
);

CREATE TABLE IF NOT EXISTS player_sessions (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  guild_id VARCHAR(32) NOT NULL,
  core_channel_id VARCHAR(32) NOT NULL,
  thread_channel_id VARCHAR(32) NOT NULL,
  status ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_player_sessions_player FOREIGN KEY (player_id) REFERENCES players(id),
  UNIQUE KEY uq_player_sessions_player_status (player_id, status)
);
