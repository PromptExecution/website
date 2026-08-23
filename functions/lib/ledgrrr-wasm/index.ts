/**
 * Ledgrrr WASM Module - Workflow Compiler
 *
 * High-level TypeScript API for compiling Ledgrrr workflow definitions to:
 * - Rhai state machine code
 * - Mermaid diagrams
 * - Rust enums
 *
 * All operations are pure data transformations with zero I/O.
 */

import init, {
  CompiledWorkflow,
  compile_workflow,
  validate_workflow,
  workflow_to_mermaid,
  workflow_to_rhai,
  workflow_to_rust_enum,
} from "./ledger_workflow_wasm.js";

// Re-export the wasm module initialization
export { init };

/**
 * Workflow state definition
 */
export interface WorkflowState {
  id: string;
  initial?: boolean;
  terminal?: boolean;
  is_error?: boolean;
}

/**
 * Workflow transition definition
 */
export interface WorkflowTransition {
  from: string;
  event: string;
  to: string;
  guard?: string;
  else?: string; // Maps to else_to in Rust
}

/**
 * Workflow definition (TOML JSON format)
 */
export interface WorkflowDefinition {
  name: string;
  version: string;
  state: WorkflowState[];
  transition: WorkflowTransition[];
}

/**
 * Compiled workflow output in all formats
 */
export interface CompiledOutput {
  name: string;
  mermaid: string;
  rhai: string;
  rust_enum: string;
}

/**
 * Initialize the WASM module asynchronously
 */
let isInitialized = false;

export async function initWasm(): Promise<void> {
  if (!isInitialized) {
    // The wasm module will auto-initialize when imported
    // but we'll call init() explicitly to ensure it's ready
    await init();
    isInitialized = true;
  }
}

/**
 * Compile a workflow definition to all supported formats
 *
 * @param workflow The workflow definition to compile
 * @returns Compiled workflow in all formats
 * @throws Error if the workflow is invalid
 */
export function compileWorkflow(
  workflow: WorkflowDefinition
): CompiledOutput {
  const jsonStr = JSON.stringify(workflow);
  const compiled: CompiledWorkflow = compile_workflow(jsonStr);

  return {
    name: compiled.name,
    mermaid: compiled.mermaid,
    rhai: compiled.rhai,
    rust_enum: compiled.rust_enum,
  };
}

/**
 * Validate a workflow definition
 *
 * @param workflow The workflow to validate
 * @throws Error if the workflow is invalid
 */
export function validateWorkflow(workflow: WorkflowDefinition): void {
  const jsonStr = JSON.stringify(workflow);
  validate_workflow(jsonStr);
}

/**
 * Compile a workflow to Mermaid diagram format
 *
 * @param workflow The workflow definition
 * @returns Mermaid stateDiagram-v2 syntax
 */
export function toMermaid(workflow: WorkflowDefinition): string {
  const jsonStr = JSON.stringify(workflow);
  return workflow_to_mermaid(jsonStr);
}

/**
 * Compile a workflow to Rhai state machine code
 *
 * @param workflow The workflow definition
 * @returns Rhai script with next_state() function
 */
export function toRhai(workflow: WorkflowDefinition): string {
  const jsonStr = JSON.stringify(workflow);
  return workflow_to_rhai(jsonStr);
}

/**
 * Compile a workflow to a Rust enum definition
 *
 * @param workflow The workflow definition
 * @returns Rust enum code for PipelineState
 */
export function toRustEnum(workflow: WorkflowDefinition): string {
  const jsonStr = JSON.stringify(workflow);
  return workflow_to_rust_enum(jsonStr);
}

/**
 * Example workflow: ledger ingestion pipeline
 */
export const exampleWorkflow: WorkflowDefinition = {
  name: "ledger_ingest",
  version: "1",
  state: [
    { id: "Ingested", initial: true },
    { id: "Validating" },
    { id: "Classifying" },
    { id: "Reconciling" },
    { id: "Committed", terminal: true },
    { id: "NeedsReview", terminal: true, is_error: true },
  ],
  transition: [
    { from: "Ingested", event: "SHAPE_DETECTED", to: "Validating" },
    { from: "Validating", event: "PASS", to: "Classifying" },
    {
      from: "Validating",
      event: "FAIL",
      to: "NeedsReview",
      guard: "ctx.repair_attempts < 2",
    },
    { from: "Classifying", event: "HIGH_CONF", to: "Reconciling" },
    { from: "Classifying", event: "LOW_CONF", to: "NeedsReview" },
    { from: "Reconciling", event: "XERO_OK", to: "Committed" },
  ],
};
