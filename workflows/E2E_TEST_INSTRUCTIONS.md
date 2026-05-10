# E2E Test Execution Instructions

## Overview

This document provides step-by-step instructions for executing the end-to-end test of the comic generation pipeline with ledgrrr governance integration.

The test validates:
1. Script generation with `script_generation` ledgrrr workflow
2. Image rendering with `image_rendering` ledgrrr workflow
3. Forecasting with `forecasting_and_log` ledgrrr workflow
4. Complete audit trail in database

---

## Prerequisites

### System Requirements
- Deno runtime (for test script)
- curl (for API testing)
- jq (for JSON parsing)
- bun (for package management)
- wrangler (for Cloudflare development)

### Environment Setup
```bash
cd /home/brianh/promptexecution/website-promptexecution

# Install dependencies
bun install

# Build the project
bun run build

# Initialize local database
bun run db:init:local
```

### Ledgrrr MCP Server
The test requires the ledgrrr MCP server to be accessible at:
```
/home/brianh/.b00t/vendor/l3dg3rr/target/release/ledgerr-mcp-server
```

If this binary doesn't exist, the test will still run but ledgrrr workflows will not execute (graceful degradation).

---

## Step 1: Start the Development Server

### Terminal 1: Start Wrangler Pages
```bash
cd /home/brianh/promptexecution/website-promptexecution

# Build and start local development server
just dev

# The server should start on http://127.0.0.1:8788
```

**Expected Output:**
```
Building Vite app...
vite v7.1.1 building for production...
✓ 1234 modules transformed

Built in 1.23s

[local] Listening on http://127.0.0.1:8788
```

### Verify Server is Ready
```bash
# In another terminal
curl -s http://127.0.0.1:8788/api/today | jq .
```

You should get a valid JSON response.

---

## Step 2: Set Environment Variables (Optional)

Default values are configured in the test script, but you can override:

```bash
export API_URL="http://127.0.0.1:8788"
export TEST_SECRET="local-secret"
```

---

## Step 3: Run the E2E Test

### Method A: Using the Bash Script (Recommended)

```bash
cd /home/brianh/promptexecution/website-promptexecution

# Run the complete test
bash scripts/run-e2e-test.sh
```

This script will:
1. Check API connectivity
2. Run script generation (POST /api/test-generate)
3. Run image generation (POST /api/image-generate)
4. Validate timestamps in audit entries
5. Generate summary and save all responses
6. Display results

**Duration:** ~30-60 seconds (depending on model inference time)

### Method B: Using Deno Test Script

```bash
cd /home/brianh/promptexecution/website-promptexecution

# Run with default settings
deno run --allow-net --allow-read --allow-env scripts/e2e-test.ts

# Or with custom settings
API_URL="http://127.0.0.1:8788" \
TEST_SECRET="local-secret" \
deno run --allow-net --allow-read --allow-env scripts/e2e-test.ts
```

### Method C: Manual curl Testing

If you want to run steps individually:

#### Step 3a: Script Generation
```bash
curl -X POST \
  -H "Authorization: Bearer local-secret" \
  -H "Content-Type: application/json" \
  -d '{"day":"2026-05-10"}' \
  http://127.0.0.1:8788/api/test-generate | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "day": "2026-05-10",
  "run_id": "2026-05-10-1715401234567-123456",
  "title": "...",
  "panel_count": 3,
  "character_count": 2,
  "cast": [...],
  "topic_candidates": [...],
  "selected_topic": "...",
  "models": {
    "a": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    "b": "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
  },
  "audit_trail": {
    "entry_id": "entry-1715401234567",
    "timestamp": "2026-05-10T15:20:34.567Z",
    "function_name": "script_generation",
    "status": "success",
    "context_input": {...},
    "execution_time_ms": 1234
  },
  "workflow_log": [...]
}
```

#### Step 3b: Wait for Image Generation
Image generation is triggered asynchronously after script generation. Wait 3-5 seconds.

