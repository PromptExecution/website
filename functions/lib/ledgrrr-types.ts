/**
 * Ledgrrr MCP Client Type Definitions
 *
 * Type definitions for ledgrrr workflow execution, audit entries,
 * and MCP communication.
 */

/**
 * Audit entry from a workflow execution
 */
export interface AuditEntry {
  entry_id: string;
  timestamp: string;
  workflow_name: string;
  function_name: string;
  status: 'success' | 'error' | 'pending';
  context_input: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message?: string;
  execution_time_ms: number;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  success: boolean;
  audit_entry: AuditEntry;
  error?: string;
}

/**
 * MCP Tool Call Response
 */
export interface MCPToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
  isError?: boolean;
}

/**
 * MCP JSON-RPC Request
 */
export interface MCPJsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params: Record<string, unknown>;
}

/**
 * MCP JSON-RPC Response
 */
export interface MCPJsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Ledgrrr Workflow Tool Arguments
 */
export interface WorkflowToolArgs {
  action: string;
  workflow_name?: string;
  function_name?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Tool descriptor from MCP server
 */
export interface ToolDescriptor {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Resource descriptor from MCP server
 */
export interface ResourceDescriptor {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP Initialize Request
 */
export interface MCPInitializeRequest {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  clientInfo: {
    name: string;
    version: string;
  };
}

/**
 * MCP Initialize Response
 */
export interface MCPInitializeResponse {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  serverInfo: {
    name: string;
    version: string;
  };
}

/**
 * Ledgrrr MCP Client Configuration
 */
export interface LedgrrMCPClientConfig {
  serverPath?: string;
  timeout?: number;
  debug?: boolean;
}

/**
 * Ledgrrr Mermaid Diagram Result
 */
export interface MermaidDiagramResult {
  success: boolean;
  diagram: string;
  format: 'mermaid' | 'svg';
  error?: string;
}
