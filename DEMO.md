# Demo & Preview Guide

## 🎬 Where to Demo It?

### Option 1: Local Development (Quickest)

```bash
# Start dev server
npm run dev

# Open browser
open http://localhost:5173
```

**What you'll see:**
- ✅ Win95-style tabbed UI
- ✅ Comic/Archive/Subscribe/CLI tabs
- ⚠️ "No comic for today yet" (expected - no backend)
- ✅ Visual styling and layout

**Limitations:**
- No real comic generation (needs Workers AI)
- No database (needs D1)
- No R2 storage
- APIs will fail (expected)

### Option 2: Wrangler Dev (Full Local Stack)

```bash
# Build first
npm run build

# Run with Cloudflare bindings (requires setup)
wrangler pages dev dist \
  --compatibility-date=2024-12-01 \
  --d1=DB=llm-comic-db \
  --r2=COMICS_BUCKET=llm-comics \
  --binding AI

# Open browser
open http://localhost:8788
```

**What you'll see:**
- ✅ Full stack working locally
- ✅ Real Workers AI calls
- ✅ Real D1 database
- ✅ Real R2 storage
- ✅ Functional APIs

**Prerequisites:**
- D1 database created
- R2 bucket created
- Wrangler authenticated

### Option 3: Deploy to Preview (Best for Sharing)

```bash
# Deploy to Cloudflare Pages preview
npm run build
wrangler pages deploy dist --project-name=promptexecution-comic

# You'll get a preview URL like:
# https://abc123.promptexecution-comic.pages.dev
```

**Share the URL** with others to demo!

## 🧪 Quick Demo Script

### 1. Show the UI (No Backend Required)

```bash
npm run dev
```

**Demo flow:**
1. "Here's the Win95-style interface"
2. Click through tabs: Comic → Archive → Subscribe → CLI
3. "The CLI tab has the existing terminal interface"
4. "Comic tab will show daily comics with A/B voting"
5. "Archive shows historical comics with vote stats"

### 2. Show the Code Structure

```bash
# Show Vue components
ls -la src/components/

# Show backend functions
ls -la functions/api/

# Show generation logic
cat functions/lib/comic-generator.ts | head -50
```

**Highlight:**
- "Two models generate comics from same prompt"
- "Users vote for their favorite"
- "Fully automated with cron triggers"

### 3. Show Database Schema

```bash
cat schema.sql
```

**Point out:**
- Comics table (daily metadata)
- Votes table (A/B voting)
- Push subscriptions
- Vote counting

### 4. Deploy and Test (If Setup Complete)

```bash
# Deploy
npm run deploy

# Manually generate a test comic
curl -X POST \
  -H "Authorization: Bearer test-secret-changeme" \
  https://your-site.com/api/test-generate

# View the comic
open https://your-site.com
```

## 📸 Screenshots to Show

Create these demo screenshots:

### 1. Win95 Tabbed Interface
- Show the retro window with tabs
- Highlight the "Sponsored by Cloudflare" branding

### 2. Comic Viewer (Mock)
- Side-by-side A/B comparison
- Vote buttons
- Model names shown

### 3. Archive Table
- Historical comics list
- Vote statistics
- Winner indicators

### 4. Architecture Diagram
```
┌──────────────────────────────────────────┐
│         Cloudflare Pages                 │
│   (Vue 3 + Win95 UI + CLI)               │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│      Cloudflare Pages Functions          │
│   /api/today  /api/vote  /api/archive    │
└──────────────┬───────────────────────────┘
               │
       ┌───────┴────────┬──────────┐
       ▼                ▼          ▼
  ┌─────────┐    ┌──────────┐  ┌────────┐
  │Workers AI│    │ D1 (DB)  │  │R2 (SVG)│
  │2 Models │    │ Votes    │  │ Images │
  └─────────┘    └──────────┘  └────────┘
       ▲
       │
  Cron Trigger
  (Daily 9 AM)
```

## 🎥 Video Demo Script (3 minutes)

