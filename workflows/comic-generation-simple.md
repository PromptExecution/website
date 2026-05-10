# Comic Generation Workflow - Simple Diagram

## Quick Reference

### State Diagram (Simple)

```mermaid
stateDiagram-v2
    [*] --> ScriptGeneration
    ScriptGeneration --> ImageRendering : success
    ScriptGeneration --> Error : validation_failure
    ImageRendering --> ForecastingAndLog : success
    ImageRendering --> Error : validation_failure
    ForecastingAndLog --> [*] : success
    ForecastingAndLog --> Error : validation_failure
    Error --> [*] : error_logged
```

### Flowchart Diagram (Alternative)

```mermaid
flowchart TD
    Start([Start Comic Generation]) --> Script["Script Generation<br/>(Validate Scripts)"]
    Script -->|Success| Image["Image Rendering<br/>(Validate Images)"]
    Script -->|Error| ErrorScript["Log Error<br/>script validation failed"]
    Image -->|Success| Forecast["Forecasting & Log<br/>(Analyze & Record)"]
    Image -->|Error| ErrorImage["Log Error<br/>image validation failed"]
    Forecast -->|Success| End([Workflow Complete])
    Forecast -->|Error| ErrorForecast["Log Error<br/>forecast failed"]
    ErrorScript --> End
    ErrorImage --> End
    ErrorForecast --> End
```

### Sequence Diagram (Execution)

```mermaid
sequenceDiagram
    participant Client
    participant ScriptGen as Script Gen
    participant ImageRen as Image Render
    participant Forecast as Forecast & Log
    
    Client ->> ScriptGen: send context (script_a, script_b, ...)
    ScriptGen ->> ScriptGen: validate inputs
    ScriptGen ->> ScriptGen: calculate metrics
    ScriptGen -->> Client: audit_entry + success
    
    Client ->> ImageRen: send context (image_path_a, image_path_b)
    ImageRen ->> ImageRen: validate inputs
    ImageRen ->> ImageRen: calculate metrics
    ImageRen -->> Client: audit_entry + success
    
    Client ->> Forecast: send context (metrics, image_paths, scores)
    Forecast ->> Forecast: validate inputs
    Forecast ->> Forecast: calculate forecast
    Forecast -->> Client: audit_entry + success
```

### Input/Output Summary

| Stage | Input | Output |
|-------|-------|--------|
| **ScriptGeneration** | `{script_a, script_b, topic, cast}` | `{success, audit_entry}` |
| **ImageRendering** | `{image_path_a, image_path_b}` | `{success, audit_entry}` |
| **ForecastingAndLog** | `{metrics, image_paths, variant_scores}` | `{success, audit_entry}` |

### Validation Rules

```
ScriptGeneration:
  ✓ script_a not empty
  ✓ script_b not empty

ImageRendering:
  ✓ image_path_a not empty
  ✓ image_path_b not empty

ForecastingAndLog:
  ✓ metrics not empty
  ✓ image_paths not empty
```

### Audit Entry Structure

```json
{
  "timestamp": "2026-05-10T14:30:45Z",
  "operation": "script-generation",
  "metrics": {
    "script_a_length": 1250,
    "script_b_length": 1340,
    "topic": "Testing",
    "cast_count": 3,
    "validation_status": "passed"
  },
  "status": "completed"
}
```

---

**For detailed documentation, see:** `comic-generation-mermaid.md`
