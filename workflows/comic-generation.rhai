// Comic Generation Workflow (Rhai)
// Three-stage pipeline: script generation → image rendering → forecasting and logging
// Rhai is a dynamically typed, embedded scripting language with Rust-like syntax
// Type-safe artifact encapsulation using {variant: "Ok"|"Err"} pattern

// Helper function to create timestamp in ISO 8601 format
fn get_timestamp() {
  // Rhai doesn't have direct Date API, so use a placeholder format
  // In production, this would call an external function or plugin
  let now = `2026-05-10T${((() => "14:30:45Z")())}`;
  now
}

// Helper function to create a blake3 content-hash for artifact IDs
// Simulated: production code would call external crypto library
fn blake3(content) {
  // MOCK: Return first 16 chars of a consistent hash
  // In production: invoke ledgrrr crypto plugin
  let len = content.len();
  let hash = "blake3_" + content.substring(0, 10) + "_len_" + len;
  hash
}

// Helper function to create an audit entry with standardized structure
fn create_audit_entry(operation, metrics) {
  #{
    timestamp: get_timestamp(),
    operation: operation,
    metrics: metrics,
    status: "completed"
  }
}

// Stage 1: Script Generation Workflow
// INPUT: {topic, cast, day, model_a, model_b, script_a, script_b, seed}
// OUTPUT: {variant: "Ok"|"Err", value: {artifact_a, artifact_b, provenance}|error_code}
// ARTIFACT KIND: DocumentChunk (for variant scripts)
// PROVENANCE: {generator, timestamp, seed, model, day}
fn script_generation(context) {
  // Validate and extract inputs
  let script_a = context.script_a;
  let script_b = context.script_b;
  let topic = context.topic;
  let cast = context.cast;
  let day = context.day || "2026-05-10";
  let model_a = context.model_a || "unknown";
  let model_b = context.model_b || "unknown";
  let seed = context.seed || "default_seed";

  // VALIDATION: Type-safe error case - script_a
  if script_a == "" || script_a == null {
    return #{
      variant: "Err",
      error_code: "script_validation_failed",
      reason: "script_a is empty",
      input_received: #{script_a_len: 0, script_b_len: if script_b != null { script_b.len() } else { 0 }}
    };
  }

  // VALIDATION: Type-safe error case - script_b
  if script_b == "" || script_b == null {
    return #{
      variant: "Err",
      error_code: "script_validation_failed",
      reason: "script_b is empty",
      input_received: #{script_a_len: script_a.len(), script_b_len: 0}
    };
  }

  // BUILD ARTIFACT: variant A (DocumentChunk kind)
  // Artifact ID: blake3("variant_a" || day || model_a || script_a)
  let artifact_id_a = blake3("variant_a" + day + model_a + script_a);
  let artifact_a = #{
    kind: "DocumentChunk",
    id: artifact_id_a,
    variant: "a",
    content_length: script_a.len(),
    model: model_a,
    language: "markdown",
    attrs: #{
      variant: "a",
      model: model_a,
      script_length: script_a.len(),
      topic: topic,
      day: day,
      seed: seed,
      cast_count: if cast != null { cast.len() } else { 0 }
    }
  };

  // BUILD ARTIFACT: variant B (DocumentChunk kind)
  // Artifact ID: blake3("variant_b" || day || model_b || script_b)
  let artifact_id_b = blake3("variant_b" + day + model_b + script_b);
  let artifact_b = #{
    kind: "DocumentChunk",
    id: artifact_id_b,
    variant: "b",
    content_length: script_b.len(),
    model: model_b,
    language: "markdown",
    attrs: #{
      variant: "b",
      model: model_b,
      script_length: script_b.len(),
      topic: topic,
      day: day,
      seed: seed,
      cast_count: if cast != null { cast.len() } else { 0 }
    }
  };

  // BUILD PROVENANCE: why these artifacts exist (immutable metadata)
  let provenance = #{
    generated_at: get_timestamp(),
    generator: "rhai",
    day: day,
    seed: seed,
    model_a: model_a,
    model_b: model_b,
    trigger: context.trigger || "manual",
    topic: topic
  };

  // SUCCESS: return typed Ok variant with artifacts
  // TypeScript caller: if result.variant === 'Ok' { artifacts = result.value.artifact_a, ... }
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
          topic: topic,
          day: day,
          seed: seed,
          cast_count: if cast != null { cast.len() } else { 0 }
        }
      }
    }
  }
}