### Part 1: Introduction (30 sec)
"LLM DOES NOT COMPUTE - a daily webcomic where TWO AI models generate comics from the same prompt, and YOU vote for the best one."

### Part 2: UI Tour (60 sec)
- Show Win95-style interface
- Click through tabs
- Explain daily voting concept
- Show archive with stats

### Part 3: Technical Stack (60 sec)
- "100% Cloudflare-native"
- Workers AI generates comics
- D1 stores votes and metadata
- R2 stores images
- Cron triggers daily
- Show code structure

### Part 4: Call to Action (30 sec)
- "Fully open source"
- "Check out the GitHub repo"
- "Subscribe for daily notifications"
- "Vote for your favorite model!"

## 🧪 Live Demo Checklist

Before demoing to others:

### Frontend-Only Demo (Easy)
- [ ] `npm run dev` works
- [ ] All tabs load
- [ ] No console errors
- [ ] Styling looks good
- [ ] Responsive on mobile

### Full Stack Demo (Requires Setup)
- [ ] Cloudflare resources created
- [ ] Database initialized
- [ ] Test comic generated
- [ ] `/api/today` returns comic
- [ ] Voting works
- [ ] Archive shows data

### Presentation Demo
- [ ] Slides prepared
- [ ] Screenshots captured
- [ ] Video recorded (optional)
- [ ] Code snippets ready
- [ ] Architecture diagram shown

## 🚀 Quick Demo Deployment

If you want a live demo RIGHT NOW:

```bash
# 1. Install and auth
npm install
wrangler login

# 2. Create minimal resources (30 seconds)
wrangler d1 create llm-comic-demo
wrangler r2 bucket create llm-comics-demo

# 3. Update wrangler.toml with IDs

# 4. Initialize database
wrangler d1 execute llm-comic-demo --file=./schema.sql

# 5. Deploy
npm run build
wrangler pages deploy dist --project-name=comic-demo

# 6. Open preview URL
# https://abc123.comic-demo.pages.dev
```

**What works:**
- ✅ UI loads
- ✅ Tabs work
- ⚠️ No comics yet (need to generate)
- ⚠️ APIs need bindings configured

## 🎨 Mock Data for Demo

Want to show it with fake data? Create mock API responses:

**Create**: `functions/api/today.ts` (demo version)

```typescript
export async function onRequestGet(context: any) {
  // Return mock data for demo
  return Response.json({
    day: "2026-03-05",
    title: "Kubernetes Confusion",
    variants: {
      a: {
        model: "llama-70b",
        imageUrl: "data:image/svg+xml;base64,...", // Mock SVG
        votes: 42,
        script: { /* mock script */ }
      },
      b: {
        model: "mistral-7b",
        imageUrl: "data:image/svg+xml;base64,...", // Mock SVG
        votes: 38,
        script: { /* mock script */ }
      }
    }
  });
}
```

## 📊 Demo Metrics to Highlight

When presenting:

- **Serverless**: 100% edge-deployed
- **Cost**: $0-5/month on free tier
- **Performance**: <100ms response times
- **Automation**: Zero manual work after setup
- **Scale**: Handles 100k+ requests/day
- **Models**: Compare any 2 LLMs
- **Interactive**: Real-time voting
- **Retro**: Win95 aesthetic

## 🎯 Target Audiences

### For Developers
- Show code structure
- Explain Workers AI integration
- Demonstrate D1 + R2 usage
- Highlight cron triggers

### For Product People
- Show UI/UX
- Explain voting mechanic
- Demo push notifications
- Show archive analytics

### For Management
- Highlight low cost
- Show automation
- Explain scaling
- Demonstrate engagement

## 🔗 Links to Share

After demo:
- GitHub repo: [URL]
- Live site: [URL]
- Technical blog post: [URL]
- Architecture diagram: [URL]
- Video demo: [URL]

---

**TL;DR**: Run `npm run dev` for a quick UI demo, or follow TESTING.md for a full deployment demo.

**Time to demo**: 2 minutes (UI only) or 30 minutes (full stack)
