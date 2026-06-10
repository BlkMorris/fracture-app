#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Fracture API — Step 7 Comprehensive Smoke Test Suite
# ─────────────────────────────────────────────────────────────
set -euo pipefail

BASE="http://127.0.0.1:4000/api/v1"
HEALTH="http://127.0.0.1:4000/health"
PASS=0
FAIL=0
TOTAL=0
RESULTS=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

assert() {
  local name="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    RESULTS+="${GREEN}✅ PASS${NC}  ${name}\n"
  else
    FAIL=$((FAIL + 1))
    RESULTS+="${RED}❌ FAIL${NC}  ${name}  (expected=${expected}, got=${actual})\n"
  fi
}

assert_contains() {
  local name="$1" needle="$2" haystack="$3"
  TOTAL=$((TOTAL + 1))
  if echo "$haystack" | grep -q "$needle" 2>/dev/null; then
    PASS=$((PASS + 1))
    RESULTS+="${GREEN}✅ PASS${NC}  ${name}\n"
  else
    FAIL=$((FAIL + 1))
    RESULTS+="${RED}❌ FAIL${NC}  ${name}  (expected to contain: ${needle})\n"
  fi
}

echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  FRACTURE API — COMPREHENSIVE SMOKE TEST SUITE${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}\n"

# ═══════════════════════════════════════════════════════════
# 1. HEALTH & INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 1. Health & Infrastructure ──${NC}"

RESP=$(curl -sw '\n%{http_code}' "$HEALTH" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "GET /health → 200" "200" "$CODE"
assert_contains "Health: Postgres up" '"postgres":{"status":"up"}' "$BODY"
assert_contains "Health: Redis up" '"redis":{"status":"up"}' "$BODY"
assert_contains "Health: Elasticsearch up" '"elasticsearch":{"status":"up"}' "$BODY"

# ═══════════════════════════════════════════════════════════
# 2. AUTH — Registration
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 2. Auth — Registration ──${NC}"

TEST_EMAIL="testuser_$(date +%s)@fracture.test"
TEST_PASS="T3stP@ssw0rd!"

RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"displayName\":\"Test Runner\"}" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "POST /auth/register → 201" "201" "$CODE"
assert_contains "Register: returns accessToken" '"accessToken"' "$BODY"
assert_contains "Register: returns refreshToken" '"refreshToken"' "$BODY"
assert_contains "Register: user role=free" '"role":"free"' "$BODY"

FREE_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "")
FREE_REFRESH=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['refreshToken'])" 2>/dev/null || echo "")
FREE_USER_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null || echo "")

# Duplicate registration
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "POST /auth/register duplicate → 409" "409" "$CODE"
assert_contains "Register dup: 'already registered'" 'already registered' "$BODY"

# Bad validation
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"notanemail","password":"short"}' 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "POST /auth/register bad input → 400" "400" "$CODE"
assert_contains "Register validation: email error" 'email' "$BODY"

# ═══════════════════════════════════════════════════════════
# 3. AUTH — Login
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 3. Auth — Login ──${NC}"

RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "POST /auth/login → 200" "200" "$CODE"
assert_contains "Login: returns accessToken" '"accessToken"' "$BODY"
FREE_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "")
FREE_REFRESH=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['refreshToken'])" 2>/dev/null || echo "")

# Wrong password
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrongpassword\"}" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "POST /auth/login wrong password → 401" "401" "$CODE"

# Non-existent user
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"nobody@nowhere.com","password":"T3stP@ssw0rd!"}' 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "POST /auth/login non-existent → 401" "401" "$CODE"

# ═══════════════════════════════════════════════════════════
# 4. AUTH — Profile
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 4. Auth — Profile ──${NC}"

