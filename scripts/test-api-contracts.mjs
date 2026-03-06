import assert from 'node:assert/strict';

const todayApi = await import('../functions/api/today.ts');
const dayApi = await import('../functions/api/day.ts');
const imageApi = await import('../functions/api/image.ts');
const archiveApi = await import('../functions/api/archive.ts');
const voteApi = await import('../functions/api/vote.ts');
const pushKeyApi = await import('../functions/api/push-key.ts');
const subscribeApi = await import('../functions/api/subscribe.ts');
const workflow = await import('../functions/lib/agentic-comic-workflow.ts');
const webPush = await import('../functions/lib/web-push.ts');

class MockBucket {
  constructor(objects) {
    this.objects = new Map(objects);
  }

  async head(key) {
    return this.objects.has(key) ? { key } : null;
  }

  async get(key) {
    const entry = this.objects.get(key);
    if (!entry) return null;
    return {
      body: new Blob([entry.body]).stream(),
      httpMetadata: { contentType: entry.contentType },
      httpEtag: entry.etag,
      uploaded: entry.uploaded,
    };
  }
}

class MockDB {
  constructor({ comics, votes, subscriptions }) {
    this.comics = [...comics];
    this.votes = [...votes];
    this.subscriptions = [...subscriptions];
  }

  prepare(sql) {
    const db = this;
    const makeRunner = (params) => ({
      async first() {
        return db.#first(sql, params);
      },
      async all() {
        return db.#all(sql, params);
      },
      async run() {
        return db.#run(sql, params);
      }
    });

    return {
      async first() {
        return db.#first(sql, []);
      },
      async all() {
        return db.#all(sql, []);
      },
      async run() {
        return db.#run(sql, []);
      },
      bind(...params) {
        return makeRunner(params);
      }
    };
  }

  #first(sql, params) {
    if (sql.includes('SELECT * FROM comics WHERE day = ?')) {
      return this.comics.find((comic) => comic.day === params[0]) || null;
    }

    if (sql.includes('SELECT * FROM comics ORDER BY day DESC LIMIT 1')) {
      return [...this.comics].sort((a, b) => b.day.localeCompare(a.day))[0] || null;
    }

    if (sql.includes('SELECT COUNT(*) as total FROM comics')) {
      return { total: this.comics.length };
    }

    if (sql.includes('SELECT day FROM comics WHERE day = ?')) {
      const comic = this.comics.find((item) => item.day === params[0]);
      return comic ? { day: comic.day } : null;
    }

    if (sql.includes('SELECT day, r2_key_a, r2_key_b FROM comics WHERE day = ?')) {
      const comic = this.comics.find((item) => item.day === params[0]);
      if (!comic) return null;
      return {
        day: comic.day,
        r2_key_a: comic.r2_key_a,
        r2_key_b: comic.r2_key_b
      };
    }

