# Sub-Agent 2: Code Generation (ONLY IF BOUNCER REVIEW PASSES)

**Prerequisites**: Sub-agent 1 must pass bouncer review (all 6 questions answered correctly).

**Operator Gate**: First-mate (operator role) will validate answers before proceeding.

---

## Task: Patch comic-generation.rhai for Type-Safe Artifacts

**Scope**: ~50 lines of Rhai code refactoring. No new files. No schema changes.

### Input
- `workflows/comic-generation.rhai` (current file with {success: bool} pattern)
- Bouncer review answers (your understanding of ontology + types)

### Output
- `workflows/comic-generation.rhai` (patched with {variant: "Ok"|"Err"} pattern)
- Inline code comments showing:
  - Artifact structure emitted
  - Type signatures expected
  - Provenance metadata collected

### Changes Required

#### Stage 1: script_generation() - BEFORE
```rhai
fn script_generation(context) {
  if script_a == "" { return #{success: false, error: "script_a is empty"} }
  if script_b == "" { return #{success: false, error: "script_b is empty"} }
  let metrics = #{script_a_length: script_a.len(), ...};
  let audit_entry = create_audit_entry("script-generation", metrics);
  #{success: true, audit_entry: audit_entry}
}
```

#### Stage 1: script_generation() - AFTER
```rhai
fn script_generation(context) {
  // INPUT: {script_a, script_b, topic, cast}
  // OUTPUT: {variant: "Ok"|"Err", value|error_code}
  // ARTIFACT: Artifact(kind: DocumentChunk, variant: "a"|"b", ...)

  let script_a = context.script_a;
  let script_b = context.script_b;

  // VALIDATION: Type-safe error case
  if script_a == "" || script_a == null {
    return #{
      variant: "Err",
      error_code: "script_validation_failed",
      reason: "script_a is empty",
      input_received: #{script_a_len: 0, script_b_len: script_b.len()}
    };
  }

  if script_b == "" || script_b == null {
    return #{
      variant: "Err",
      error_code: "script_validation_failed",
      reason: "script_b is empty",
      input_received: #{script_a_len: script_a.len(), script_b_len: 0}
    };
  }

  // BUILD ARTIFACT: variant A
  let artifact_a = #{
    kind: "DocumentChunk",
    variant: "a",
    content_length: script_a.len(),
    model: context.model_a || "unknown",
    language: "markdown",
    attrs: #{
      variant: "a",
      model: context.model_a || "unknown",
      script_length: script_a.len(),
      topic: context.topic,
      cast_count: if context.cast != null { context.cast.len() } else { 0 }
    }
  };

  // BUILD ARTIFACT: variant B
  let artifact_b = #{
    kind: "DocumentChunk",
    variant: "b",
    content_length: script_b.len(),
    model: context.model_b || "unknown",
    language: "markdown",
    attrs: #{
      variant: "b",
      model: context.model_b || "unknown",
      script_length: script_b.len(),
      topic: context.topic,
      cast_count: if context.cast != null { context.cast.len() } else { 0 }
    }
  };

  // BUILD PROVENANCE: why these artifacts exist
  let provenance = #{
    generated_at: get_timestamp(),
    trigger: context.trigger || "manual",
    input_topic: context.topic,
    input_cast: if context.cast != null { context.cast.len() } else { 0 }
  };

  // SUCCESS: return typed Ok variant
  #{
    variant: "Ok",
    value: #{
      artifact_a: artifact_a,
      artifact_b: artifact_b,
      provenance: provenance,
      audit_entry: #{
        operation: "script-generation",
        timestamp: get_timestamp(),
        status: "completed",
        metrics: #{
          variant_a_length: script_a.len(),
          variant_b_length: script_b.len(),
          topic: context.topic,
          cast_count: if context.cast != null { context.cast.len() } else { 0 }
        }
      }
    }
  }
}
```

#### Stage 2: image_rendering() - BEFORE
```rhai
fn image_rendering(context) {
  if image_path_a == "" { return #{success: false, error: "image_path_a is empty"} }
  if image_path_b == "" { return #{success: false, error: "image_path_b is empty"} }
  let metrics = #{image_path_a: image_path_a, ...};
  let audit_entry = create_audit_entry("image-rendering", metrics);
  #{success: true, audit_entry: audit_entry}
}
```

