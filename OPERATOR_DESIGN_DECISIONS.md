# Operator Design Decisions: Comic Artifact Encapsulation

**Authority**: First-mate operator (role: operator)
**Scope**: Resolves 6 adversarial bouncer challenges
**Effect**: Gates code generation, binds sub-agent 2 implementation

---

## Challenge 1: LLM Non-Determinism vs. Content-Hash Idempotency

**Problem**: LLMs are probabilistic. Same input → different output. Content-hash model assumes determinism.

**Operator Decision**: **Accept Non-Determinism. Artifacts are outputs, not specifications.**

### Rationale

**The artifact IS the output**, not a promise. If Gemma4 produces two different scripts from "robot humor":
- Script A: "A robot walks into a bar, orders a beer. Bartender: 'We don't serve your kind here.' Robot: 'I accept.'"
- Script B: "A robot enters a bar. Bartender stares. Robot: 'I'm just here to understand human comedy.'"

Both are **valid, distinct artifacts**. They have different IDs (content-hashes):
- artifact_id_A = blake3("variant_a" || script_A) = "abc123"
- artifact_id_B = blake3("variant_a" || script_B) = "def456"

**No idempotency promise at the artifact level.** Idempotency exists at the **workflow invocation level**:
- Invoke script_generation(topic, cast) → returns artifact_id_X (whatever LLM produced)
- Same invocation → same artifact_id (Rhai code is deterministic given fixed seed/model)
- **Different invocation** (new model, new seed, new day) → potentially different artifact_id

### Implementation

- Artifact ID includes: `blake3(variant || model || seed || script_text)`
- Store model + seed in artifact.attrs for reproducibility
- Rhai script_generation() captures: `seed = context.seed || get_default_seed()`
- **Lineage shows branching**: Comic → [Script_A1 (model:Gemma4, seed:123), Script_A2 (model:Gemma4, seed:456)]

### Governance Value

✅ Full provenance: "This script came from Gemma4 with seed 123 on 2026-05-10"
✅ Reproducibility: Given same model + seed, same artifact_id regenerates identical script
✅ Deduplication: Two runs with same (model, seed, prompt) → same artifact (reuse)
✅ Auditability: Variants track which model/seed produced them

---

## Challenge 2: Voter Changed Mind (Vote Deduplication)

**Problem**: If vote ID = blake3(day || voter_hash || choice), changing choice creates duplicate votes with contradictory intents.

**Operator Decision**: **Use (day, voter_hash) as primary key. Latest vote wins. Keep audit history via Relations.**

### Rationale

**Voter voting twice is not an artifact problem, it's a **state management problem**.**

Use a hybrid model:
1. **Mutable state layer** (votes table, existing schema):
   ```sql
   CREATE TABLE votes (
     day TEXT, voter_hash TEXT, choice TEXT, created_at INT,
     PRIMARY KEY(day, voter_hash)  -- One vote per voter per day
   );
   ```
   This stays. ON CONFLICT → UPDATE choice.

2. **Immutable audit layer** (ontology):
   Each vote creates an AuditEvent artifact:
   ```
   Artifact(AuditEvent) {
     id: blake3(day || voter_hash || choice || timestamp),
     attrs: {day, choice, voter_hash, timestamp}
   }
   ```
   NEW vote → NEW artifact (different timestamp, different ID).

3. **Relation tracking the state change**:
   ```
   Relation {
     from: Comic.id,
     to: VoteAuditEvent_v1.id,
     relation: "ReviewedByOperator",
     provenance: {timestamp, choice: "a", voter: voter_hash}
   }

   Relation {
     from: Comic.id,
     to: VoteAuditEvent_v2.id,  -- LATER VOTE
     relation: "ReviewedByOperator",
     provenance: {timestamp: later, choice: "b", voter: voter_hash, reason: "changed mind"}
   }
   ```

### Implementation

- **Frontend logic**: POST /api/vote still simple. Rhai receives {choice} only.
- **Backend logic**: Rhai invokes record_vote(), which:
  1. Checks votes table for existing (day, voter_hash)
  2. If exists: UPDATE votes SET choice=... (mutable)
  3. Create NEW AuditEvent artifact (immutable record of this vote moment)
  4. Create Relation showing the audit trail
  5. Return {variant: "Ok", value: {artifact: AuditEvent, previous_choice: old_choice}}

### Governance Value

✅ Vote counts stay simple: `SELECT choice, COUNT(*) FROM votes WHERE day=? GROUP BY choice`
✅ Audit trail preserved: All vote_audit_events visible, timestamped
✅ Intent captured: Provenance shows "voter changed mind from a→b at timestamp"
✅ Compliance: "Was this voter eligible to vote? When did they vote? Did they change?" = queryable

---

## Challenge 3: HTTP Layer Complexity

