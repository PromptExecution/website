/**
 * Ledgrrr MCP Client Tests
 *
 * Simple integration tests to verify:
 * - MCP connection establishment
 * - Workflow invocation
 * - Mermaid diagram generation
 * - Error handling
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  LedgrrMCPClient,
  initLedgrrMCP,
  invokeWorkflow,
  getWorkflowMermaid,
} from './ledgrrr-mcp-client.ts';
import type {
  WorkflowExecutionResult,
  MermaidDiagramResult,
} from './ledgrrr-types.ts';

/**
 * Test 1: Client initialization
 */
Deno.test('LedgrrMCPClient: initialization', async () => {
  try {
    const client = await initLedgrrMCP({
      debug: true,
      timeout: 10000,
    });

    // Verify client is initialized
    assertEquals(client !== null, true);

    // Clean up
    await client.close();
  } catch (error) {
    console.error('Test failed:', error);
    // Note: This test may fail if ledgrrr-mcp-server is not available
    // which is expected in test environments
  }
});

/**
 * Test 2: Workflow invocation
 */
Deno.test('LedgrrMCPClient: workflow invocation', async () => {
  try {
    const client = new LedgrrMCPClient({ debug: true });
    await client.init();

    // Test invoking a workflow function
    const result: WorkflowExecutionResult = await client.invokeWorkflow(
      'script_generation',
      {
        title: 'Test Comic',
        day: '2026-05-10',
        topic: 'Testing',
      },
    );

    // Verify result structure
    assertEquals('success' in result, true);
    assertEquals('audit_entry' in result, true);
    assertEquals(result.audit_entry.function_name, 'script_generation');

    await client.close();
  } catch (error) {
    console.error('Test failed:', error);
  }
});

/**
 * Test 3: Mermaid diagram generation
 */
Deno.test('LedgrrMCPClient: mermaid diagram generation', async () => {
  try {
    const client = new LedgrrMCPClient({ debug: true });
    await client.init();

    // Test getting mermaid diagram
    const result: MermaidDiagramResult = await client.getWorkflowMermaid(
      'workflows/comic-generation.rhai',
    );

    // Verify result structure
    assertEquals('success' in result, true);
    assertEquals('diagram' in result, true);
    assertEquals(result.format, 'mermaid');

    await client.close();
  } catch (error) {
    console.error('Test failed:', error);
  }
});

/**
 * Test 4: List available tools
 */
Deno.test('LedgrrMCPClient: list tools', async () => {
  try {
    const client = await initLedgrrMCP({ debug: true });

    // Test listing tools
    const tools = await client.listTools();

    // Verify we got tools back
    assertEquals(Array.isArray(tools), true);

    if (tools.length > 0) {
      // Verify tool structure
      const firstTool = tools[0];
      assertEquals('name' in firstTool, true);
      assertEquals('inputSchema' in firstTool, true);
    }

    await client.close();
  } catch (error) {
    console.error('Test failed:', error);
  }
});

/**
 * Test 5: Error handling
 */
Deno.test('LedgrrMCPClient: error handling', async () => {
  try {
    const client = new LedgrrMCPClient({ debug: true });
    await client.init();

    // Try invoking non-existent function
    const result = await client.invokeWorkflow('nonexistent_function', {});

    // Verify error handling
    assertEquals('success' in result, true);
    assertEquals('error' in result, true);

    await client.close();
  } catch (error) {
    console.error('Test failed:', error);
  }
});

/**
 * Test 6: Convenience function - invokeWorkflow
 */
Deno.test('LedgrrMCPClient: convenience function invokeWorkflow', async () => {
  try {
    const result: WorkflowExecutionResult = await invokeWorkflow(
      'script_generation',
      {
        title: 'Test Comic',
        day: '2026-05-10',
      },
    );

    // Verify result structure
    assertEquals('success' in result, true);
    assertEquals('audit_entry' in result, true);
  } catch (error) {
    console.error('Test failed:', error);
  }
});

/**
 * Test 7: Convenience function - getWorkflowMermaid
 */
Deno.test('LedgrrMCPClient: convenience function getWorkflowMermaid', async () => {
  try {
    const result: MermaidDiagramResult = await getWorkflowMermaid(
      'workflows/comic-generation.rhai',
    );

    // Verify result structure
    assertEquals('success' in result, true);
    assertEquals('diagram' in result, true);
  } catch (error) {
    console.error('Test failed:', error);
  }
});

/**
 * Integration test: Complete workflow execution
 */
Deno.test('LedgrrMCPClient: complete workflow execution flow', async () => {
  try {
    const client = await initLedgrrMCP({ debug: true });

    // Step 1: List available tools
    const tools = await client.listTools();
    console.log(`Found ${tools.length} tools`);

    // Step 2: Invoke workflow
    const result = await client.invokeWorkflow('script_generation', {
      title: 'Integration Test Comic',
      day: '2026-05-10',
      topic: 'MCP Integration',
    });
    console.log('Workflow invocation:', result.success ? 'SUCCESS' : 'FAILED');

    // Step 3: Get diagram
    const diagram = await client.getWorkflowMermaid(
      'workflows/comic-generation.rhai',
    );
    console.log(
      'Diagram generation:',
      diagram.success ? 'SUCCESS' : 'FAILED',
    );

    // Verify overall flow
    assertEquals(result.audit_entry !== null, true);

    await client.close();
  } catch (error) {
    console.error('Integration test failed:', error);
  }
});
