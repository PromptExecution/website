# Sub-Agent Training: Ledgrrr Type-Safe Comic Encapsulation

**Operator Role**: Ensure all code-writing sub-agents pass bouncer adversarial review on these concepts.

## Core Principle (Memorize This)

> **It's not what you can ADD, but what you can TAKE AWAY.**
>
> Comic construction uses EXISTING Ledgrrr types. Zero new types. Zero new database schema.

---

## Part 1: The Ontology (30 min study)

### ArtifactKind Enum (Canonical Types)
- **ModelProposal**: AI-generated proposals (THIS IS YOUR COMIC)
- **DocumentChunk**: Portions of documents (THIS IS YOUR SCRIPT VARIANT)
- **EvidenceReference**: Referenced evidence (THIS IS YOUR IMAGE)
- **AuditEvent**: Immutable audit record
- **ValidationIssue**: Problems encountered
- **ClassificationOutcome**: Classification result

### RelationKind Enum (How Artifacts Connect)
- **DerivedFrom**: "B came from A" (THIS IS YOUR LINEAGE)
- **ClassifiedAs**: "A was classified as C"
- **ValidatedBy**: "A was validated by audit"
- **ReviewedByOperator**: "operator reviewed A"
- **ProposedByModel**: "model proposed B"

### Artifact Structure
```
Artifact {
  id: String,              // blake3 content-hash (deterministic)
  kind: ArtifactKind,      // enum (one of 25 kinds)
  attrs: BTreeMap<String, String>  // schemaless attrs (day, variant, model, etc)
}
```

### Relation Structure
```
Relation {
  id: String,              // content-hash of from+to+relation+provenance
  from: String,            // source artifact id
  to: String,              // target artifact id
  relation: String,        // relation kind name
  provenance: BTreeMap<String, String>  // audit trail (why this relation exists)
}
```

**KEY INSIGHT**: Artifacts + Relations are immutable, content-addressed, deterministic. Perfect for governance.

---

## Part 2: Comic Construction as Artifacts

### Current (WRONG - What We're Leaving Behind)
```
Day 1: Fetch /api/today
Day 2: Store in comics table (day, script_a, script_b, r2_key_a, r2_key_b, audit_log_render)
Day 3: Vote on variant in votes table (day, variant, voter_hash)
Problem: No unified lineage, no artifact traceability, voting is a second-class citizen
```

### Future (RIGHT - Type-Safe Encapsulation)
```
Artifact 1 (Comic):
  kind: ModelProposal
  id: hash(day || topic || cast)
  attrs: {
    day: "2026-05-10",
    topic: "LLM humor",
    cast: "Simon,Robot,Human",
    status: "generated"
  }

Artifact 2 (ScriptVariantA):
  kind: DocumentChunk
  id: hash("variant_a" || script_text)
  attrs: {
    variant: "a",
    model: "Gemma4",
    length: "1024",
    prompt_hash: "abc123..."
  }

Artifact 3 (ImageVariantA):
  kind: EvidenceReference
  id: hash("image" || r2_key_a)
  attrs: {
    variant: "a",
    r2_key: "comics/2026-05-10/variant-a.jpg",
    model: "FLUX",
    format: "jpeg"
  }

Artifact 4 (VoteRecordA):
  kind: AuditEvent
  id: hash(day || voter_hash || "a")
  attrs: {
    day: "2026-05-10",
    choice: "a",  // "a", "b", or ABSENT (None)
    voter_hash: "sha256(...)"
  }

Relations:
  Comic --(DerivedFrom)--> ScriptVariantA
  ScriptVariantA --(DerivedFrom)--> ImageVariantA
  Comic --(ReviewedByOperator)--> VoteRecordA
```

**Why This Works:**
- Comic is a first-class Artifact, not a database row
- All lineage is traceable via Relations + Provenance
- Voting is an AuditEvent, not a second-class citizen
- No schema changes—everything uses existing tables
- Deterministic hashing ensures idempotency

---

## Part 3: Type Safety in Rhai (Encode Option/Result)

### Current (WRONG - What We're Leaving Behind)
```rhai
fn script_generation(context) {
  if validation_failed {
    return #{success: false, error: "scripts empty"}
  }
  return #{success: true, audit_entry: {...}}
}
```
Problem: Boolean success, no type safety, loses error context, looks like HTTP response

### Future (RIGHT - Typed Variants)
```rhai
// SUCCESS CASE: Ok(ScriptVariantArtifacts)
fn script_generation(context) {
  if script_a.len() == 0 || script_b.len() == 0 {
    return #{
      variant: "Err",
      error_code: "script_validation_failed",
      reason: "script_a or script_b is empty"
    };
  }

  return #{
    variant: "Ok",
    value: #{
      artifact: #{
        kind: "DocumentChunk",
        variant_a: context.script_a,
        variant_b: context.script_b,
        attrs: #{
          model_a: "Gemma4",
          model_b: "Qwen3"
        }
      }
    }
  };
}

// USAGE IN LEDGRRR:
// result = invokeWorkflow('script_generation', {...})
// match result.variant {
//   "Ok" => artifact_id = store_artifact(result.value.artifact)
//   "Err" => log_error(result.reason), request_review()
// }
```

**Typed Variant Pattern:**
- `{variant: "Ok", value: T}` — Success, contains typed value
- `{variant: "Err", error_code, reason}` — Failure, contains error info
- `{variant: "None"}` — Absence (for optional voting)

---

## Part 4: Voting as Option<Variant>

### Current (WRONG - What We're Leaving Behind)
```typescript
POST /api/vote { day: "2026-05-10", variant: "a" | "b" }
// No abstain option, voting is not part of workflow, Option type implicit
```