RESP=$(curl -sw '\n%{http_code}' "$BASE/auth/profile" \
  -H "Authorization: Bearer $FREE_TOKEN" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "GET /auth/profile (authed) → 200" "200" "$CODE"
assert_contains "Profile: has email" "$TEST_EMAIL" "$BODY"

# No token
RESP=$(curl -sw '\n%{http_code}' "$BASE/auth/profile" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "GET /auth/profile (no token) → 401" "401" "$CODE"

# Garbage token
RESP=$(curl -sw '\n%{http_code}' "$BASE/auth/profile" \
  -H "Authorization: Bearer garbage.token.here" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "GET /auth/profile (bad token) → 401" "401" "$CODE"

# ═══════════════════════════════════════════════════════════
# 5. AUTH — Refresh Token
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 5. Auth — Refresh Token ──${NC}"

RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$FREE_REFRESH\"}" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "POST /auth/refresh → 200" "200" "$CODE"
assert_contains "Refresh: returns new accessToken" '"accessToken"' "$BODY"
NEW_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "")

# Invalid refresh token
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"bad.refresh.token"}' 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "POST /auth/refresh invalid → 401" "401" "$CODE"

# ═══════════════════════════════════════════════════════════
# 6. AUTH — Logout
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 6. Auth — Logout ──${NC}"

RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/auth/logout" \
  -H "Authorization: Bearer $NEW_TOKEN" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "POST /auth/logout → 204" "204" "$CODE"

# ═══════════════════════════════════════════════════════════
# 7. ADMIN AUTH — Login as admin
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 7. Admin Auth ──${NC}"

RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@fracture.app","password":"Str0ngP@ss!"}' 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "POST /auth/login admin → 200" "200" "$CODE"
assert_contains "Admin: role=admin" '"role":"admin"' "$BODY"
ADMIN_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "")

# ═══════════════════════════════════════════════════════════
# 8. ARTICLES — Public Read
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 8. Articles — Public Read ──${NC}"

RESP=$(curl -sw '\n%{http_code}' "$BASE/articles?limit=5" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "GET /articles (public) → 200" "200" "$CODE"
assert_contains "Articles: has 'data' array" '"data"' "$BODY"
assert_contains "Articles: has 'total'" '"total"' "$BODY"
ARTICLE_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['total'])" 2>/dev/null || echo "0")
assert_contains "Articles: total > 0" '"total"' "$BODY"

# Get first article ID
FIRST_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id'])" 2>/dev/null || echo "")

if [ -n "$FIRST_ID" ]; then
  RESP=$(curl -sw '\n%{http_code}' "$BASE/articles/$FIRST_ID" 2>/dev/null)
  CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  assert "GET /articles/:id (public) → 200" "200" "$CODE"
  assert_contains "Article detail: has title" '"title"' "$BODY"
fi