#### Step 3c: Image Generation
```bash
curl -X POST \
  -H "Authorization: Bearer local-secret" \
  http://127.0.0.1:8788/api/image-generate?day=2026-05-10 | jq .
```

**Expected Response:**
```json
{
  "status": "success",
  "day": "2026-05-10",
  "variants": {
    "a": "generated",
    "b": "generated"
  },
  "r2Keys": {
    "imageA": "comics/2026-05-10/variant-a.jpg",
    "imageB": "comics/2026-05-10/variant-b.jpg"
  },
  "errors": [],
  "audit_trail": {
    "image_rendering": {
      "success": true,
      "entry_id": "entry-1715401234568",
      "timestamp": "2026-05-10T15:20:35.789Z",
      "status": "success"
    },
    "forecasting_and_log": {
      "success": true,
      "entry_id": "entry-1715401234569",
      "timestamp": "2026-05-10T15:20:36.012Z",
      "status": "success"
    }
  }
}
```

---

## Step 4: Verify Results

### Check Test Output Files
```bash
cd /home/brianh/promptexecution/website-promptexecution

# List generated test outputs
ls -lh .test-output/

# View summary
cat .test-output/summary.txt

# View audit entries
jq . .test-output/script-gen-audit.json
jq . .test-output/image-render-audit.json
jq . .test-output/image-forecast-audit.json
```

### Verify Database Records

```bash
# Query comics table
bun run db:query "SELECT day, model_provider_a, model_provider_b FROM comics WHERE day = '2026-05-10';"

# Query workflow_runs table
bun run db:query "SELECT run_id, day FROM workflow_runs WHERE day = '2026-05-10';"

# Check audit logs (if stored as JSON columns)
bun run db:query "SELECT day, LENGTH(audit_log_render) as render_size, LENGTH(audit_log_forecast) as forecast_size FROM comics WHERE day = '2026-05-10';"
```

---

## Step 5: Fill Test Report

Once the test completes, update the E2E test report:

```bash
# Edit the report template
vim workflows/E2E_TEST_REPORT.md

# Fill in sections:
# - Test Date/Time (from .test-output/summary.txt)
# - Response bodies (from .test-output/*.json)
# - Audit entry details
# - Database query results
# - Performance metrics
```

---

## Troubleshooting

### Issue: API Connection Refused

**Problem:** `curl: (7) Failed to connect to 127.0.0.1 port 8788`

**Solution:**
```bash
# Ensure dev server is running in Terminal 1
just dev

# Verify port is open
netstat -tlnp | grep 8788
```

### Issue: 401 Unauthorized

**Problem:** `{"error":"Unauthorized","hint":"Set Authorization header: Bearer <TEST_SECRET>"}`

**Solution:**
```bash
# Use correct secret
export TEST_SECRET="local-secret"

# Or check .env for actual secret value
cat .env | grep TEST_SECRET
```

### Issue: Ledgrrr Workflows Not Executing

**Problem:** No audit entries returned, "ledgrrr may be unavailable"

**Cause:** The ledgrrr MCP server is not running

**Solution:**
```bash
# Check if ledgerr-mcp-server binary exists
ls -la /home/brianh/.b00t/vendor/l3dg3rr/target/release/ledgerr-mcp-server

# If not, build it:
cd /home/brianh/.b00t/vendor/l3dg3rr
cargo build --release

# Note: The pipeline has graceful degradation. Tests will still pass,
# but audit trails won't be recorded.
```

### Issue: Image Generation Fails

**Problem:** `variants.a: "failed"` or `variants.b: "failed"`

**Cause:** AI model not available or inference failed

**Solution:**
```bash
# Check available models
curl http://127.0.0.1:8788/api/today | jq '.available_models // empty'

# Try with different MODEL environment variable
export IMAGE_PROVIDER_A="@cf/black-forest-labs/flux-2-klein-4b"
just dev
```