### Future (RIGHT - Type-Safe Voting)
```rhai
fn record_vote(comic_id, voter_hash, vote_choice) {
  // vote_choice is Option<String> encoded as Rhai variant:
  // {variant: "Some", value: "a"}
  // {variant: "Some", value: "b"}
  // {variant: "None"}              <- Abstain (neither is funny)

  if vote_choice.variant == "None" {
    return #{
      variant: "Ok",
      value: #{
        artifact: #{
          kind: "AuditEvent",
          attrs: #{
            choice: "abstain",
            voter_hash: voter_hash,
            reason: "neither variant funny"
          }
        }
      }
    };
  }

  if vote_choice.variant == "Some" {
    let choice = vote_choice.value;
    if choice != "a" && choice != "b" {
      return #{
        variant: "Err",
        error_code: "invalid_choice",
        reason: "vote must be 'a', 'b', or None"
      };
    }

    return #{
      variant: "Ok",
      value: #{
        artifact: #{
          kind: "AuditEvent",
          attrs: #{
            choice: choice,
            voter_hash: voter_hash
          }
        }
      }
    };
  }

  // Should never reach here (exhaustive match)
  return #{variant: "Err", error_code: "unreachable"};
}
```

---

## Part 5: MCP Invocation (How Workflows Are Called)

### From Frontend (TypeScript)
```typescript
import { invokeWorkflow } from './ledgrrr-mcp-client.ts';

// Call script generation workflow
const scriptResult = await invokeWorkflow('script_generation', {
  topic: "LLM humor",
  cast: ["Simon", "Robot", "Human"],
  // Rhai function will validate and return {variant: "Ok"|"Err", ...}
});

if (scriptResult.variant === 'Ok') {
  const artifactId = await storeArtifact(scriptResult.value.artifact);
  // Continue to image generation
} else {
  console.error('Script generation failed:', scriptResult.reason);
  // Request operator review
}
```

### From CLI (Testing)
```bash
b00t ledgrrr invoke script_generation \
  --topic "LLM humor" \
  --cast '["Simon","Robot","Human"]'
```

Both use same Rhai code. MCP is subprocess interface, not library.

---

## Part 6: Bouncer Adversarial Review Questions

Sub-agents must answer these BEFORE writing code:

1. **Ontology Mapping**
   - "What ArtifactKind represents a Comic? Why that kind?"
   - "What RelationKind represents 'script became image'? Why?"
   - "Where does voting fit in the artifact model? As what kind?"

2. **Type Safety**
   - "Why do we use {variant: 'Ok'|'Err'} instead of {success: bool}?"
   - "How is Option<T> encoded in Rhai? Show an example."
   - "What happens if Rhai returns both 'Ok' and 'Err'? Is it possible? Why/why not?"

3. **Schema Changes**
   - "Do we need new database tables for artifacts? Why/why not?"
   - "Do we need new columns in comics table? Why/why not?"
   - "Where does the artifact data live? What's the table?"

4. **Invocation & Testing**
   - "How do you call a Rhai workflow from TypeScript?"
   - "How do you test a workflow from CLI?"
   - "What does invokeWorkflow() return? What shape?"

5. **Determinism & Hashing**
   - "Why is artifact ID a content-hash, not a UUID?"
   - "What happens if you run script_generation twice with same inputs?"
   - "Can two artifacts have the same ID?"

6. **Lineage & Governance**
   - "Trace the full artifact lineage: Comic → Script → Image → Vote"
   - "If an image changes, does the Comic ID change? Why/why not?"
   - "Where is the audit trail stored? In which table?"

---

## Part 7: Forbidden Patterns (Bouncer Will Reject These)

❌ **Do NOT do this:**
- Add new ArtifactKind for Comic (use ModelProposal)
- Add new RelationKind for ScriptLineage (use DerivedFrom)
- Create comics_artifacts or comic_ontology tables (use existing tables)
- Use {success: true/false} pattern (use {variant: "Ok"|"Err"})
- Store vote in votes table AND artifacts (choose one, prefer artifacts for governance)
- Add columns to comics table (move data to Artifact attrs)
- Pass untyped JSON context to Rhai (annotate schema in comments)

✅ **Do this instead:**
- Use existing ArtifactKind + RelationKind enums
- Store all governance artifacts in ontology_artifacts table
- Return typed variant unions from Rhai
- Emit Artifact structures that serialize cleanly
- One vote record = one AuditEvent artifact
- All metadata lives in Artifact.attrs (BTreeMap)
- Rhai context is documented with expected shapes

---

## Summary: What The Sub-Agent Will Do

After passing bouncer review, the sub-agent will:

1. **Patch `comic-generation.rhai`** (50 lines)
   - Replace {success: bool} with {variant: "Ok"|"Err"|"None"}
   - Emit Artifact structures instead of generic maps
   - Document Rhai function signatures with expected types

2. **Create small test script** (100 lines, MCP or CLI)
   - Invoke script_generation workflow
   - Parse {variant: "Ok"|"Err"} response
   - Verify artifact structure is valid

3. **Document artifact schema** (in code comments)
   - Show full Artifact examples for each step
   - Show Relation provenance examples

That's it. Zero new tables, zero new types, zero new database schema.

---

## Training Complete When Sub-Agent Can:

- [ ] Diagram full artifact lineage (Comic → Scripts → Images → Votes)
- [ ] Explain why ModelProposal (not Comic) is used
- [ ] Write a typed variant union in Rhai from scratch
- [ ] Trace how a vote becomes an AuditEvent artifact
- [ ] Identify what goes in Artifact.attrs vs. Relation.provenance
- [ ] Answer all 6 bouncer questions correctly (explaining reasoning)
- [ ] Predict what happens if you run script_generation twice (idempotency via content-hash)
