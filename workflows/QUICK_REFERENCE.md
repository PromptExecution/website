# E2E Test Quick Reference Card

## One-Minute Setup

```bash
cd /home/brianh/promptexecution/website-promptexecution

# Terminal 1: Start server
just dev

# Terminal 2: Run test
bash scripts/run-e2e-test.sh
```

## Expected Output

```
Duration:              47382ms
Audit Entries:         3/3
Script Generation:     ✓ SUCCESS
Image Generation:      ✓ SUCCESS
Timestamps Valid:      ✓ YES
```

## Test Files Location

| What | Where |
|------|-------|
| Test Scripts | `/scripts/e2e-test.ts`, `/scripts/run-e2e-test.sh` |
| Documentation | `/workflows/` directory |
| Test Results | `.test-output/` directory |
| Report Template | `/workflows/E2E_TEST_REPORT.md` |

## Key Test Files

```
.test-output/
├─ script-gen-response.json      (Full API response)
├─ image-gen-response.json       (Full API response)
├─ script-gen-audit.json         (Audit entry)
├─ image-render-audit.json       (Audit entry)
├─ image-forecast-audit.json     (Audit entry)
└─ summary.txt                   (Test results)
```

## API Endpoints Tested

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/test-generate` | POST | Generate comic scripts |
| `/api/image-generate?day=YYYY-MM-DD` | POST | Generate images |

## Workflows Verified

| Workflow | Entry Point | Audit Field |
|----------|-------------|------------|
| `script_generation` | test-generate | `workflow_runs.audit_log` |
| `image_rendering` | image-generate | `comics.audit_log_render` |
| `forecasting_and_log` | image-generate | `comics.audit_log_forecast` |

## Test Phases

```
1. Script Generation (15-30s)
   └─ Validates response, audit entry, timestamps

2. Image Generation (10-20s)
   └─ Validates response, both audits, R2 storage

3. Audit Validation (<2s)
   └─ Checks timestamps, entry IDs, completeness

4. Summary (instant)
   └─ Generates report and test output files
```

## Database Queries

```sql
-- View scripts generated
SELECT day, COUNT(*) FROM workflow_runs WHERE day = '2026-05-10' GROUP BY day;

-- View images generated
SELECT day, r2_key_a, r2_key_b FROM comics WHERE day = '2026-05-10';

-- Check audit trail in scripts
SELECT day, audit_log FROM workflow_runs WHERE day = '2026-05-10' LIMIT 1;

-- Check audit trail in images
SELECT day, LENGTH(audit_log_render) as size FROM comics WHERE day = '2026-05-10';
```

## Troubleshooting Quick Fixes

| Problem | Fix |
|---------|-----|
| Cannot connect to API | Make sure `just dev` is running in Terminal 1 |
| 401 Unauthorized | Check TEST_SECRET environment variable |
| No comic script found | Run script generation first (Phase 1) |
| Images failed | Check if AI model is available, try different model |
| Ledgrrr unavailable | Test still passes; audit entries optional |
| Invalid JSON response | Check server logs in Terminal 1 |

## Environment Variables

```bash
# Optional - defaults shown
export API_URL="http://127.0.0.1:8788"
export TEST_SECRET="local-secret"
```

## Manual API Testing

```bash
# Script generation
curl -X POST \
  -H "Authorization: Bearer local-secret" \
  -H "Content-Type: application/json" \
  -d '{"day":"2026-05-10"}' \
  http://127.0.0.1:8788/api/test-generate | jq .

# Image generation
curl -X POST \
  -H "Authorization: Bearer local-secret" \
  http://127.0.0.1:8788/api/image-generate?day=2026-05-10 | jq .
```

## Test Success Criteria

✅ All three workflows invoked
✅ All timestamps are ISO-8601 format
✅ At least one image variant generated
✅ All responses are valid JSON
✅ No HTTP errors (5xx status codes)
✅ Database records created

## Test Failure Criteria

❌ API connection refused
❌ HTTP 5xx errors
❌ Invalid JSON responses
❌ Both image variants failed
❌ Malformed timestamps (if ledgrrr available)
❌ Missing database records

## Performance Benchmarks

| Phase | Expected | Actual |
|-------|----------|--------|
| Script Gen | 15-30s | [Run test to see] |
| Image Gen | 10-20s | [Run test to see] |
| Total | 25-50s | [Run test to see] |

## Documentation Quick Links

- **How to Run:** [E2E_TEST_INSTRUCTIONS.md](./E2E_TEST_INSTRUCTIONS.md)
- **Report Results:** [E2E_TEST_REPORT.md](./E2E_TEST_REPORT.md)
- **Full Details:** [README.md](./README.md)
- **Implementation:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## Architecture at a Glance

```
Script Generation (test-generate API)
    ↓
Ledgrrr: script_generation audit
    ↓
Image Generation (image-generate API)
    ↓
Ledgrrr: image_rendering audit
    ↓
Ledgrrr: forecasting_and_log audit
    ↓
Database: 3 audit entries stored
    ↓
R2 Storage: images and artifacts
```

## Next Steps After Test

1. **Passed?** → Check results in `.test-output/summary.txt`
2. **Failed?** → Review logs: `tail -f /dev/pts/1` in Terminal 1
3. **Done?** → Fill in [E2E_TEST_REPORT.md](./E2E_TEST_REPORT.md)
4. **Ready?** → Deploy to production with confidence!

## Common Commands

```bash
# Run E2E test
bash scripts/run-e2e-test.sh

# Check results
cat .test-output/summary.txt

# View audit entries
jq . .test-output/*-audit.json

# Query database
bun run db:query "SELECT * FROM comics WHERE day = '2026-05-10';"

# View API responses
jq . .test-output/*-response.json

# Clean up test outputs
rm -rf .test-output/

# Enable debug logging
LEDGRRR_DEBUG=1 bash scripts/run-e2e-test.sh
```

## Test Lifecycle

```
START
  ├─ Check API connectivity
  ├─ Generate scripts + capture audit
  ├─ Generate images + capture 2 audits
  ├─ Validate all 3 timestamps
  ├─ Save results to .test-output/
  ├─ Display summary
  └─ SUCCESS or FAILURE
END
```

## File Tree

```
website-promptexecution/
├─ scripts/
│  ├─ e2e-test.ts              (Deno test runner)
│  └─ run-e2e-test.sh          (Bash orchestrator)
├─ workflows/
│  ├─ README.md                (Full docs)
│  ├─ E2E_TEST_INSTRUCTIONS.md (How to run)
│  ├─ E2E_TEST_REPORT.md       (Results template)
│  ├─ IMPLEMENTATION_SUMMARY.md (What was built)
│  └─ QUICK_REFERENCE.md       (This file)
└─ .test-output/               (Test results)
```

## Support Checklist

Before asking for help:
- [ ] Read [E2E_TEST_INSTRUCTIONS.md](./E2E_TEST_INSTRUCTIONS.md)
- [ ] Run test with `LEDGRRR_DEBUG=1`
- [ ] Check server logs in Terminal 1
- [ ] Review `.test-output/summary.txt`
- [ ] Verify API is responsive: `curl http://127.0.0.1:8788/api/today`
- [ ] Check TEST_SECRET is correct

---

**Version:** 1.0.0
**Updated:** 2026-05-10
**Status:** Ready to Use
