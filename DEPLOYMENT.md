# LLM DOES NOT COMPUTE - Deployment Guide

Complete setup guide for deploying the webcomic on Cloudflare Pages + Workers.

## Prerequisites

1. **Cloudflare account** with Pages and Workers enabled
2. **Wrangler CLI** installed: `npm install -g wrangler`
3. **Authenticated**: `wrangler login`

## Step 1: Create D1 Database

```bash
# Create the D1 database
wrangler d1 create llm-comic-db

# Note the database_id from output, update wrangler.toml
```

Update `wrangler.toml` with the actual `database_id`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "llm-comic-db"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace this
```

Initialize the schema:
```bash
wrangler d1 execute llm-comic-db --file=./schema.sql
```

## Step 2: Create R2 Bucket

```bash
# Create R2 bucket for comic images
wrangler r2 bucket create llm-comics

# Bucket will be accessible via COMICS_BUCKET binding
```

## Step 3: Create KV Namespace (optional, for caching)

```bash
wrangler kv:namespace create CACHE

# Update wrangler.toml with the namespace ID
```

## Step 4: Generate VAPID Keys for Web Push

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Save the output keys
```

Set the secrets:
```bash
wrangler secret put VAPID_PUBLIC_KEY
# Paste the public key when prompted

wrangler secret put VAPID_PRIVATE_KEY
# Paste the private key when prompted
```

Update `src/components/PushSubscribe.vue` with the public key:
```typescript
const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY_HERE';
```

## Step 5: Deploy to Cloudflare Pages

### Option A: Via Git (Recommended)

1. Push your code to GitHub
2. Go to Cloudflare Dashboard → Pages
3. Connect your repository
4. Set build configuration:
   - **Build command**: `npm run build`
   - **Build output**: `dist`
   - **Root directory**: `/`

5. Add environment bindings:
   - D1 Database: `DB` → `llm-comic-db`
   - R2 Bucket: `COMICS_BUCKET` → `llm-comics`
   - KV Namespace: `CACHE` → your KV namespace
   - Workers AI: `AI` (auto-configured)

6. Deploy!

### Option B: Via Wrangler CLI

```bash
# Build the frontend
npm run build

# Deploy Pages with Functions
wrangler pages deploy dist --project-name=promptexecution-comic

# Set up bindings via dashboard or wrangler.toml
```

## Step 6: Configure Cron Trigger

The cron trigger is defined in `wrangler.toml`:

```toml
[triggers]
crons = ["0 9 * * *"]  # 9 AM UTC daily
```

After deployment, verify the cron is active:
```bash
wrangler pages deployment list --project-name=promptexecution-comic
```

## Step 7: Test the System

### Manual Comic Generation (for testing)

You can manually trigger comic generation:

```bash
# Invoke the scheduled handler directly
wrangler pages deployment tail --project-name=promptexecution-comic
```

Or create a test endpoint in `functions/api/generate.ts`:

```typescript
export async function onRequestPost(context: any) {
  const { env } = context;
  // Call the scheduled() logic manually
  // Only allow with authorization header
}
```

### Test the API Endpoints

```bash
# Get today's comic
curl https://promptexecution.com/api/today

# Vote
curl -X POST https://promptexecution.com/api/vote \
  -H "Content-Type: application/json" \
  -d '{"day":"2026-03-05","variant":"a"}'

# Get archive
curl https://promptexecution.com/api/archive?page=1

# Subscribe (requires valid subscription object)
curl -X POST https://promptexecution.com/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"...","keys":{"p256dh":"...","auth":"..."}}'
```

## Step 8: Custom Domain (Optional)

1. Go to Pages project settings
2. Add custom domain: `promptexecution.com`
3. Update DNS records as instructed
4. Wait for SSL certificate provisioning

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Edge                          │
│                                                              │
│  ┌────────────┐    ┌──────────────┐    ┌─────────────┐    │
│  │   Pages    │───▶│   Functions  │───▶│  Workers AI │    │
│  │  (Frontend)│    │   (API)      │    │  (LLM Gen)  │    │
│  └────────────┘    └──────────────┘    └─────────────┘    │
│         │                  │                                │
│         │                  ▼                                │
│         │          ┌──────────────┐                        │
│         │          │  D1 Database │                        │
│         │          │  - comics    │                        │
│         │          │  - votes     │                        │
│         │          │  - subs      │                        │
│         │          └──────────────┘                        │
│         │                  │                                │
│         ▼                  ▼                                │
│  ┌────────────┐    ┌──────────────┐                        │
│  │  R2 Bucket │    │  Cron Trigger│                        │
│  │  (Images)  │    │  (Daily Gen) │                        │
│  └────────────┘    └──────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Monitoring & Debugging

### View Logs

```bash
# Tail Pages logs
wrangler pages deployment tail --project-name=promptexecution-comic

# View D1 data
wrangler d1 execute llm-comic-db --command="SELECT * FROM comics ORDER BY day DESC LIMIT 10"

# Check R2 objects
wrangler r2 object list llm-comics
```

### Common Issues

**Issue**: Cron not triggering
- Verify cron syntax in `wrangler.toml`
- Check Pages deployment logs
- Ensure Workers plan supports cron triggers

**Issue**: Comic generation fails
- Check Workers AI model availability
- Verify AI binding is configured
- Check error logs for model timeouts

**Issue**: Push notifications not working
- Verify VAPID keys are set
- Check service worker registration
- Ensure HTTPS (required for push)

**Issue**: R2 images not loading
- Check CORS configuration on R2 bucket
- Verify R2 binding is correct
- Ensure objects are public or use signed URLs

## Cost Estimates

Based on Cloudflare's pricing (as of 2024):

- **Pages**: Free (500 builds/month)
- **Workers**: Free tier (100k requests/day)
- **D1**: Free tier (5GB storage, 5M reads/day)
- **R2**: Free tier (10GB storage, 1M reads/month)
- **Workers AI**: Free tier (10k neurons/day)

**Expected costs for moderate traffic**: $0-5/month

## Next Steps

1. ✅ Deploy infrastructure
2. ✅ Test comic generation
3. ✅ Enable push notifications
4. 📈 Monitor analytics
5. 🎨 Iterate on comic quality
6. 📣 Promote the comic!

## Support

For issues:
- Check Cloudflare Dash logs
- Review GitHub issues
- Contact support@promptexecution.com
