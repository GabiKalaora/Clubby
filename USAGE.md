# Clubby — How to Use

## For Business Owners (Portal)

**URL:** http://localhost:5174 (dev) · portal.clubby.com (production)

### Getting started
1. Go to the portal and sign up with your email
2. Create your business — name, category, description, address, phone, logo
3. Your QR code is generated automatically — display it at your counter

### Day-to-day use

**Promotions**
- Create a welcome offer (e.g. "15% off first visit") — new members receive it automatically when they scan your QR
- Edit, duplicate, or delete promotions from the ⋯ menu

**Stamp Cards**
- Create a stamp card (e.g. "Buy 9 coffees, get 1 free")
- When a customer visits, go to Stamp Cards → find their name → tap "Add stamp"
- When they reach the required stamps, a reward benefit is issued to their wallet automatically

**Verify Redemption**
- When a customer wants to use a benefit, they tap "Use" in their app — a 6-digit code appears
- Go to Verify Redemption in the portal, enter the code → confirmed ✅
- The benefit is marked as redeemed in the system

**Members**
- See all your members, when they joined, and their full benefit history
- Send targeted push notifications: All members / New (≤7 days) / Active / Lapsed
- Export your full member list as CSV

**Dashboard**
- Stats: total members, active promotions, benefits issued, redemption rate
- Charts: member growth and daily redemptions over the last 30 days

**Settings**
- Upload your logo, edit business info
- Set opening hours (shown to customers in the app)
- Configure a webhook for custom backend integration

---

## For Customers (Mobile App)

### Getting started
1. Download the app and sign in with your phone number
2. Enter the OTP code sent by SMS (local dev: use `000000`)
3. Set your name (optional but recommended)

### Earning benefits
- **Scan a QR code** at any participating business → you're in the club, welcome benefit issued
- **Browse Discover** → search by name or filter by category → tap `+` to join
- Use the **"Open Now"** filter to see which businesses are currently open

### Your wallet
- All active benefits appear on the home screen (filter by All / Balance / Discounts / Free Items)
- Tap the balance card to see your **full history** — every benefit you've ever received
- Stamp cards appear above your benefits — watch your progress toward the next reward

### Redeeming a benefit
1. Tap **"Use"** on any benefit card
2. A 6-digit code appears — show it to the cashier
3. The cashier enters it in the portal — it's verified instantly
4. Your benefit is marked as used

### Other features
- **Invite friends**: on any store profile → "Invite friends" → share the link → you get a 10% discount when they join
- **Birthday reward**: set your date of birth in Profile → you'll receive a surprise gift from every club you're in on your birthday
- **Notifications**: control which types of push notifications you receive in Profile → Notification Preferences
- **Stories**: tap the business circles at the top of your wallet to see business stories and promos

---

## Demo Script (5 minutes)

1. **Portal** — show Dashboard (stats + charts)
2. **Portal** — go to QR Code page, display the QR
3. **Mobile** — scan the QR → confirmation card with welcome benefit
4. **Portal** — Stamp Cards → add 5 stamps for the new member → reward issued
5. **Mobile** — wallet shows stamp card complete + reward benefit
6. **Mobile** — tap "Use" on the reward → 6-digit code
7. **Portal** — Verify Redemption → enter code → confirmed ✅
8. **Portal** — Members → member detail → full history visible
9. **Portal** — Notify all → "Active" cohort → send message
10. **Mobile** — push notification received → tap → opens wallet