### Issue: Database Errors

**Problem:** `SQL error: table not found`

**Solution:**
```bash
# Reinitialize database
bun run db:init:local

# Verify schema was applied
bun run db:query "SELECT name FROM sqlite_master WHERE type='table';"
```

### Issue: Images Not Stored in R2

**Problem:** `r2Keys.imageA: null`

**Cause:** COMICS_BUCKET binding not configured

**Solution:**
```bash
# Check wrangler.toml for R2 bucket configuration
grep -A 5 "r2_buckets" wrangler.toml

# For local development, R2 should be mocked by wrangler
# If using real R2, verify credentials are configured
```

---

## Expected Performance

Typical test execution times:

| Phase | Duration |
|-------|----------|
| Script Generation (inference + storage) | 15-30 seconds |
| Image Generation (inference + storage) | 10-20 seconds |
| Database writes | <1 second |
| Ledgrrr audit logging | <500ms |
| **Total End-to-End** | **25-50 seconds** |

---

## Success Criteria

The test is **successful** if:

- [x] Script generation completes without HTTP errors
- [x] Image generation completes without HTTP errors
- [x] At least one image variant is generated successfully
- [x] All responses are valid JSON
- [x] Audit entries (if ledgrrr available) have valid timestamps
- [x] Database records exist for the test day
- [x] Workflow log has multiple steps

The test is **acceptable with warnings** if:

- [x] Tests pass but ledgrrr workflows are unavailable (graceful degradation)
- [x] One image variant fails but the other succeeds
- [x] Ledgrrr responds with non-fatal errors

The test **fails** if:

- [x] API connectivity cannot be established
- [x] Script generation fails with HTTP error
- [x] Database initialization fails
- [x] Both image variants fail to generate
- [x] Response JSON is invalid
- [x] Audit timestamps are malformed (if ledgrrr is available)

---

## Logging and Diagnostics

### Enable Debug Logging

```bash
# In the dev server terminal, set debug flag
LEDGRRR_DEBUG=1 just dev
```

### View Wrangler Logs

```bash
# Stream logs from deployed version
bun run logs

# Or check local development logs (shown in Terminal 1)
```

### Inspect Database Directly

```bash
# Enter SQLite CLI
wrangler d1 execute llm-comic-db --local --interactive

# List tables
.tables

# View comics table
SELECT * FROM comics WHERE day = '2026-05-10';

# View workflow_runs
SELECT run_id, day, created_at FROM workflow_runs WHERE day = '2026-05-10';
```

---

## Automating the Test

### Run Test on Schedule (cron)

```bash
# Add to crontab
*/6 * * * * cd /home/brianh/promptexecution/website-promptexecution && bash scripts/run-e2e-test.sh >> .test-output/cron.log 2>&1
```

This runs the test every 6 hours.

### Run Test in CI/CD Pipeline

```yaml
# Add to .github/workflows/test.yaml
- name: Run E2E Tests
  run: |
    cd website-promptexecution
    bash scripts/run-e2e-test.sh
```

---

## Next Steps After Test

1. **Review Results:**
   - Check `.test-output/summary.txt`
   - Verify all audit entries are present
   - Confirm timestamps are sequential

2. **Update Test Report:**
   - Fill in `workflows/E2E_TEST_REPORT.md`
   - Add actual response bodies
   - Document any issues

3. **Commit Test Results:**
   ```bash
   git add workflows/E2E_TEST_REPORT.md .test-output/
   git commit -m "test: E2E test execution for 2026-05-10"
   ```

4. **Monitor Production:**
   - Deploy to staging/production
   - Schedule periodic E2E tests
   - Track audit trail metrics

---

## Support

For issues or questions:
1. Check this document's Troubleshooting section
2. Review server logs: `just dev` terminal
3. Check ledgrrr MCP server status
4. Review error messages in `.test-output/`

---

*Last Updated: 2026-05-10*
*Next Review: After first successful E2E test execution*
