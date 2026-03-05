# Testing Guide for LLM DOES NOT COMPUTE

## ⚠️ Current Status

**Has this been tested?** No - this is a fresh build that needs testing!

This guide will help you verify everything works before going live.

## Quick Test Checklist

- [ ] Frontend builds successfully
- [ ] Components render without errors
- [ ] API endpoints respond correctly
- [ ] Database schema is valid
- [ ] SVG renderer produces valid images
- [ ] Comic generator returns structured data
- [ ] Vote deduplication works
- [ ] Push subscription flow works
- [ ] Service worker registers

## 1. Local Build Test

```bash
# Test that the frontend builds
npm install
npm run build

# Should complete without errors and create dist/ directory
ls -la dist/
```

**Expected**: `dist/` directory with HTML, JS, CSS, and assets.

## 2. Component Testing (Manual)

```bash
# Start dev server
npm run dev

# Open http://localhost:5173
```

**Test each tab:**

### Comic Tab
- [ ] Tab switches correctly
- [ ] "Loading comic..." message appears
- [ ] Error message shows (expected - no backend yet)
- [ ] Vote buttons are visible
- [ ] Layout looks correct

### Archive Tab
- [ ] Tab switches
- [ ] Table renders
- [ ] Pagination controls visible

### Subscribe Tab
- [ ] Tab switches
- [ ] Subscribe button visible
- [ ] Instructions display

### CLI Tab
- [ ] Tab switches
- [ ] Terminal/CLI interface loads

## 3. Backend Function Testing

Since we can't easily test Workers AI locally, let's test the structure:

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check function files exist
ls -la functions/api/
ls -la functions/lib/
```

## 4. Database Schema Test

```bash
# Create a local test database
wrangler d1 create llm-comic-test

# Initialize schema
wrangler d1 execute llm-comic-test --file=./schema.sql

# Test some queries
wrangler d1 execute llm-comic-test --command="SELECT name FROM sqlite_master WHERE type='table'"

# Should see: comics, votes, push_subscriptions, vote_counts
```

## 5. SVG Renderer Test

Create a test file to verify SVG generation:

```bash
# Create test script
cat > test-svg-renderer.js << 'EOF'
import { renderComicToSVG } from './functions/lib/svg-renderer.ts';

const testScript = {
  title: "Test Comic",
  day: "2026-03-05",
  model: "test-model",
  panels: [
    { panelNumber: 1, speaker: "human", dialogue: "Hello Robot" },
    { panelNumber: 2, speaker: "robot", robotThought: "> processing\n> confidence: 0.5" },
    { panelNumber: 3, speaker: "robot", dialogue: "Hello Human" },
    { panelNumber: 4, speaker: "simon", dialogue: "Classic." }
  ]
};

const svg = renderComicToSVG(testScript);
console.log(svg.substring(0, 200));
console.log("SVG generated successfully! Length:", svg.length);
EOF

# Run test (if Node supports ES modules)
# node test-svg-renderer.js
```

## 6. Manual Deployment Test

### Step-by-step first deployment:

```bash
# 1. Login
wrangler login

# 2. Create D1 database
wrangler d1 create llm-comic-db

# Copy the database_id from output
# Update wrangler.toml with the ID

# 3. Initialize database
wrangler d1 execute llm-comic-db --file=./schema.sql

# 4. Create R2 bucket
wrangler r2 bucket create llm-comics

# 5. Generate VAPID keys
npm install -g web-push
web-push generate-vapid-keys

# Save keys somewhere safe!

# 6. Set secrets
wrangler secret put VAPID_PUBLIC_KEY
# Paste public key

wrangler secret put VAPID_PRIVATE_KEY
# Paste private key

# 7. Deploy
npm run build
wrangler pages deploy dist --project-name=promptexecution-comic
```

## 7. Post-Deployment Tests

Once deployed, test the live site:

### Test API Endpoints

```bash
# Replace YOUR_SITE with your actual URL
SITE="https://promptexecution-comic.pages.dev"

# Test /api/today (should return 404 if no comic yet)
curl "$SITE/api/today"
# Expected: {"error":"No comic for today yet","day":"2026-03-05"}

# Test /api/archive (should return empty)
curl "$SITE/api/archive"
# Expected: {"page":1,"limit":20,"total":0,"totalPages":0,"items":[]}

# Test /api/vote (should fail without data)
curl -X POST "$SITE/api/vote" \
  -H "Content-Type: application/json" \
  -d '{"day":"2026-03-05","variant":"a"}'
# Expected: Success or specific error
```

### Test Frontend Pages

```bash
# Open in browser
open "$SITE"

