-- Add notification table for user notifications
CREATE TABLE IF NOT EXISTS notification (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notification_user_created ON notification(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_user_unread ON notification(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_type ON notification(type);

-- Add comments for documentation
COMMENT ON TABLE notification IS 'User notifications for comment replies, video completion, etc.';
COMMENT ON COLUMN notification.type IS 'Notification type: comment_reply, video_complete, image_complete, etc.';
COMMENT ON COLUMN notification.metadata IS 'Additional data stored as JSON string';
