# Quick Start Guide

Get "LLM DOES NOT COMPUTE" running in 5 minutes.

## 1. Install Dependencies

```bash
npm install
npm install -g wrangler
```

## 2. Authenticate with Cloudflare

```bash
wrangler login
```

## 3. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create llm-comic-db
# Copy the database_id and update wrangler.toml

# Initialize database schema
wrangler d1 execute llm-comic-db --file=./schema.sql

# Create R2 bucket
wrangler r2 bucket create llm-comics

# Create KV namespace (optional)
wrangler kv:namespace create CACHE
# Copy the id and update wrangler.toml
```

## 4. Update Configuration

Edit `wrangler.toml` and replace:
- `database_id` with your D1 database ID
- `preview_d1_database_id` with your preview database ID (if different)
- `id` in KV namespaces with your KV namespace ID

## 5. Generate VAPID Keys

```bash
# Install web-push if not already installed
npm install -g web-push

# Generate keys
web-push generate-vapid-keys

# Set as Cloudflare secrets
wrangler secret put VAPID_PUBLIC_KEY
# Paste public key

wrangler secret put VAPID_PRIVATE_KEY
# Paste private key
```

Update `src/components/PushSubscribe.vue` line ~37:
```typescript
const vapidPublicKey = 'YOUR_PUBLIC_KEY_HERE';
```

## 6. Test Locally

```bash
# Start dev server
npm run dev

# In another terminal, test API endpoints
curl http://localhost:5173/api/today
```

**Note**: Local development won't have Workers AI or cron triggers. Use `wrangler dev` for full local testing:

```bash
wrangler pages dev dist --compatibility-date=2024-12-01 --d1=DB=llm-comic-db --r2=COMICS_BUCKET=llm-comics
```

## 7. Deploy

```bash
# Build and deploy
npm run deploy

# Or step by step:
npm run build
wrangler pages deploy dist --project-name=promptexecution-comic
```

## 8. Set Up Bindings in Dashboard

Go to Cloudflare Dashboard → Pages → Your Project → Settings → Functions:

Add bindings:
- **D1 Database**: `DB` → Select `llm-comic-db`
- **R2 Bucket**: `COMICS_BUCKET` → Select `llm-comics`
- **KV Namespace**: `CACHE` → Select your namespace
- **Workers AI**: `AI` → (Auto-configured, just enable)
- **Analytics Engine**: `ANALYTICS` → (Optional)

## 9. Verify Deployment

```bash
# Check if cron is active
wrangler pages deployment list --project-name=promptexecution-comic

# View logs
npm run logs
```

## 10. Manual Test Generation

Since cron runs once daily, manually test generation:

Create `functions/api/generate.ts`:

```typescript
export async function onRequestGet(context: any) {
  const { env } = context;

  // Import your generation logic
  // Call generateComicScript() and save to D1/R2

  return Response.json({ success: true });
}
```

Then visit: `https://your-site.com/api/generate`

## Troubleshooting

### Issue: "Cannot find module 'comic-generator'"

**Fix**: Ensure TypeScript compilation is working. Check `tsconfig.json`.

### Issue: "D1 database not found"

**Fix**:
```bash
wrangler d1 list
# Verify database exists and update wrangler.toml
```

### Issue: "R2 bucket not accessible"

**Fix**:
```bash
wrangler r2 bucket list
# Ensure bucket exists and binding is correct
```

### Issue: "Workers AI model not available"

**Fix**: Check model name in `functions/lib/comic-generator.ts`. Available models:
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- `@cf/mistral/mistral-7b-instruct-v0.2-lora`
- See full list: https://developers.cloudflare.com/workers-ai/models/

### Issue: "Push notifications not working"

**Fix**:
1. Verify VAPID keys are set: `wrangler secret list`
2. Check service worker is registered: Open DevTools → Application → Service Workers
3. Ensure HTTPS (required for push)

## Next Steps

1. ✅ Verify comics generate correctly
2. ✅ Test voting system
3. ✅ Customize comic topics in `functions/lib/comic-generator.ts`
4. ✅ Update branding/styling
5. ✅ Share with the world!

## Development Workflow

```bash
# Make changes
vim src/components/ComicViewer.vue

# Test locally
npm run dev

# Deploy
npm run deploy

# Check logs
npm run logs

# Query database
npm run db:query "SELECT * FROM comics ORDER BY day DESC LIMIT 5"
```

## Useful Commands

```bash
# View all comics
wrangler d1 execute llm-comic-db --command="SELECT day, prompt, model_a, model_b FROM comics"

# View vote counts
wrangler d1 execute llm-comic-db --command="SELECT day, variant, COUNT(*) as votes FROM votes GROUP BY day, variant"

# List R2 objects
wrangler r2 object list llm-comics

# Download a comic
wrangler r2 object get llm-comics/comics/2026-03-05/a.svg > comic.svg
```

## Support

- **Documentation**: See DEPLOYMENT.md for detailed setup
- **Issues**: GitHub Issues
- **Discord**: [Your Discord Server]
- **Email**: support@promptexecution.com

---

**Ready to go?** Run `npm run deploy` and watch the magic happen! ✨🤖
