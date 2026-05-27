-- Add read_at to track which notifications have been seen by the user
ALTER TABLE public.notification_log
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Index for fast unread count queries
CREATE INDEX IF NOT EXISTS notification_log_unread_idx
  ON public.notification_log (user_id, read_at)
  WHERE read_at IS NULL;

-- Allow users to mark their own notifications as read
CREATE POLICY "notification_log: own update" ON public.notification_log
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
