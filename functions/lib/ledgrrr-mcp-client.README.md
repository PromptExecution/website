# Ledgrrr MCP Client

TypeScript bindings for invoking ledgrrr workflows via MCP (Model Context Protocol).

## Overview

The `ledgrrr-mcp-client` provides a high-level TypeScript API for communicating with the `ledgrrr-mcp-server` binary. It enables:

- **Workflow Execution**: Invoke Rhai functions from workflow scripts
- **Audit Tracking**: Retrieve audit entries showing execution results and context
- **Mermaid Visualization**: Generate workflow diagrams
- **Tool Discovery**: List available MCP tools from the server

## Files

- **`ledgrrr-types.ts`** - TypeScript type definitions for MCP communication and workflow results
- **`ledgrrr-mcp-client.ts`** - Main client implementation
- **`ledgrrr-mcp-client.test.ts`** - Integration tests and usage examples

## Quick Start

### Basic Usage

```typescript
import { initLedgrrMCP } from './ledgrrr-mcp-client.ts';

// Initialize client
const client = await initLedgrrMCP();

// Execute a workflow function
const result = await client.invokeWorkflow('script_generation', {
  title: 'My Comic',
  day: '2026-05-10',
  topic: 'Testing',
});

console.log(result.success);          // true/false
console.log(result.audit_entry);      // Full audit entry
console.log(result.error);            // Error message if failed

// Clean up
await client.close();
```

### Convenience Functions

For single-use operations, use the provided convenience functions:

```typescript
import { invokeWorkflow, getWorkflowMermaid } from './ledgrrr-mcp-client.ts';

// Invoke workflow (creates, uses, and closes client automatically)
const result = await invokeWorkflow('script_generation', {
  title: 'My Comic',
  day: '2026-05-10',
});

// Get workflow diagram
const diagram = await getWorkflowMermaid('workflows/comic-generation.rhai');
console.log(diagram.diagram); // Mermaid syntax
```

### Advanced Usage

```typescript
import { LedgrrMCPClient } from './ledgrrr-mcp-client.ts';

// Create client with custom config
const client = new LedgrrMCPClient({
  serverPath: '/path/to/ledgerr-mcp-server',
  timeout: 60000,
  debug: true,
});

await client.init();

// Execute multiple operations
const result1 = await client.invokeWorkflow('fn1', { /* ... */ });
const result2 = await client.invokeWorkflow('fn2', { /* ... */ });

// List available tools
const tools = await client.listTools();
console.log(tools);

await client.close();
```

## API Reference

### Class: `LedgrrMCPClient`

Main client class for MCP communication.

#### Constructor

```typescript
constructor(config?: LedgrrMCPClientConfig)
```

**Config Options:**
- `serverPath?: string` - Path to ledgrrr-mcp-server binary (default: `/home/brianh/.b00t/vendor/l3dg3rr/target/release/ledgerr-mcp-server`)
- `timeout?: number` - Request timeout in milliseconds (default: 30000)
- `debug?: boolean` - Enable debug logging (default: false)

#### Methods

##### `init(): Promise<void>`

Initialize connection to MCP server. Must be called before other operations.

##### `invokeWorkflow(functionName: string, context?: Record<string, unknown>): Promise<WorkflowExecutionResult>`

Execute a Rhai function from a workflow script.

**Parameters:**
- `functionName` - Name of the Rhai function to invoke
- `context` - Context object passed to the function

**Returns:**
```typescript
{
  success: boolean;
  audit_entry: AuditEntry;
  error?: string;
}
```

##### `getWorkflowMermaid(workflowPath: string): Promise<MermaidDiagramResult>`

Generate a Mermaid diagram for a workflow.

**Parameters:**
- `workflowPath` - Path to workflow file (e.g., `"workflows/comic-generation.rhai"`)

**Returns:**
```typescript
{
  success: boolean;
  diagram: string;      // Mermaid syntax
  format: 'mermaid';
  error?: string;
}
```

##### `listTools(): Promise<ToolDescriptor[]>`

List all available tools from the MCP server.

**Returns:** Array of tool descriptors with name and input schema.

##### `close(): Promise<void>`

Cleanup and close the MCP connection.

### Factory Functions

#### `initLedgrrMCP(config?: LedgrrMCPClientConfig): Promise<LedgrrMCPClient>`

Create and initialize a client in one step.

```typescript
const client = await initLedgrrMCP({ debug: true });
```

#### `invokeWorkflow(functionName: string, context?: Record<string, unknown>, config?: LedgrrMCPClientConfig): Promise<WorkflowExecutionResult>`

Single-use workflow invocation with automatic cleanup.

```typescript
const result = await invokeWorkflow('my_function', { /* context */ });
```

#### `getWorkflowMermaid(workflowPath: string, config?: LedgrrMCPClientConfig): Promise<MermaidDiagramResult>`

Single-use Mermaid generation with automatic cleanup.