**Problem**: Voting now involves artifacts. Does /api/vote endpoint scale?

**Operator Decision**: **Thin HTTP layer. Rhai handles complexity. MCP invocation transparent to HTTP.**

### Rationale

HTTP layer stays **functionally unchanged**:
```typescript
// Frontend still sends
POST /api/vote {
  day: "2026-05-10",
  choice: "a" | "b" | null  // null = abstain
}

// Frontend still receives
{
  success: true,
  votes: {a: 42, b: 38, abstain: 2}
}
```

**Backend changes** (internal to handlers, not visible to HTTP):
```typescript
// TypeScript handler (image-generate.ts or new vote.ts)
export async function onRequestPost(context: any) {
  const {request, env} = context;
  const {day, choice} = await request.json();

  // Generate voter hash (same as before)
  const voter_hash = sha256(ip + ua + day);

  // NEW: Invoke Rhai via MCP instead of raw DB insert
  const vote_result = await invokeWorkflow('record_vote', {
    day,
    voter_hash,
    choice  // "a", "b", or null
  });

  // NEW: Handle {variant: "Ok"|"Err"} response
  if (vote_result.variant === 'Ok') {
    const artifact = vote_result.value.artifact;
    // Artifact is stored in DB (MCP invocation handles it)

    // Get vote counts (same query as before)
    const counts = await env.DB.prepare(
      'SELECT choice, COUNT(*) as count FROM votes WHERE day=? GROUP BY choice'
    ).bind(day).all();

    return Response.json({
      success: true,
      votes: {
        a: counts.find(c => c.choice === 'a')?.count || 0,
        b: counts.find(c => c.choice === 'b')?.count || 0,
        abstain: counts.find(c => c.choice === 'abstain')?.count || 0
      }
    });
  } else {
    return Response.json({
      success: false,
      error: vote_result.reason
    }, {status: 400});
  }
}
```

### Governance Value

✅ HTTP API stable (no breaking changes for frontend)
✅ Complexity encapsulated in Rhai (governance layer)
✅ MCP invocation is internal plumbing (transparent to callers)
✅ Vote counts queryable from existing votes table

---

## Challenge 4: Script Uniqueness & Day Context

**Problem**: Should script artifact ID include the day (origin context)?

**Operator Decision**: **YES. Include day in artifact ID. Scripts are day-specific proposals.**

### Rationale

**Principle**: Artifacts represent **instances**, not archetypes.

Same joke told on different days is a **different proposal**:
- Day 1: "A robot walks into a bar" (timely, novel, fits audience)
- Day 2: "A robot walks into a bar" (repetition, same audience tires, context matters)

**Artifact ID should reflect instance context**:
```
script_artifact_id = blake3(
  "variant_a" ||           // variant
  "2026-05-10" ||          // day (context)
  "Gemma4" ||              // model
  script_text              // content
)
```

**Result**: Same script text on different days → **different artifact IDs**

### Benefits

✅ **Deduplication within a day**: Rerun script_generation(day=2026-05-10) → same artifact_id
✅ **Separation across days**: Day 1 script ≠ Day 2 script (even if identical)
✅ **Lineage clarity**: Comic(2026-05-10) references Script(2026-05-10), not Script(2026-05-01)
✅ **Governance**: Audit trail shows "This comic used this script on this day"

### Implementation

Rhai script_generation():
```rhai
let artifact_id = blake3(
  "variant_a" || context.day || context.model_a || context.script_a
);
```

---

## Challenge 5: Provenance Immutability Paradox

**Problem**: Relations are content-hashed (immutable). How do we add post-hoc audit annotations?

**Operator Decision**: **Annotations are NEW relations, not mutations. Keep original relation immutable. Chain via provenance.**

### Rationale

**Original relation stays immutable**:
```
Relation V1 {
  id: blake3(comic_id || script_id || "DerivedFrom" || {})
  from: comic_id,
  to: script_id,
  relation: "DerivedFrom",
  provenance: {timestamp: "2026-05-10T10:00:00Z", generator: "rhai"}
}
```

**Later operator review creates NEW relation**:
```
Relation V2 {
  id: blake3(operator_id || relation_v1_id || "ValidatedBy" || {notes: "..."})
  from: operator_id,
  to: relation_v1_id,  // Relation refers to another relation!
  relation: "ValidatedBy",
  provenance: {
    timestamp: "2026-05-10T14:30:00Z",
    reviewer: "operator_alice",
    notes: "Script quality approved, ready for publishing"
  }
}
```

**Audit trail shows the chain**:
- Comic → (DerivedFrom) → Script (original, immutable)
- Operator → (ValidatedBy) → [Comic → Script relation] (annotation, immutable)

### Governance Value