    throw new Error(`Unhandled first() query: ${sql}`);
  }

  #all(sql, params) {
    if (sql.includes('SELECT variant, COUNT(*) as count FROM votes WHERE day = ? GROUP BY variant')) {
      return { results: countVotesForDay(this.votes, params[0]) };
    }

    if (sql.includes('SELECT day, prompt, model_a, model_b, r2_key_a, r2_key_b, created_at FROM comics ORDER BY day DESC LIMIT ? OFFSET ?')) {
      const [limit, offset] = params;
      const items = [...this.comics]
        .sort((a, b) => b.day.localeCompare(a.day))
        .slice(offset, offset + limit)
        .map(({ day, prompt, model_a, model_b, r2_key_a, r2_key_b, created_at }) => ({
          day,
          prompt,
          model_a,
          model_b,
          r2_key_a,
          r2_key_b,
          created_at
        }));
      return { results: items };
    }

    if (sql.includes('SELECT day, variant, COUNT(*) as count FROM votes WHERE day IN')) {
      const days = params;
      return {
        results: days.flatMap((day) =>
          countVotesForDay(this.votes, day).map((item) => ({ day, ...item }))
        )
      };
    }

    if (sql.includes('SELECT * FROM push_subscriptions WHERE last_sent_day IS NULL OR last_sent_day < ?')) {
      const day = params[0];
      return {
        results: this.subscriptions.filter((subscription) =>
          !subscription.last_sent_day || subscription.last_sent_day < day
        )
      };
    }

    throw new Error(`Unhandled all() query: ${sql}`);
  }

  #run(sql, params) {
    if (sql.includes('INSERT INTO votes')) {
      const [day, variant, voter_hash, created_at] = params;
      const existing = this.votes.find((vote) => vote.day === day && vote.voter_hash === voter_hash);
      if (existing) {
        existing.variant = variant;
        existing.created_at = created_at;
      } else {
        this.votes.push({ day, variant, voter_hash, created_at });
      }
      return { success: true };
    }

    if (sql.includes('INSERT OR REPLACE INTO push_subscriptions')) {
      const [endpoint, p256dh, auth, created_at] = params;
      const existing = this.subscriptions.find((item) => item.endpoint === endpoint);
      if (existing) {
        existing.p256dh = p256dh;
        existing.auth = auth;
        existing.created_at = created_at;
      } else {
        this.subscriptions.push({ endpoint, p256dh, auth, created_at });
      }
      return { success: true };
    }

    if (sql.includes('DELETE FROM push_subscriptions WHERE endpoint = ?')) {
      const endpoint = params[0];
      this.subscriptions = this.subscriptions.filter((item) => item.endpoint !== endpoint);
      return { success: true };
    }

    if (sql.includes('UPDATE push_subscriptions SET last_sent_day = ? WHERE endpoint = ?')) {
      const [day, endpoint] = params;
      const subscription = this.subscriptions.find((item) => item.endpoint === endpoint);
      if (subscription) {
        subscription.last_sent_day = day;
      }
      return { success: true };
    }

    throw new Error(`Unhandled run() query: ${sql}`);
  }
}

function countVotesForDay(votes, day) {
  return ['a', 'b']
    .map((variant) => ({
      variant,
      count: votes.filter((vote) => vote.day === day && vote.variant === variant).length
    }))
    .filter((item) => item.count > 0);
}

function makeRequest(url, init = {}) {
  return new Request(url, init);
}

function makeEnv() {
  const day = '2026-03-06';
  const comics = [
    {
      day,
      prompt: 'LLM DOES NOT COMPUTE: Deploy Fridays',
      model_a: '@cf/model-a',
      model_b: '@cf/model-b',
      r2_key_a: `comics/${day}/a.svg`,
      r2_key_b: `comics/${day}/b.svg`,
      script_a: JSON.stringify({ panels: 3, cast_ids: ['user', 'robot'] }),
      script_b: JSON.stringify({ panels: 4, cast_ids: ['user', 'robot', 'simon'] }),
      created_at: 1_709_683_200
    }
  ];
  const votes = [];
  const subscriptions = [];
  const bucket = new MockBucket([
    [`comics/${day}/a.svg`, { body: '<svg>A</svg>', contentType: 'image/svg+xml', etag: 'etag-a', uploaded: new Date('2026-03-06T00:00:00Z') }],
    [`comics/${day}/b.svg`, { body: '<svg>B</svg>', contentType: 'image/svg+xml', etag: 'etag-b', uploaded: new Date('2026-03-06T00:00:00Z') }]
  ]);

  return {
    DB: new MockDB({ comics, votes, subscriptions }),
    COMICS_BUCKET: bucket,
    AUTO_GENERATE_ON_READ: '0',
    ALLOW_LOCAL_BOOTSTRAP: '0',
    ENABLE_PUSH_NOTIFICATIONS: '0',
    VAPID_PRIVATE_KEY: JSON.stringify({
      alg: 'ES256',
      kty: 'EC',
      crv: 'P-256',
      d: 'abc',
      x: 'def',
      y: 'ghi'
    }),
    VAPID_PUBLIC_KEY: 'public-key',
    VAPID_SUBJECT: 'mailto:hello@promptexecution.com',
    SITE_URL: 'https://promptexecution.com'
  };
}

async function readJson(response) {
  return JSON.parse(await response.text());
}