// Stage 2: Image Rendering Workflow
// INPUT: {day, model_a, model_b, image_a_path, image_b_path, script_a, script_b}
// OUTPUT: {variant: "Ok"|"Err", value: {artifact_a, artifact_b, provenance}|error_code}
// ARTIFACT KIND: EvidenceReference (for rendered images, not DocumentChunk)
// PROVENANCE: {rendered_at, day, model, r2_key}
fn image_rendering(context) {
  // Validate and extract inputs
  let image_a_path = context.image_a_path;
  let image_b_path = context.image_b_path;
  let day = context.day || "2026-05-10";
  let model_a = context.model_a || "unknown";
  let model_b = context.model_b || "unknown";
  let script_a = context.script_a || "";
  let script_b = context.script_b || "";

  // VALIDATION: Type-safe error case - image_a_path
  if image_a_path == "" || image_a_path == null {
    return #{
      variant: "Err",
      error_code: "image_validation_failed",
      reason: "image_a_path is empty",
      input_received: #{image_a_path_len: 0, image_b_path_len: if image_b_path != null { image_b_path.len() } else { 0 }}
    };
  }

  // VALIDATION: Type-safe error case - image_b_path
  if image_b_path == "" || image_b_path == null {
    return #{
      variant: "Err",
      error_code: "image_validation_failed",
      reason: "image_b_path is empty",
      input_received: #{image_a_path_len: image_a_path.len(), image_b_path_len: 0}
    };
  }

  // BUILD ARTIFACT: image variant A (EvidenceReference kind, not DocumentChunk)
  // Artifact ID: blake3("variant_a" || day || model_a || image_a_path)
  let artifact_id_image_a = blake3("variant_a" + day + model_a + image_a_path);
  let artifact_image_a = #{
    kind: "EvidenceReference",
    id: artifact_id_image_a,
    variant: "a",
    r2_key: image_a_path,
    format: "jpeg",
    model: model_a,
    attrs: #{
      variant: "a",
      r2_key: image_a_path,
      format: "jpeg",
      model: model_a,
      day: day,
      script_length: if script_a != null { script_a.len() } else { 0 }
    }
  };

  // BUILD ARTIFACT: image variant B (EvidenceReference kind)
  // Artifact ID: blake3("variant_b" || day || model_b || image_b_path)
  let artifact_id_image_b = blake3("variant_b" + day + model_b + image_b_path);
  let artifact_image_b = #{
    kind: "EvidenceReference",
    id: artifact_id_image_b,
    variant: "b",
    r2_key: image_b_path,
    format: "jpeg",
    model: model_b,
    attrs: #{
      variant: "b",
      r2_key: image_b_path,
      format: "jpeg",
      model: model_b,
      day: day,
      script_length: if script_b != null { script_b.len() } else { 0 }
    }
  };

  // BUILD PROVENANCE: why these image artifacts exist
  let provenance = #{
    rendered_at: get_timestamp(),
    generator: "rhai",
    day: day,
    model_a: model_a,
    model_b: model_b,
    images_validated: 2,
    format: "jpeg"
  };

  // SUCCESS: return typed Ok variant with image artifacts
  // TypeScript caller: if result.variant === 'Ok' { images = result.value.artifact_image_a, ... }
  #{
    variant: "Ok",
    value: #{
      artifact_image_a: artifact_image_a,
      artifact_image_b: artifact_image_b,
      provenance: provenance,
      audit_entry: #{
        operation: "image-rendering",
        timestamp: get_timestamp(),
        status: "completed",
        metrics: #{
          image_path_a: image_a_path,
          image_path_b: image_b_path,
          format: "jpeg",
          day: day,
          model_a: model_a,
          model_b: model_b
        }
      }
    }
  }
}