✅ Original provenance never lies (immutable)
✅ Post-hoc annotations are separate artifacts (don't rewrite history)
✅ Full audit trail visible: decision → review → outcome
✅ Compliance: "Who reviewed this? When? What did they conclude?" = queryable

---

## Challenge 6: Abstain Vote Semantics

**Problem**: How should "neither is funny" votes affect popularity counting?

**Operator Decision**: **Abstain votes are VISIBLE but EXCLUDED from popularity ratio. Reported separately.**

### Rationale

**Goal**: Measure which variant is funnier **among engaged voters**.

Abstain is a **signal**:
- High abstain rate → "Neither variant resonated with audience" → Fitness function penalty
- Low abstain rate → "Audience had clear preference" → Fitness function reward

### Vote Response Model

```typescript
{
  success: true,
  votes: {
    a: 42,
    b: 38,
    abstain: 4,
    engagement: 0.96  // (42+38) / (42+38+4) = 0.95
  },
  fitness_signal: {
    variant_a_score: 42 / (42+38) = 0.525,   // 52.5% prefer A
    variant_b_score: 38 / (42+38) = 0.475,   // 47.5% prefer B
    engagement_score: 0.95,                   // 95% voted, didn't abstain
    popularity: 0.525 * 0.95 = 0.498          // A wins slightly, but low engagement hurts
  }
}
```

### Implementation

Rhai record_vote():
```rhai
fn record_vote(comic_id, voter_hash, vote_choice) {
  // vote_choice: {variant: "Some", value: "a"|"b"} or {variant: "None"}

  if vote_choice.variant == "None" {
    return #{
      variant: "Ok",
      value: #{
        artifact: #{
          kind: "AuditEvent",
          attrs: {
            choice: "abstain",
            voter_hash: voter_hash
          }
        }
      }
    };
  }

  // ... normal voting logic
}
```

Vote counting in HTTP handler:
```typescript
const votes = await env.DB.prepare(
  'SELECT choice, COUNT(*) as count FROM votes WHERE day=? GROUP BY choice'
).bind(day).all();

const voteA = votes.find(v => v.choice === 'a')?.count || 0;
const voteB = votes.find(v => v.choice === 'b')?.count || 0;
const abstain = votes.find(v => v.choice === 'abstain')?.count || 0;
const totalEngaged = voteA + voteB;

const engagement = totalEngaged > 0 ? totalEngaged / (voteA + voteB + abstain) : 0;
const variantAScore = totalEngaged > 0 ? voteA / totalEngaged : 0;
const variantBScore = totalEngaged > 0 ? voteB / totalEngaged : 0;

return Response.json({
  success: true,
  votes: {a: voteA, b: voteB, abstain: abstain},
  engagement: engagement,
  fitness: {
    variant_a: variantAScore * engagement,
    variant_b: variantBScore * engagement
  }
});
```

### Governance Value

✅ **Popularity measured where it matters**: Among engaged voters
✅ **Disengagement visible**: High abstain rate signals weakness
✅ **Fitness function precision**: Rewards engagement + preference clarity
✅ **Internet fitness challenge**: "This comic engaged 95% of voters and won 55/45" > "This comic engaged 60% and won 60/40"

---

## Summary: Design Positions Locked

| Challenge | Decision | Rationale |
|-----------|----------|-----------|
| **LLM Non-Determinism** | Accept variation. Content-hash per output. | Artifacts are instances, not specs. Lineage shows model+seed. |
| **Vote Dedup** | Hybrid: mutable votes table + immutable AuditEvent artifacts | Simple vote counts. Full audit trail. Change-of-mind tracked. |
| **HTTP Complexity** | Thin HTTP layer. Rhai handles governance. MCP transparent. | No breaking changes to API. Complexity encapsulated in workflow. |
| **Script Uniqueness** | Include day in artifact ID. Scripts are day-specific. | Dedup within day, separate across days. Lineage clarity. |
| **Provenance Immutability** | Annotations are NEW relations, not mutations. | Original provenance never lies. Chain via relations. |
| **Abstain Votes** | Visible. Excluded from ratio. Reported separately. | Engagement signal. Fitness function penalty for low engagement. |

---

## Code Generation Gates (Locked In)

Sub-agent 2 will patch `comic-generation.rhai` with:

1. ✅ Include day/model/seed in artifact IDs (Challenge 4)
2. ✅ record_vote() returns {variant: "Ok"|"Err"} with AuditEvent artifact (Challenge 2)
3. ✅ Abstain encoded as {choice: "abstain"} in AuditEvent (Challenge 6)
4. ✅ No changes to HTTP API contract (Challenge 3)
5. ✅ Provenance in relations, not mutations (Challenge 5)
6. ✅ Accept LLM variance; lineage shows model+seed (Challenge 1)

Code review will verify compliance with these positions.

