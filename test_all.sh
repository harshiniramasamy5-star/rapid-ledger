#!/usr/bin/env bash

PASS=0
FAIL=0
BASE="http://localhost:3001"   # adjust to your API base URL

ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }
hdr()  { echo; echo "━━━  $1  ━━━"; }

hdr "1 · API tests (live)"
TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
[ -n "$TOKEN" ] && ok "POST /auth/login → token received" || fail "Login failed"

ME=$(curl -s -o /dev/null -w "%{http_code}" $BASE/auth/me -H "Authorization: Bearer $TOKEN")
[ "$ME" = "200" ] && ok "GET /auth/me → 200" || fail "GET /auth/me → $ME"

AUDIT=$(curl -s "$BASE/audit" -H "Authorization: Bearer $TOKEN")
echo "$AUDIT" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null \
  && ok "GET /audit → array" || fail "GET /audit not valid JSON"

ACTION=$(echo "$AUDIT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['action'] if d else 'empty')" 2>/dev/null)
[ "$ACTION" != "empty" ] && ok "Audit entries have .action ($ACTION)" || fail "Audit entries missing .action"

FILTERED=$(curl -s "$BASE/audit?action=document_created" -H "Authorization: Bearer $TOKEN")
COUNT=$(echo "$FILTERED" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)
[ "${COUNT:-0}" -gt 0 ] && ok "GET /audit?action=document_created → $COUNT entries" || fail "Audit filter returned 0"

DOCS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/documents -H "Authorization: Bearer $TOKEN")
[ "$DOCS" = "200" ] && ok "GET /documents → 200" || fail "GET /documents → $DOCS"

LEDGER=$(curl -s -o /dev/null -w "%{http_code}" $BASE/ledger -H "Authorization: Bearer $TOKEN")
[ "$LEDGER" = "200" ] && ok "GET /ledger → 200" || fail "GET /ledger → $LEDGER"

NOAUTH=$(curl -s -o /dev/null -w "%{http_code}" $BASE/audit)
[ "$NOAUTH" = "401" ] && ok "GET /audit (no token) → 401" || fail "Auth guard missing → $NOAUTH"

hdr "2 · Backend type check"
cd ~/rapid-ledger/apps/api
npx tsc --noEmit --project tsconfig.json 2>&1 | tail -3
[ ${PIPESTATUS[0]} -eq 0 ] && ok "tsc --noEmit passed (api)" || fail "TypeScript errors in API"

hdr "3 · Frontend lint + type check"
cd ~/rapid-ledger/apps/web
npx tsc --noEmit 2>&1 | tail -3
[ ${PIPESTATUS[0]} -eq 0 ] && ok "tsc --noEmit passed (web)" || fail "TypeScript errors in web"

npx next lint 2>&1 | tail -3
[ ${PIPESTATUS[0]} -eq 0 ] && ok "ESLint passed" || fail "ESLint errors"

npx next build 2>&1 | tail -3
[ ${PIPESTATUS[0]} -eq 0 ] && ok "next build clean" || fail "Build failed"

hdr "4 · E2E — Playwright"
cd ~/rapid-ledger/apps/web
npx playwright test --reporter=line 2>&1 | tail -20
[ ${PIPESTATUS[0]} -eq 0 ] && ok "Playwright suite passed" || fail "Playwright failures"

hdr "RESULT"
echo "  Passed : $PASS"
echo "  Failed : $FAIL"
[ $FAIL -eq 0 ] && echo "  STATUS : ALL GREEN" || echo "  STATUS : $FAIL FAILED"