async function main() {
  const env = makeEnv();

  {
    const response = await todayApi.onRequestGet({
      env: { ...env, DB: undefined },
      request: makeRequest('https://example.com/api/today')
    });
    assert.equal(response.status, 503);
    const payload = await readJson(response);
    assert.deepEqual(payload, {
      error: 'Service misconfigured',
      missingBindings: ['DB']
    });
  }

  {
    const response = await todayApi.onRequestGet({ env, request: makeRequest('https://example.com/api/today') });
    assert.equal(response.status, 200);
    const payload = await readJson(response);
    assert.equal(payload.day, '2026-03-06');
    assert.equal(payload.variants.a.imageUrl, '/api/image?day=2026-03-06&variant=a');
    assert.deepEqual(payload.variants.a.script, { panels: 3, cast_ids: ['user', 'robot'] });
  }

  {
    const response = await dayApi.onRequestGet({
      env,
      request: makeRequest('https://example.com/api/day?day=2026-03-06')
    });
    assert.equal(response.status, 200);
    const payload = await readJson(response);
    assert.equal(payload.variants.b.imageUrl, '/api/image?day=2026-03-06&variant=b');
  }

  {
    const response = await imageApi.onRequestGet({
      env,
      request: makeRequest('https://example.com/api/image?day=2026-03-06&variant=a')
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/svg+xml');
    assert.equal(await response.text(), '<svg>A</svg>');
  }

  {
    const response = await voteApi.onRequestPost({
      env,
      request: makeRequest('https://example.com/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'test-agent' },
        body: JSON.stringify({ day: '2026-03-06', variant: 'a' })
      })
    });
    assert.equal(response.status, 200);
    let payload = await readJson(response);
    assert.deepEqual(payload.votes, { a: 1, b: 0 });

    const response2 = await voteApi.onRequestPost({
      env,
      request: makeRequest('https://example.com/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'test-agent' },
        body: JSON.stringify({ day: '2026-03-06', variant: 'b' })
      })
    });
    assert.equal(response2.status, 200);
    payload = await readJson(response2);
    assert.deepEqual(payload.votes, { a: 0, b: 1 });
  }

  {
    const response = await archiveApi.onRequestGet({
      env,
      request: makeRequest('https://example.com/api/archive?page=1&limit=5')
    });
    assert.equal(response.status, 200);
    const payload = await readJson(response);
    assert.equal(payload.total, 1);
    assert.equal(payload.items[0].votes.b, 1);
  }

  {
    const response = await pushKeyApi.onRequestGet({ env });
    assert.equal(response.status, 404);
  }

  {
    const response = await subscribeApi.onRequestPost({
      env,
      request: makeRequest('https://example.com/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'https://push.example/subscription',
          keys: { p256dh: 'a', auth: 'b' }
        })
      })
    });
    assert.equal(response.status, 503);
  }

  {
    const pushEnv = makeEnv();
    pushEnv.ENABLE_PUSH_NOTIFICATIONS = '1';
    pushEnv.DB.subscriptions.push(
      {
        endpoint: 'https://push.example/ok',
        p256dh: 'key-a',
        auth: 'auth-a',
        last_sent_day: null
      },
      {
        endpoint: 'https://push.example/gone',
        p256dh: 'key-b',
        auth: 'auth-b',
        last_sent_day: null
      }
    );

    const buildCalls = [];
    const fetchCalls = [];
    const result = await webPush.sendDailyComicPushNotifications(pushEnv, '2026-03-06', {
      async buildRequest(options) {
        buildCalls.push(options);
        return {
          endpoint: options.subscription.endpoint,
          headers: { 'Content-Type': 'application/octet-stream' },
          body: new ArrayBuffer(8)
        };
      },
      async fetchImpl(endpoint) {
        fetchCalls.push(endpoint);
        if (endpoint.endsWith('/gone')) {
          return new Response('gone', { status: 410 });
        }
        return new Response(null, { status: 201 });
      }
    });

    assert.deepEqual(result, { sent: 1, deleted: 1, failed: 0, skipped: false });
    assert.equal(buildCalls.length, 2);
    assert.deepEqual(fetchCalls, ['https://push.example/ok', 'https://push.example/gone']);
    assert.equal(pushEnv.DB.subscriptions.length, 1);
    assert.equal(pushEnv.DB.subscriptions[0].last_sent_day, '2026-03-06');
    assert.equal(buildCalls[0].message.adminContact, 'mailto:hello@promptexecution.com');
  }

  {
    const plan = await workflow.previewAgenticPromptPlan(
      { AI: null },
      { day: '2026-03-06', trigger: 'manual' }
    );
    const castIds = plan.cast.map((item) => item.id);
    assert.ok(castIds.includes('user'));
    assert.ok(castIds.includes('robot'));
    assert.ok(plan.panel_count >= 3 && plan.panel_count <= 4);
  }

  console.log('API and workflow contract checks passed');
}

await main();
