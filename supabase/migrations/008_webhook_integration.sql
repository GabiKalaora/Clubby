-- Optional webhook integration per business
-- If set, the enroll-member edge function calls this URL instead of the generic flow
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS webhook_url text;

-- Shared secret for HMAC-SHA256 request signing (store verifies Clubby is the caller)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS webhook_secret text;
