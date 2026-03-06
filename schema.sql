-- D1 Database Schema for LLM DOES NOT COMPUTE

-- Comics table: one row per day
CREATE TABLE IF NOT EXISTS comics (
    day TEXT PRIMARY KEY,               -- YYYY-MM-DD format
    prompt TEXT NOT NULL,                -- Base prompt used
    model_a TEXT NOT NULL,               -- e.g., "@cf/meta/llama-3.1-8b-instruct"
    model_b TEXT NOT NULL,               -- e.g., "@cf/mistral/mistral-7b-instruct"
    r2_key_a TEXT NOT NULL,              -- R2 object key for variant A
    r2_key_b TEXT NOT NULL,              -- R2 object key for variant B
    script_a TEXT,                       -- Generated script/description A
    script_b TEXT,                       -- Generated script/description B
    created_at INTEGER NOT NULL,         -- Unix timestamp
    pushed_at INTEGER                    -- When push notification was sent
);

CREATE INDEX IF NOT EXISTS idx_comics_created ON comics(created_at DESC);

-- Votes table: track user preferences
CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,                   -- YYYY-MM-DD
    variant TEXT NOT NULL,               -- 'a' or 'b'
    voter_hash TEXT NOT NULL,            -- Hash of IP + UA
    created_at INTEGER NOT NULL,
    UNIQUE(day, voter_hash)              -- One vote per voter per day
);

CREATE INDEX IF NOT EXISTS idx_votes_day ON votes(day);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,                -- Public key
    auth TEXT NOT NULL,                  -- Auth secret
    created_at INTEGER NOT NULL,
    last_sent_day TEXT                   -- Last day notification was sent
);

CREATE INDEX IF NOT EXISTS idx_push_last_sent ON push_subscriptions(last_sent_day);

-- Vote counts materialized view (optional, for performance)
CREATE TABLE IF NOT EXISTS vote_counts (
    day TEXT PRIMARY KEY,
    votes_a INTEGER DEFAULT 0,
    votes_b INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL
);

-- Workflow run metadata + retained artifact pointers
CREATE TABLE IF NOT EXISTS workflow_runs (
    run_id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    trigger TEXT NOT NULL,              -- cron | manual
    panel_count INTEGER NOT NULL,
    character_count INTEGER NOT NULL,
    cast_json TEXT NOT NULL,
    topics_json TEXT NOT NULL,
    selected_topic TEXT NOT NULL,
    prompt_a TEXT NOT NULL,
    prompt_b TEXT NOT NULL,
    model_a TEXT NOT NULL,
    model_b TEXT NOT NULL,
    image_key_a TEXT NOT NULL,
    image_key_b TEXT NOT NULL,
    artifact_log_key TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflow_day ON workflow_runs(day, created_at DESC);