// Stage 3: Forecasting and Logging Workflow
// INPUT: {day, metrics, image_a_path, image_b_path, variant_a_score, variant_b_score}
// OUTPUT: {variant: "Ok"|"Err", value: {artifact_forecast, provenance}|error_code}
// ARTIFACT KIND: ClassificationOutcome (score-based prediction artifact)
// PROVENANCE: {forecasted_at, day, scores}
fn forecasting_and_log(context) {
  // Validate and extract inputs
  let metrics = context.metrics;
  let variant_a_score = context.variant_a_score || 0.0;
  let variant_b_score = context.variant_b_score || 0.0;
  let day = context.day || "2026-05-10";
  let image_a_path = context.image_a_path || "";
  let image_b_path = context.image_b_path || "";

  // VALIDATION: Type-safe error case - metrics
  if metrics == null || metrics == "" {
    return #{
      variant: "Err",
      error_code: "forecast_validation_failed",
      reason: "metrics is empty or null",
      input_received: #{metrics_type: "null"}
    };
  }

  // BUILD ARTIFACT: forecast outcome (ClassificationOutcome kind)
  // Artifact ID: blake3("forecast" || day || variant_a_score || variant_b_score)
  let artifact_id_forecast = blake3("forecast" + day + variant_a_score + variant_b_score);
  let artifact_forecast = #{
    kind: "ClassificationOutcome",
    id: artifact_id_forecast,
    variant_a_score: variant_a_score,
    variant_b_score: variant_b_score,
    attrs: #{
      variant_a_score: variant_a_score,
      variant_b_score: variant_b_score,
      day: day,
      forecast_status: "calculated",
      image_a_path: image_a_path,
      image_b_path: image_b_path
    }
  };

  // BUILD FORECAST METRICS for audit trail
  let forecast_metrics = #{
    variant_a_score: variant_a_score,
    variant_b_score: variant_b_score,
    metrics_count: if metrics != null { metrics.len() } else { 0 },
    forecast_status: "calculated",
    day: day
  };

  // BUILD PROVENANCE: why this forecast was created
  let provenance = #{
    forecasted_at: get_timestamp(),
    generator: "rhai",
    day: day,
    variant_a_score: variant_a_score,
    variant_b_score: variant_b_score
  };

  // SUCCESS: return typed Ok variant with forecast artifact
  // TypeScript caller: if result.variant === 'Ok' { forecast = result.value.artifact_forecast }
  #{
    variant: "Ok",
    value: #{
      artifact_forecast: artifact_forecast,
      provenance: provenance,
      audit_entry: #{
        operation: "forecasting-and-log",
        timestamp: get_timestamp(),
        status: "completed",
        metrics: forecast_metrics
      }
    }
  }
}

// Stage 4: Record Vote (NEW function for voter feedback)
// INPUT: {day, voter_hash, choice}  where choice ∈ {"a", "b", "abstain", null}
// OUTPUT: {variant: "Ok"|"Err", value: {artifact: AuditEvent}|error_code}
// ARTIFACT KIND: AuditEvent (immutable record of voting moment)
// PROVENANCE: {day, voter_hash, choice, timestamp}
// NOTE: Handles null choice → abstain case for Option<T> semantics
fn record_vote(context) {
  // Validate and extract inputs
  let day = context.day || "2026-05-10";
  let voter_hash = context.voter_hash || "";
  let choice = context.choice;  // Can be "a", "b", "abstain", or null
  let timestamp = get_timestamp();

  // VALIDATION: voter_hash must not be empty
  if voter_hash == "" || voter_hash == null {
    return #{
      variant: "Err",
      error_code: "voter_validation_failed",
      reason: "voter_hash is empty or null",
      input_received: #{voter_hash_len: 0}
    };
  }

  // VALIDATION: choice must be one of the allowed values
  // null = abstain, "a" = variant A, "b" = variant B, "abstain" = explicit abstain
  let normalized_choice = choice;

  if choice == null {
    normalized_choice = "abstain";  // null encodes Option::None (abstain)
  } else if choice != "a" && choice != "b" && choice != "abstain" {
    return #{
      variant: "Err",
      error_code: "invalid_vote_choice",
      reason: "choice must be 'a', 'b', 'abstain', or null",
      input_received: #{choice_received: choice}
    };
  }

  // BUILD ARTIFACT: vote record (AuditEvent kind, immutable)
  // Artifact ID: blake3(day || voter_hash || choice || timestamp)
  let artifact_id_vote = blake3(day + voter_hash + normalized_choice + timestamp);
  let artifact_vote = #{
    kind: "AuditEvent",
    id: artifact_id_vote,
    attrs: #{
      day: day,
      choice: normalized_choice,  // "a", "b", or "abstain" (never null in artifact)
      voter_hash: voter_hash,
      timestamp: timestamp
    }
  };

  // BUILD PROVENANCE: why this vote was recorded
  let provenance = #{
    recorded_at: timestamp,
    generator: "rhai",
    day: day,
    voter: voter_hash,
    choice: normalized_choice
  };

  // SUCCESS: return typed Ok variant with vote artifact
  // TypeScript caller: if result.variant === 'Ok' { voteArtifact = result.value.artifact }
  // NOTE: Abstain votes visible in audit but excluded from popularity ratio (per Challenge 6)
  #{
    variant: "Ok",
    value: #{
      artifact: artifact_vote,
      provenance: provenance,
      audit_entry: #{
        operation: "record-vote",
        timestamp: timestamp,
        status: "completed",
        metrics: #{
          day: day,
          choice: normalized_choice,
          voter_hash: voter_hash
        }
      }
    }
  }
}