```typescript
const result = await getWorkflowMermaid('workflows/my-workflow.rhai');
```

## Data Types

### `AuditEntry`

Result of workflow execution with full audit trail:

```typescript
{
  entry_id: string;              // Unique entry identifier
  timestamp: string;             // ISO 8601 timestamp
  workflow_name: string;         // Name of the workflow
  function_name: string;         // Name of the invoked function
  status: 'success' | 'error' | 'pending';
  context_input: Record<string, unknown>;  // Input context
  result: Record<string, unknown> | null;  // Execution result
  error_message?: string;        // Error details if failed
  execution_time_ms: number;     // Execution duration
}
```

### `WorkflowExecutionResult`

High-level result of workflow invocation:

```typescript
{
  success: boolean;
  audit_entry: AuditEntry;
  error?: string;
}
```

### `MermaidDiagramResult`

Result of workflow diagram generation:

```typescript
{
  success: boolean;
  diagram: string;               // Mermaid syntax
  format: 'mermaid' | 'svg';
  error?: string;
}
```

## Error Handling

The client uses a minimal error handling approach suitable for MVP:

- **Connection Errors**: Logged to console, returned in result
- **Timeout Errors**: Trigger timeout exception with message
- **Tool Errors**: Captured in audit entry `status` and `error_message`

Example:

```typescript
const result = await invokeWorkflow('my_function', {});

if (!result.success) {
  console.error('Workflow failed:', result.error);
  console.error('Entry:', result.audit_entry);
}
```

## Protocol Details

### MCP Server Communication

The client communicates with `ledgrrr-mcp-server` via:

- **Transport**: stdio (stdin/stdout)
- **Protocol**: JSON-RPC 2.0
- **Encoding**: UTF-8

### Available Tools

The MCP server exposes ledgrrr tools including:

- `ledgerr_workflow` - Workflow execution and compilation
- `ledgerr_documents` - Document management
- `ledgerr_review` - Classification and review
- `ledgerr_audit` - Audit log access
- And 6 more (see ledgrrr contract for full list)

### Request/Response Format

All communication uses JSON-RPC 2.0:

```typescript
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "ledgerr_workflow",
    "arguments": {
      "action": "invoke_rhai_function",
      "function_name": "my_func",
      "context": { /* ... */ }
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{...audit_entry...}"
      }
    ]
  }
}
```

## Configuration

### Environment

The default server path expects ledgrrr to be installed at:
```
/home/brianh/.b00t/vendor/l3dg3rr/target/release/ledgerr-mcp-server
```

Override via config:
```typescript
const client = new LedgrrMCPClient({
  serverPath: process.env.LEDGERR_MCP_PATH || '/path/to/server'
});
```

### MCP Configuration

The server is configured in `_b00t_/ledgrrr-mcp.mcp.toml`:

```toml
[[b00t.mcp.stdio]]
transport = "stdio"
command = "/home/brianh/.b00t/vendor/l3dg3rr/target/release/ledgerr-mcp-server"
```

## Testing

Run integration tests:

```bash
deno test functions/lib/ledgrrr-mcp-client.test.ts
```

Tests cover:
- Client initialization
- Workflow invocation
- Mermaid diagram generation
- Tool listing
- Error handling
- Convenience functions
- End-to-end workflow execution

## Limitations (MVP)

Current implementation is minimal and suitable for MVP:

- **No request queuing**: Requests are serialized
- **No reconnection**: Failed connections don't auto-retry
- **Simple error handling**: Errors are logged, not recovered
- **Single response parsing**: Assumes one JSON object per line
- **No authentication**: Assumes local stdio transport

## Future Enhancements

- Connection pooling for multiple concurrent operations
- Automatic reconnection with exponential backoff
- Rich error recovery and retry strategies
- Streaming response support
- WebSocket/HTTP transport options
- Request/response caching

## Integration Examples

### With Comic Generation Workflow

```typescript
import { invokeWorkflow } from './ledgrrr-mcp-client.ts';

async function generateComicWithGovernance(options: ComicOptions) {
  const result = await invokeWorkflow('script_generation', {
    title: options.title,
    day: options.day,
    topic: options.topic,
    cast: options.cast,
  });

  if (result.success) {
    console.log('Comic script generated');
    console.log('Audit entry:', result.audit_entry.entry_id);
    // Continue with image generation...
  } else {
    console.error('Script generation failed:', result.error);
  }
}
```

### With API Endpoint

```typescript
// In Cloudflare Workers function
import { invokeWorkflow } from './ledgrrr-mcp-client.ts';

export default {
  async fetch(request: Request) {
    const body = await request.json();

    const result = await invokeWorkflow('my_workflow', body);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400,
    });
  }
};
```

## Support

For issues or questions:
1. Check the test file for usage examples
2. Enable `debug: true` for detailed logging
3. Verify ledgrrr-mcp-server is running at the configured path
4. Check MCP protocol compatibility (2024-11-05)