#### Stage 2: image_rendering() - AFTER
```rhai
fn image_rendering(context) {
  // INPUT: {script_a, script_b, image_a_path, image_b_path}
  // OUTPUT: {variant: "Ok"|"Err", value|error}
  // ARTIFACT: Artifact(kind: EvidenceReference, variant: "a"|"b", r2_key: "...")

  let image_path_a = context.image_a_path;
  let image_path_b = context.image_b_path;

  // VALIDATION
  if image_path_a == "" || image_path_a == null {
    return #{
      variant: "Err",
      error_code: "image_validation_failed",
      reason: "image_path_a is empty"
    };
  }

  if image_path_b == "" || image_path_b == null {
    return #{
      variant: "Err",
      error_code: "image_validation_failed",
      reason: "image_path_b is empty"
    };
  }

  // BUILD ARTIFACT: image variant A (EvidenceReference)
  let artifact_image_a = #{
    kind: "EvidenceReference",
    variant: "a",
    r2_key: image_path_a,
    format: "jpeg",
    attrs: #{
      variant: "a",
      r2_key: image_path_a,
      format: "jpeg",
      model: context.model_a || "unknown"
    }
  };

  // BUILD ARTIFACT: image variant B
  let artifact_image_b = #{
    kind: "EvidenceReference",
    variant: "b",
    r2_key: image_path_b,
    format: "jpeg",
    attrs: #{
      variant: "b",
      r2_key: image_path_b,
      format: "jpeg",
      model: context.model_b || "unknown"
    }
  };

  // SUCCESS
  #{
    variant: "Ok",
    value: #{
      artifact_image_a: artifact_image_a,
      artifact_image_b: artifact_image_b,
      provenance: #{
        rendered_at: get_timestamp(),
        images_validated: 2,
        format: "jpeg"
      },
      audit_entry: #{
        operation: "image-rendering",
        timestamp: get_timestamp(),
        status: "completed",
        metrics: #{
          image_path_a: image_path_a,
          image_path_b: image_path_b,
          format: "jpeg"
        }
      }
    }
  }
}
```

#### Stage 3: forecasting_and_log() - BEFORE
```rhai
fn forecasting_and_log(context) {
  if metrics == null { return #{success: false, error: "metrics is empty"} }
  let forecast_metrics = #{...};
  let audit_entry = create_audit_entry("forecasting-and-log", forecast_metrics);
  #{success: true, audit_entry: audit_entry}
}
```

#### Stage 3: forecasting_and_log() - AFTER
```rhai
fn forecasting_and_log(context) {
  // INPUT: {metrics, image_a_path, image_b_path, variant_a_score, variant_b_score, day}
  // OUTPUT: {variant: "Ok"|"Err", value|error}
  // ARTIFACT: Artifact(kind: ClassificationOutcome, score: f32, ...)

  let metrics = context.metrics;

  // VALIDATION
  if metrics == null || metrics == "" {
    return #{
      variant: "Err",
      error_code: "forecast_validation_failed",
      reason: "metrics is empty or null"
    };
  }

  // BUILD ARTIFACT: forecast outcome (ClassificationOutcome)
  let artifact_forecast = #{
    kind: "ClassificationOutcome",
    variant_a_score: context.variant_a_score || 0.0,
    variant_b_score: context.variant_b_score || 0.0,
    attrs: #{
      variant_a_score: context.variant_a_score || 0.0,
      variant_b_score: context.variant_b_score || 0.0,
      day: context.day,
      forecast_status: "calculated"
    }
  };

  // BUILD METRICS FOR AUDIT
  let forecast_metrics = #{
    variant_a_score: context.variant_a_score || 0.0,
    variant_b_score: context.variant_b_score || 0.0,
    metrics_count: if metrics != null { metrics.len() } else { 0 },
    forecast_status: "calculated"
  };

  // SUCCESS
  #{
    variant: "Ok",
    value: #{
      artifact_forecast: artifact_forecast,
      provenance: #{
        forecasted_at: get_timestamp(),
        day: context.day
      },
      audit_entry: #{
        operation: "forecasting-and-log",
        timestamp: get_timestamp(),
        status: "completed",
        metrics: forecast_metrics
      }
    }
  }
}
```

### Acceptance Criteria

1. ✅ All 3 functions return `{variant: "Ok"|"Err"|"None", value|error_code, ...}`
2. ✅ No `{success: true/false}` patterns remain
3. ✅ Artifact structures emitted match ArtifactKind enum (DocumentChunk, EvidenceReference, ClassificationOutcome)
4. ✅ Provenance metadata captured (why relation exists)
5. ✅ Inline comments explain:
   - INPUT shape expected
   - OUTPUT shape returned
   - ARTIFACT kind and variant emitted
6. ✅ Code compiles in Rhai (no syntax errors)
7. ✅ Examples given for how TypeScript would parse result

### Test Strategy (After Code Written)

Create small CLI/MCP test:
```bash
b00t ledgrrr invoke script_generation \
  --script_a "Simon walks into a bar." \
  --script_b "Robot: *error noise*" \
  --topic "AI humor" \
  --cast '["Simon","Robot"]'

# Expected output:
# {
#   variant: "Ok",
#   value: {
#     artifact_a: {kind: "DocumentChunk", variant: "a", ...},
#     artifact_b: {kind: "DocumentChunk", variant: "b", ...},
#     provenance: {...},
#     audit_entry: {...}
#   }
# }
```

---

## Bouncer Final Gate

After sub-agent submits code, operator will ask:

1. **Show me the artifact_a structure**. Does it match ArtifactKind::DocumentChunk?
2. **Trace the lineage**: How does artifact_a flow into image_a?
3. **Show an error case**. When does function return `{variant: "Err"}`?
4. **What if script_a and script_b are identical?** Does artifact ID change? (It shouldn't—content-hash)
5. **If this runs twice with same inputs**, do we get new artifacts or same IDs? (Answer: same IDs—deterministic)

Sub-agent cannot move to merge without answering these correctly.