# Check:
# - [ ] Page loads
# - [ ] Tabs work
# - [ ] Win95 styling applied
# - [ ] No console errors
```

## 8. Test Comic Generation (Manual Trigger)

Create a test endpoint to manually trigger generation:

**Create**: `functions/api/test-generate.ts`

```typescript
export async function onRequestGet(context: any) {
  const { env, request } = context;

  // Add basic auth to prevent abuse
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== 'Bearer test-secret-key') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Import generation logic
    const { generateComicScript } = await import('../lib/comic-generator');
    const { renderComicToSVG } = await import('../lib/svg-renderer');

    const today = new Date().toISOString().split('T')[0];
    const MODEL_A = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

    // Generate one comic as test
    const script = await generateComicScript(env.AI, MODEL_A, today);
    const svg = renderComicToSVG(script);

    // Save to R2
    const key = `comics/${today}/test-a.svg`;
    await env.COMICS_BUCKET.put(key, svg, {
      httpMetadata: { contentType: 'image/svg+xml' }
    });

    return Response.json({
      success: true,
      script,
      r2_key: key,
      svg_length: svg.length
    });

  } catch (err: any) {
    console.error('Test generation failed:', err);
    return Response.json({
      error: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
```

Then test it:

```bash
# After deploying
curl -H "Authorization: Bearer test-secret-key" \
  "$SITE/api/test-generate"
```

## 9. Verify Database Data

```bash
# Check if comics were created
wrangler d1 execute llm-comic-db --command="SELECT * FROM comics"

# Check vote counts
wrangler d1 execute llm-comic-db --command="SELECT day, variant, COUNT(*) as votes FROM votes GROUP BY day, variant"

# Check subscriptions
wrangler d1 execute llm-comic-db --command="SELECT COUNT(*) as total FROM push_subscriptions"
```

## 10. Verify R2 Storage

```bash
# List objects in bucket
wrangler r2 object list llm-comics

# Download a test comic
wrangler r2 object get llm-comics/comics/2026-03-05/test-a.svg > test-comic.svg

# Open in browser
open test-comic.svg
```

## 11. Test Cron Trigger

```bash
# Check cron configuration
wrangler pages deployment list --project-name=promptexecution-comic

# View logs to see if cron has run
wrangler pages deployment tail --project-name=promptexecution-comic

# Or check D1 for today's comic
wrangler d1 execute llm-comic-db --command="SELECT day, created_at FROM comics ORDER BY day DESC LIMIT 1"
```

## 12. Test Push Notifications

1. Open site in browser
2. Go to Subscribe tab
3. Click "Subscribe to Daily Comics"
4. Allow notifications
5. Check browser DevTools → Application → Service Workers
   - Should show service worker registered
6. Check DevTools → Application → Push Messaging
   - Should show subscription

Test sending a push:

```bash
# You'll need to implement a test endpoint or use web-push CLI
# This requires the subscription object from browser
```

## Common Issues & Fixes

### Issue: "Module not found" errors

**Fix**: Check TypeScript paths in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: Workers AI models not found

**Fix**: Check available models:
```bash
# Use Cloudflare docs to verify model names
# https://developers.cloudflare.com/workers-ai/models/
```

Update model names in `functions/_worker.js`:
```javascript
const MODEL_A = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MODEL_B = '@cf/mistral/mistral-7b-instruct-v0.2-lora';
```

### Issue: D1 binding not found

**Fix**: Verify binding in wrangler.toml matches code:
```toml
[[d1_databases]]
binding = "DB"  # Must match env.DB in code
```

### Issue: R2 CORS errors

**Fix**: Add CORS configuration to R2 bucket:
```bash
# This is done via Dashboard or API
# Cloudflare Dashboard → R2 → Your Bucket → Settings → CORS
```

### Issue: Service Worker not registering

**Fix**: Ensure HTTPS (required for service workers)
- Local dev: Use `wrangler dev` (has HTTPS)
- Production: Cloudflare Pages has HTTPS by default

### Issue: Cron not triggering

**Fix**:
1. Verify cron syntax in wrangler.toml
2. Check Workers plan includes cron triggers
3. View logs: `wrangler pages deployment tail`

## Integration Test Plan

### Full End-to-End Test

1. ✅ Deploy to Cloudflare Pages
2. ✅ Manually trigger comic generation
3. ✅ Verify comic appears in database
4. ✅ Verify SVG stored in R2
5. ✅ Open frontend, see comic
6. ✅ Vote for variant A
7. ✅ Verify vote recorded in database
8. ✅ Check vote count updates in UI
9. ✅ Subscribe to push notifications
10. ✅ Verify subscription in database
11. ✅ Check archive shows comic
12. ✅ Test on mobile device

## Performance Testing

### Load Test (Optional)

```bash
# Install Apache Bench
# On Ubuntu: apt-get install apache2-utils
# On Mac: brew install ab

# Test /api/today endpoint
ab -n 1000 -c 10 https://your-site.com/api/today

# Test /api/archive
ab -n 1000 -c 10 https://your-site.com/api/archive
```

## Monitoring Setup

### Set Up Alerts (Recommended)

1. Go to Cloudflare Dashboard → Analytics
2. Set up notifications for:
   - High error rates (5xx errors)
   - Low success rates
   - Cron failures

### Log Monitoring

```bash
# Continuous log watching
wrangler pages deployment tail --project-name=promptexecution-comic --follow
```

## Next Steps After Testing

Once all tests pass:

- [ ] Write actual automated tests (Vitest, Playwright)
- [ ] Set up CI/CD pipeline
- [ ] Add error tracking (Sentry, etc.)
- [ ] Set up uptime monitoring
- [ ] Create backup strategy for D1
- [ ] Document known issues
- [ ] Create runbook for common problems

## Questions to Answer

Before going live, verify:

1. **Does the frontend build?** → Run `npm run build`
2. **Do the components render?** → Run `npm run dev`
3. **Does the database schema work?** → Test with `wrangler d1`
4. **Can I deploy?** → Run `wrangler pages deploy`
5. **Do the APIs respond?** → Test with curl
6. **Does comic generation work?** → Create test endpoint
7. **Are votes recorded?** → Test voting flow
8. **Do push notifications work?** → Test subscription

---

**Status**: ⚠️ **NOT YET TESTED**
**Next Step**: Follow this guide to test each component
**Time Required**: ~2-3 hours for full testing

**Start here**: Section 1 (Local Build Test)
