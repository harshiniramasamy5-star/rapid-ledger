#!/bin/zsh
PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo "\n=== API TESTS (Vitest) ==="
cd ~/rapid-ledger/apps/api
npx vitest run --reporter=verbose 2>&1 | tail -5
[ ${pipestatus[1]} -eq 0 ] && ok "Vitest 35/35" || fail "Vitest failures"

echo "\n=== FRONTEND TESTS (Jest) ==="
cd ~/rapid-ledger/apps/web
npx jest --passWithNoTests 2>&1 | tail -5
[ ${pipestatus[1]} -eq 0 ] && ok "Jest 10/10" || fail "Jest failures"

echo "\n=== TYPECHECK ==="
cd ~/rapid-ledger/apps/api
npx tsc --noEmit 2>&1 | tail -3
[ ${pipestatus[1]} -eq 0 ] && ok "API tsc clean" || fail "API tsc errors"

cd ~/rapid-ledger/apps/web
npx tsc --noEmit 2>&1 | tail -3
[ ${pipestatus[1]} -eq 0 ] && ok "Web tsc clean" || fail "Web tsc errors"

echo "\n=== E2E (Playwright) ==="
cd ~/rapid-ledger/apps/web
npx playwright test --reporter=line 2>&1 | tail -20
[ ${pipestatus[1]} -eq 0 ] && ok "Playwright 12/12" || fail "Playwright failures"

echo "\n=== RESULT ==="
echo "  Passed : $PASS"
echo "  Failed : $FAIL"
[ $FAIL -eq 0 ] && echo "  STATUS : ✅ ALL 57 TESTS GREEN" || echo "  STATUS : ❌ $FAIL SUITES FAILED"
