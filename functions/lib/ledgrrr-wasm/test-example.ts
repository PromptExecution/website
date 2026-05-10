/**
 * Example TypeScript test file demonstrating the ledgrrr-wasm API
 *
 * To run this test with Deno:
 * deno run --allow-read test-example.ts
 *
 * To run in Node.js, ensure webpack or esbuild can handle the WASM import.
 */

import {
  initWasm,
  compileWorkflow,
  validateWorkflow,
  toMermaid,
  toRhai,
  toRustEnum,
  exampleWorkflow,
  WorkflowDefinition,
  CompiledOutput,
} from "./index.ts";

// Example: Ledger ingestion workflow
const ledgerIngestWorkflow: WorkflowDefinition = {
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

async function main() {
  console.log("=== Ledgrrr WASM Module Test ===\n");

  // Initialize the WASM module
  console.log("1. Initializing WASM module...");
  await initWasm();
  console.log("   ✓ WASM initialized\n");

  // Validate workflow
  console.log("2. Validating workflow...");
  try {
    validateWorkflow(ledgerIngestWorkflow);
    console.log("   ✓ Workflow is valid\n");
  } catch (error) {
    console.error("   ✗ Validation failed:", error);
    return;
  }

  // Compile to all formats
  console.log("3. Compiling workflow...");
  let compiled: CompiledOutput;
  try {
    compiled = compileWorkflow(ledgerIngestWorkflow);
    console.log("   ✓ Compilation successful\n");
  } catch (error) {
    console.error("   ✗ Compilation failed:", error);
    return;
  }

  // Display outputs
  console.log("4. Generated Mermaid Diagram:");
  console.log("   ---");
  console.log(
    compiled.mermaid
      .split("\n")
      .map((line) => `   ${line}`)
      .join("\n")
  );
  console.log("   ---\n");

  console.log("5. Generated Rhai Code:");
  console.log("   ---");
  console.log(
    compiled.rhai
      .split("\n")
      .map((line) => `   ${line}`)
      .join("\n")
  );
  console.log("   ---\n");

  console.log("6. Generated Rust Enum:");
  console.log("   ---");
  console.log(
    compiled.rust_enum
      .split("\n")
      .map((line) => `   ${line}`)
      .join("\n")
  );
  console.log("   ---\n");

  // Test individual conversions
  console.log("7. Testing individual format conversions...");
  const mermaid = toMermaid(ledgerIngestWorkflow);
  const rhai = toRhai(ledgerIngestWorkflow);
  const rustEnum = toRustEnum(ledgerIngestWorkflow);

  console.log(
    `   ✓ toMermaid: ${mermaid.length} chars`
  );
  console.log(`   ✓ toRhai: ${rhai.length} chars`);
  console.log(`   ✓ toRustEnum: ${rustEnum.length} chars\n`);

  // Test with example workflow
  console.log("8. Testing with built-in example workflow...");
  const exampleCompiled = compileWorkflow(exampleWorkflow);
  console.log(`   ✓ Example workflow compiled (${exampleCompiled.name})\n`);

  // Test error handling
  console.log("9. Testing error handling with invalid workflow...");
  const invalidWorkflow: WorkflowDefinition = {
    name: "invalid",
    version: "1",
    state: [
      { id: "Start", initial: true },
      // Missing: terminal state
    ],
    transition: [
      { from: "Start", event: "GO", to: "NonExistent" }, // References non-existent state
    ],
  };

  try {
    compileWorkflow(invalidWorkflow);
    console.log("   ✗ Should have thrown an error");
  } catch (error) {
    console.log("   ✓ Correctly caught error:", String(error).split("\n")[0]);
  }

  console.log("\n=== All Tests Passed ===");
}

// Run if this is the main module
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    Deno.exit(1);
  });
}

export { main };
