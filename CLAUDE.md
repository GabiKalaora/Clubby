# Clubby — Project Rules

## MANDATORY: Test Before Every Slice

**Before starting any new slice, run the full test suite. Do NOT proceed until all tests pass.**

### Full test checklist (run every time):
```bash
# 1. Supabase healthy + all tables present
supabase status
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "\dt public.*"

# 2. RLS policies — all 6 must pass
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/rls.test.sql

# 3. TypeScript — zero errors in all packages
cd packages/shared && npx tsc --noEmit
cd apps/portal    && npx tsc --noEmit
cd apps/mobile    && npx tsc --noEmit

# 4. Mobile auth flow (web)
# Start expo: npx expo start --web --clear
# Navigate to http://localhost:8081
# sign-in → OTP 000000 → register → wallet

# 5. Portal flow
# Navigate to http://localhost:5174
# login → business form → QR display
```

If any check fails → fix it before starting the new slice. No exceptions.

## Local Dev Credentials
- Supabase Studio: http://127.0.0.1:54323
- Mobile (web): http://localhost:8081
- Portal: http://localhost:5174
- Test phone: +972501234567 / OTP: 000000
- Portal auth: email + password (auto sign-up)

## Development Philosophy
- Vertical slices — each fully tested end-to-end before starting the next
- RLS gate — no UI screen built until its RLS policies pass
- README.md — update in English AND Hebrew after every slice
- Commit after every verified slice
