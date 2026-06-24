# Source: https://github.com/harshiniramasamy5-star/rapid-ledger/blob/main/test_all.sh

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[rapid-ledger](https://github.com/harshiniramasamy5-star/rapid-ledger)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Frapid-ledger) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Frapid-ledger)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Frapid-ledger)
 

 

## FilesExpand file tree

 main

/

# test\_all.sh

Copy path

Blame

More file actions

Blame

More file actions

## Latest commit

## History

[History](https://github.com/harshiniramasamy5-star/rapid-ledger/commits/main/test_all.sh)

History

executable file

·

33 lines (27 loc) · 1.13 KB

## FilesExpand file tree

 main

/

# test\_all.sh

Copy path

Top

## File metadata and controls

- Code
 
- Blame
 

executable file

·

33 lines (27 loc) · 1.13 KB

[Raw](https://github.com/harshiniramasamy5-star/rapid-ledger/raw/refs/heads/main/test_all.sh)

Copy raw file

Download raw file

Open symbols panel

Edit and raw actions

#!/bin/zsh PASS=0; FAIL=0 ok() { echo " ✅ $1"; PASS=$((PASS+1)); } fail() { echo " ❌ $1"; FAIL=$((FAIL+1)); } echo "\\n=== API TESTS (Vitest) ===" cd ~/rapid-ledger/apps/api npx vitest run --reporter=verbose 2>&1 | tail -5 \[ ${pipestatus\[1\]} -eq 0 \] && ok "Vitest 35/35" || fail "Vitest failures" echo "\\n=== FRONTEND TESTS (Jest) ===" cd ~/rapid-ledger/apps/web npx jest --passWithNoTests 2>&1 | tail -5 \[ ${pipestatus\[1\]} -eq 0 \] && ok "Jest 10/10" || fail "Jest failures" echo "\\n=== TYPECHECK ===" cd ~/rapid-ledger/apps/api npx tsc --noEmit 2>&1 | tail -3 \[ ${pipestatus\[1\]} -eq 0 \] && ok "API tsc clean" || fail "API tsc errors" cd ~/rapid-ledger/apps/web npx tsc --noEmit 2>&1 | tail -3 \[ ${pipestatus\[1\]} -eq 0 \] && ok "Web tsc clean" || fail "Web tsc errors" echo "\\n=== E2E (Playwright) ===" cd ~/rapid-ledger/apps/web npx playwright test --reporter=line 2>&1 | tail -20 \[ ${pipestatus\[1\]} -eq 0 \] && ok "Playwright 12/12" || fail "Playwright failures" echo "\\n=== RESULT ===" echo " Passed : $PASS" echo " Failed : $FAIL" \[ $FAIL -eq 0 \] && echo " STATUS : ✅ ALL 57 TESTS GREEN" || echo " STATUS : ❌ $FAIL SUITES FAILED"

1

2

3

4

5

6

7

8

9

10

11

12

13

14

15

16

17

18

19

20

21

22

23

24

25

26

27

28

29

30

31

32

33

#!/bin/zsh

PASS=0; FAIL=0

ok() { echo " ✅ $1"; PASS=$((PASS+1)); }

fail() { echo " ❌ $1"; FAIL=$((FAIL+1)); }

echo "\\n=== API TESTS (Vitest) ==="

cd ~/rapid-ledger/apps/api

npx vitest run --reporter=verbose 2>&1 | tail -5

\[ ${pipestatus\[1\]} \-eq 0 \] && ok "Vitest 35/35" || fail "Vitest failures"

echo "\\n=== FRONTEND TESTS (Jest) ==="

cd ~/rapid-ledger/apps/web

npx jest --passWithNoTests 2>&1 | tail -5

\[ ${pipestatus\[1\]} \-eq 0 \] && ok "Jest 10/10" || fail "Jest failures"

echo "\\n=== TYPECHECK ==="

cd ~/rapid-ledger/apps/api

npx tsc --noEmit 2>&1 | tail -3

\[ ${pipestatus\[1\]} \-eq 0 \] && ok "API tsc clean" || fail "API tsc errors"

cd ~/rapid-ledger/apps/web

npx tsc --noEmit 2>&1 | tail -3

\[ ${pipestatus\[1\]} \-eq 0 \] && ok "Web tsc clean" || fail "Web tsc errors"

echo "\\n=== E2E (Playwright) ==="

cd ~/rapid-ledger/apps/web

npx playwright test --reporter=line 2>&1 | tail -20

\[ ${pipestatus\[1\]} \-eq 0 \] && ok "Playwright 12/12" || fail "Playwright failures"

echo "\\n=== RESULT ==="

echo " Passed : $PASS"

echo " Failed : $FAIL"

\[ $FAIL \-eq 0 \] && echo " STATUS : ✅ ALL 57 TESTS GREEN" || echo " STATUS : ❌ $FAIL SUITES FAILED"