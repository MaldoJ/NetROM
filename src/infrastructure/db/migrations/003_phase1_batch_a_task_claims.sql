ALTER TABLE player_task_progress
  ADD COLUMN reward_claimed_at DATETIME NULL AFTER completed_at;

CREATE INDEX idx_player_task_progress_claimable
  ON player_task_progress (player_id, completed_at, reward_claimed_at);