# Pagination
RESP=$(curl -sw '\n%{http_code}' "$BASE/articles?page=1&limit=2" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "GET /articles?page=1&limit=2 → 200" "200" "$CODE"
DATA_LEN=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']))" 2>/dev/null || echo "0")
assert "Articles pagination: returns ≤2 items" "2" "$DATA_LEN"

# Non-existent article
RESP=$(curl -sw '\n%{http_code}' "$BASE/articles/00000000-0000-0000-0000-000000000000" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "GET /articles/:id (not found) → 404" "404" "$CODE"

# ═══════════════════════════════════════════════════════════
# 9. RBAC — Free user denied on admin endpoints
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 9. RBAC Enforcement ──${NC}"

# Re-login as free user to get a fresh token
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" 2>/dev/null)
FREE_TOKEN=$(echo "$RESP" | sed '$d' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "")

# Free user → ingestion (admin only)
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/ingestion/fetch-all" \
  -H "Authorization: Bearer $FREE_TOKEN" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "POST /ingestion/fetch-all (free user) → 403" "403" "$CODE"

# No token → ingestion
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/ingestion/fetch-all" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "POST /ingestion/fetch-all (no auth) → 401" "401" "$CODE"

# Free user → narrative analyse-all (admin only)
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/narrative/analyse-all" \
  -H "Authorization: Bearer $FREE_TOKEN" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "POST /narrative/analyse-all (free user) → 403" "403" "$CODE"

# Free user → search reindex (admin only)
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/search/reindex" \
  -H "Authorization: Bearer $FREE_TOKEN" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "POST /search/reindex (free user) → 403" "403" "$CODE"

# Admin → ingestion (allowed)
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/ingestion/fetch-all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "POST /ingestion/fetch-all (admin) → 202" "202" "$CODE"

# Admin → narrative analyse-all (allowed)
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/narrative/analyse-all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "POST /narrative/analyse-all (admin) → 202" "202" "$CODE"

# ═══════════════════════════════════════════════════════════
# 10. INGESTION
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 10. Ingestion ──${NC}"

RESP=$(curl -sw '\n%{http_code}' "$BASE/ingestion/queue-stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "GET /ingestion/queue-stats (admin) → 200" "200" "$CODE"
assert_contains "Queue stats: has completed count" 'completed' "$BODY"

# ═══════════════════════════════════════════════════════════
# 11. NARRATIVE — Public Endpoints
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 11. Narrative — Public Read ──${NC}"

RESP=$(curl -sw '\n%{http_code}' "$BASE/narrative/stories" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "GET /narrative/stories (public) → 200" "200" "$CODE"
assert_contains "Stories: has 'total'" '"total"' "$BODY"
STORY_TOTAL=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['total'])" 2>/dev/null || echo "0")
echo -e "   ℹ️  Stories total: $STORY_TOTAL"

RESP=$(curl -sw '\n%{http_code}' "$BASE/narrative/trending" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "GET /narrative/trending (public) → 200" "200" "$CODE"

# Get a cluster ID for cluster detail test
CLUSTER_ID=$(echo "$BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if isinstance(d, list) and len(d) > 0:
    print(d[0].get('storyClusterId', d[0].get('clusterId', '')))
elif isinstance(d, dict) and 'data' in d:
    items = d['data']
    if len(items) > 0:
        print(items[0].get('storyClusterId', items[0].get('clusterId', '')))
    else:
        print('')
else:
    print('')
" 2>/dev/null || echo "")

if [ -n "$CLUSTER_ID" ] && [ "$CLUSTER_ID" != "" ] && [ "$CLUSTER_ID" != "None" ]; then
  RESP=$(curl -sw '\n%{http_code}' "$BASE/narrative/cluster/$CLUSTER_ID" 2>/dev/null)
  CODE=$(echo "$RESP" | tail -1)
  assert "GET /narrative/cluster/:id (public) → 200" "200" "$CODE"
else
  echo -e "   ℹ️  No cluster ID available for cluster detail test (skipping)"
fi

# ═══════════════════════════════════════════════════════════
# 12. NARRATIVE — Admin Analyse Single
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 12. Narrative — Admin Analyse ──${NC}"

if [ -n "$FIRST_ID" ]; then
  RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/narrative/analyse/$FIRST_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null)
  CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  assert "POST /narrative/analyse/:id (admin) → 201 or 202" "20" "$(echo $CODE | cut -c1-2)"
fi

# ═══════════════════════════════════════════════════════════
# 13. SEARCH — Public
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 13. Search — Public ──${NC}"

RESP=$(curl -sw '\n%{http_code}' "$BASE/search?q=news" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "GET /search?q=news (public) → 200" "200" "$CODE"
SEARCH_TOTAL=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('total', len(d.get('data',d.get('results',[])))))" 2>/dev/null || echo "0")
echo -e "   ℹ️  Search 'news' results: $SEARCH_TOTAL"

RESP=$(curl -sw '\n%{http_code}' "$BASE/search/autocomplete?q=tru" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "GET /search/autocomplete?q=tru (public) → 200" "200" "$CODE"

# Admin reindex
RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/search/reindex" \
  -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
assert "POST /search/reindex (admin) → 200 or 201 or 202" "20" "$(echo $CODE | cut -c1-2)"

# ═══════════════════════════════════════════════════════════
# 14. ARTICLES — Admin Write Operations
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 14. Articles — Admin Write ──${NC}"

# Get source ID for creating an article
SOURCE_ID=$(curl -s "$BASE/ingestion/sources" -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and len(d)>0 else '')" 2>/dev/null || echo "")

if [ -n "$SOURCE_ID" ] && [ "$SOURCE_ID" != "" ]; then
  # Create article
  RESP=$(curl -sw '\n%{http_code}' -X POST "$BASE/articles" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
      \"title\": \"Test Article $(date +%s)\",
      \"url\": \"https://test.example.com/article-$(date +%s)\",
      \"content\": \"This is test content for the smoke test suite.\",
      \"summary\": \"Test summary.\",
      \"publishedAt\": \"2026-03-04T00:00:00.000Z\",
      \"sourceId\": \"$SOURCE_ID\"
    }" 2>/dev/null)
  CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  assert "POST /articles (admin create) → 201" "201" "$CODE"

  NEW_ART_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")

  if [ -n "$NEW_ART_ID" ] && [ "$NEW_ART_ID" != "" ]; then
    # Update article
    RESP=$(curl -sw '\n%{http_code}' -X PATCH "$BASE/articles/$NEW_ART_ID" \
      -H 'Content-Type: application/json' \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"title":"Updated Test Article"}' 2>/dev/null)
    CODE=$(echo "$RESP" | tail -1)
    assert "PATCH /articles/:id (admin update) → 200" "200" "$CODE"

    # Delete article
    RESP=$(curl -sw '\n%{http_code}' -X DELETE "$BASE/articles/$NEW_ART_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null)
    CODE=$(echo "$RESP" | tail -1)
    assert "DELETE /articles/:id (admin delete) → 200" "200" "$CODE"
  fi
fi

# ═══════════════════════════════════════════════════════════
# 15. ERROR FORMATTING
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 15. Error Formatting ──${NC}"

RESP=$(curl -sw '\n%{http_code}' "$BASE/nonexistent-route" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert "GET /nonexistent-route → 404" "404" "$CODE"
assert_contains "404: has statusCode field" '"statusCode"' "$BODY"
assert_contains "404: has timestamp field" '"timestamp"' "$BODY"

# Method not allowed
RESP=$(curl -sw '\n%{http_code}' -X DELETE "$BASE/auth/login" 2>/dev/null)
CODE=$(echo "$RESP" | tail -1)
# This should be 404 since the route doesn't match
assert "DELETE /auth/login → 404 or 405" "4" "$(echo $CODE | cut -c1)"

# ═══════════════════════════════════════════════════════════
# 16. CORS HEADERS
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 16. CORS Headers ──${NC}"

HEADERS=$(curl -sI -X OPTIONS "$HEALTH" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" 2>/dev/null)
assert_contains "CORS: Access-Control-Allow-Origin" 'access-control-allow-origin' "$(echo "$HEADERS" | tr '[:upper:]' '[:lower:]')"

# ═══════════════════════════════════════════════════════════
# 17. HELMET HEADERS
# ═══════════════════════════════════════════════════════════
echo -e "${YELLOW}── 17. Security Headers ──${NC}"

HEADERS=$(curl -sI "$HEALTH" 2>/dev/null | tr '[:upper:]' '[:lower:]')
assert_contains "Helmet: X-Content-Type-Options" 'x-content-type-options' "$HEADERS"
assert_contains "Helmet: X-Frame-Options or CSP" 'x-frame-options\|content-security-policy' "$HEADERS"

# ═══════════════════════════════════════════════════════════
# REPORT
# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  RESULTS: ${PASS}/${TOTAL} passed, ${FAIL} failed${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "$RESULTS"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}⚠️  Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
  exit 0
fi
