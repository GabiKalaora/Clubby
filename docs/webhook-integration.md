# Clubby Webhook Integration Guide

Connect your own backend to Clubby so you control exactly what benefit a customer receives when they scan your QR code.

---

## How it works

1. Customer scans your QR code with their phone
2. Clubby sends a **POST request** to your webhook URL
3. Your server responds with a benefit object
4. Clubby issues that benefit to the customer's wallet

If your server is unreachable or responds with an error, Clubby automatically falls back to your active promotions.

---

## Setting up your webhook

In the Clubby portal go to **Settings → Custom Backend Integration** and enter:

- **Webhook URL** — the HTTPS endpoint on your server
- **Signing Secret** — a shared secret to verify requests are from Clubby (optional but recommended)

---

## The request Clubby sends

```
POST https://your-backend.com/clubby/webhook
Content-Type: application/json
X-Clubby-Timestamp: 1717200000000
X-Clubby-Signature: <hmac-sha256 of body, signed with your secret>
```

**Body:**
```json
{
  "event": "qr_scan",
  "user_id": "3bae20ea-5114-4dbd-9c55-43d49621f7f5",
  "token": "Olr2j-dMkjVN",
  "timestamp": 1717200000000
}
```

| Field | Description |
|---|---|
| `event` | Always `"qr_scan"` for now |
| `user_id` | UUID of the customer who scanned |
| `token` | Your business's QR code token |
| `timestamp` | Unix timestamp in milliseconds |

---

## Verifying the signature (recommended)

Compute `HMAC-SHA256(body, your_secret)` and compare it to the `X-Clubby-Signature` header. Reject requests that don't match.

```js
const crypto = require('crypto')

function verifySignature(body, secret, signature) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  )
}
```

---

## What your server must respond with

Your server must respond within **5 seconds** with HTTP 200 and a JSON body:

```json
{
  "benefit": {
    "type": "discount",
    "title": "VIP 30% off — welcome back!",
    "discount_percent": 30,
    "expires_at": "2026-12-31T00:00:00Z"
  },
  "message": "Enjoy your exclusive member discount"
}
```

### Benefit types

| Type | Required fields | Description |
|---|---|---|
| `"credit"` | `amount_cents` (integer) | Credit to customer's wallet, e.g. `500` = ₪5 |
| `"discount"` | `discount_percent` (integer 1–100) | Percentage discount coupon |
| `"free_item"` | `free_item_description` (string) | A free item, e.g. "Free coffee" |

### Optional fields

| Field | Description |
|---|---|
| `title` | Benefit name shown in the customer's wallet |
| `expires_at` | ISO 8601 datetime. If omitted, benefit never expires |
| `message` | Custom confirmation message shown to the customer |

### Full example (credit)

```json
{
  "benefit": {
    "type": "credit",
    "title": "₪25 loyalty credit",
    "amount_cents": 2500,
    "expires_at": "2026-06-30T23:59:59Z"
  },
  "message": "Thanks for visiting! ₪25 credit added to your wallet."
}
```

---

## Error handling

| Scenario | Clubby behaviour |
|---|---|
| Your server returns non-200 | Falls back to active promotions |
| Request times out (>5s) | Falls back to active promotions |
| Response body is invalid JSON | Falls back to active promotions |
| `benefit` field is missing | Falls back to active promotions |
| No active promotions either | Customer sees enrollment confirmation, no benefit |

---

## Testing locally

You can use [ngrok](https://ngrok.com) or [localtunnel](https://github.com/localtunnel/localtunnel) to expose a local server to the internet during development.

```bash
npx ngrok http 3000
# Copy the HTTPS URL → paste into Clubby portal Settings
```

---

## Example server (Node.js / Express)

```js
const express = require('express')
const crypto = require('crypto')
const app = express()

app.use(express.json())

app.post('/clubby/webhook', (req, res) => {
  // 1. Verify signature
  const signature = req.headers['x-clubby-signature']
  const expected = crypto
    .createHmac('sha256', process.env.CLUBBY_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex')

  if (signature && signature !== expected) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { user_id, token } = req.body

  // 2. Look up customer in your system
  const isVIP = checkIfVIP(user_id)

  // 3. Return a benefit
  res.json({
    benefit: {
      type: 'discount',
      title: isVIP ? 'VIP 25% off' : '10% welcome discount',
      discount_percent: isVIP ? 25 : 10,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    message: isVIP
      ? 'Welcome back, valued member!'
      : 'Welcome! Here\'s a first-visit discount.',
  })
})

app.listen(3000)
```
