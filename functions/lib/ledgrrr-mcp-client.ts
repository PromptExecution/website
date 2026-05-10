/**
 * Ledgrrr MCP Client
 *
 * TypeScript bindings for invoking ledgrrr workflows via MCP (Model Context Protocol).
 * Provides high-level API for:
 * - MCP connection initialization
 * - Workflow execution via Rhai functions
 * - Mermaid diagram generation
 * - Audit entry retrieval
 *
 * The client communicates with ledgrrr-mcp-server via stdio transport using
 * JSON-RPC 2.0 protocol.
 */

import {
  type AuditEntry,
  type LedgrrMCPClientConfig,
  type MCPInitializeRequest,
  type MCPInitializeResponse,
  type MCPJsonRpcRequest,
  type MCPJsonRpcResponse,
  type MCPToolResponse,
  type MermaidDiagramResult,
  type ToolDescriptor,
  type WorkflowExecutionResult,
  type WorkflowToolArgs,
} from './ledgrrr-types.ts';

/**
 * Default MCP server path
 */
const DEFAULT_MCP_SERVER_PATH =
  '/home/brianh/.b00t/vendor/l3dg3rr/target/release/ledgerr-mcp-server';

/**
 * Default communication timeout (ms)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Ledgrrr MCP Client
 *
 * Manages connection to ledgrrr-mcp-server and provides methods for:
 * - Workflow execution
 * - Mermaid diagram generation
 * - Audit log querying
 */
export class LedgrrMCPClient {
  private serverPath: string;
  private timeout: number;
  private debug: boolean;
  private requestId: number = 0;
  private serverProcess: Deno.ChildProcess | null = null;
  private initialized: boolean = false;
  private toolCache: Map<string, ToolDescriptor> = new Map();

  constructor(config?: LedgrrMCPClientConfig) {
    this.serverPath = config?.serverPath || DEFAULT_MCP_SERVER_PATH;
    this.timeout = config?.timeout || DEFAULT_TIMEOUT;
    this.debug = config?.debug || false;
  }

  /**
   * Initialize MCP connection to ledgrrr-mcp-server
   *
   * @returns Promise that resolves when connection is established
   * @throws Error if connection fails
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Spawn the MCP server process with stdio transport
      this.serverProcess = new Deno.Command(this.serverPath, {
        stdin: 'piped',
        stdout: 'piped',
        stderr: 'piped',
      }).spawn();

      if (!this.serverProcess.stdout || !this.serverProcess.stdin) {
        throw new Error('Failed to establish stdio streams with MCP server');
      }

      // Send initialize request
      const initRequest: MCPJsonRpcRequest = {
        jsonrpc: '2.0',
        id: this.nextRequestId(),
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
          },
          clientInfo: {
            name: 'ledgrrr-mcp-client',
            version: '1.0.0',
          },
        } as MCPInitializeRequest,
      };

      await this.sendRequest(initRequest);
      this.initialized = true;

      if (this.debug) {
        console.log('[LedgrrMCP] Initialized successfully');
      }

      // Load tool cache
      await this.loadToolCache();
    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to initialize MCP client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a workflow function via Rhai
   *
   * Calls the ledgrrr_workflow tool with "invoke_rhai_function" action
   * to execute a Rhai function from the workflow script.
   *
   * @param functionName Name of the Rhai function to invoke
   * @param context Context object to pass to the function
   * @returns Workflow execution result with audit entry
   */
  async invokeWorkflow(
    functionName: string,
    context: Record<string, unknown> = {},
  ): Promise<WorkflowExecutionResult> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const toolArgs: WorkflowToolArgs = {
        action: 'invoke_rhai_function',
        function_name: functionName,
        context: context,
      };

      const response = await this.callTool('ledgerr_workflow', toolArgs);

      if (this.debug) {
        console.log(`[LedgrrMCP] Workflow invocation result:`, response);
      }

      // Parse the response to extract audit entry
      const auditEntry = this.extractAuditEntry(response);

      return {
        success: !response.isError,
        audit_entry: auditEntry,
        error: response.isError ? this.extractErrorMessage(response) : undefined,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        audit_entry: {
          entry_id: `error-${this.requestId}`,
          timestamp: new Date().toISOString(),
          workflow_name: 'unknown',
          function_name: functionName,
          status: 'error',
          context_input: context,
          result: null,
          error_message: errorMsg,
          execution_time_ms: 0,
        },
        error: errorMsg,
      };
    }
  }

  /**
   * Get Mermaid diagram for a workflow
   *
   * Calls ledgrrr to compile a workflow and generate a Mermaid diagram.
   *
   * @param workflowPath Path to the workflow file (e.g., "workflows/comic-generation.rhai")
   * @returns Mermaid diagram as string
   */
  async getWorkflowMermaid(workflowPath: string): Promise<MermaidDiagramResult> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const toolArgs: WorkflowToolArgs = {
        action: 'get_workflow_mermaid',
        workflow_path: workflowPath,
      };

      const response = await this.callTool('ledgerr_workflow', toolArgs);

      if (response.isError) {
        return {
          success: false,
          diagram: '',
          format: 'mermaid',
          error: this.extractErrorMessage(response),
        };
      }

      const diagram = this.extractDiagram(response);

      return {
        success: true,
        diagram,
        format: 'mermaid',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        diagram: '',
        format: 'mermaid',
        error: errorMsg,
      };
    }
  }

  /**
   * List all available tools from the MCP server
   *
   * @returns Array of tool descriptors
   */
  async listTools(): Promise<ToolDescriptor[]> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const request: MCPJsonRpcRequest = {
        jsonrpc: '2.0',
        id: this.nextRequestId(),
        method: 'tools/list',
        params: {},
      };

      const response = await this.sendRequest(request);

      if (response.error) {
        throw new Error(`MCP error: ${response.error.message}`);
      }

      return (response.result as { tools: ToolDescriptor[] })?.tools || [];
    } catch (error) {
      console.error('[LedgrrMCP] Error listing tools:', error);
      return [];
    }
  }

  /**
   * Cleanup and close the MCP connection
   */
  async close(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Private helper methods
   */

  private async cleanup(): Promise<void> {
    if (this.serverProcess) {
      try {
        this.serverProcess.kill('SIGTERM');
      } catch {
        // Process may already be terminated
      }
      this.serverProcess = null;
    }
    this.initialized = false;
    this.toolCache.clear();
  }

  private nextRequestId(): number {
    return ++this.requestId;
  }

  private async sendRequest(
    request: MCPJsonRpcRequest,
  ): Promise<MCPJsonRpcResponse> {
    if (!this.serverProcess?.stdin) {
      throw new Error('Server process not initialized');
    }

    const writer = this.serverProcess.stdin.getWriter();
    try {
      const message = JSON.stringify(request) + '\n';
      await writer.write(new TextEncoder().encode(message));
    } finally {
      writer.releaseLock();
    }

    // Read response with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('MCP request timeout')),
        this.timeout,
      );

      this.readResponse()
        .then((response) => {
          clearTimeout(timeout);
          resolve(response);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private async readResponse(): Promise<MCPJsonRpcResponse> {
    if (!this.serverProcess?.stdout) {
      throw new Error('Server output stream not available');
    }

    const reader = this.serverProcess.stdout.getReader();
    try {
      const buffer = new Uint8Array(64 * 1024);
      const result = await reader.read();

      if (result.done) {
        throw new Error('Server closed connection');
      }

      const text = new TextDecoder().decode(
        result.value.slice(0, result.value.length),
      );
      const lines = text.trim().split('\n');

      // Find and parse JSON-RPC response
      for (const line of lines) {
        if (line.trim()) {
          try {
            return JSON.parse(line);
          } catch {
            // Continue to next line
          }
        }
      }

      throw new Error('No valid JSON-RPC response found');
    } finally {
      reader.releaseLock();
    }
  }

  private async callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolResponse> {
    const request: MCPJsonRpcRequest = {
      jsonrpc: '2.0',
      id: this.nextRequestId(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const response = await this.sendRequest(request);

    if (response.error) {
      return {
        content: [
          {
            type: 'text',
            text: response.error.message,
          },
        ],
        isError: true,
      };
    }

    return (response.result as MCPToolResponse) || {
      content: [],
      isError: false,
    };
  }

  private async loadToolCache(): Promise<void> {
    const tools = await this.listTools();
    for (const tool of tools) {
      this.toolCache.set(tool.name, tool);
    }

    if (this.debug) {
      console.log(
        `[LedgrrMCP] Loaded ${this.toolCache.size} tools into cache`,
      );
    }
  }

  private extractAuditEntry(response: MCPToolResponse): AuditEntry {
    const content = response.content[0];
    const text = content?.text || '{}';

    try {
      const parsed = JSON.parse(text);

      // If response contains audit_entry directly
      if (parsed.audit_entry) {
        return parsed.audit_entry;
      }

      // If response is the audit entry itself
      if (parsed.entry_id) {
        return parsed;
      }

      // Construct minimal audit entry from response
      return {
        entry_id: `entry-${Date.now()}`,
        timestamp: new Date().toISOString(),
        workflow_name: parsed.workflow_name || 'unknown',
        function_name: parsed.function_name || 'unknown',
        status: response.isError ? 'error' : 'success',
        context_input: parsed.context_input || {},
        result: parsed.result || parsed,
        error_message: response.isError ? parsed.error_message : undefined,
        execution_time_ms: parsed.execution_time_ms || 0,
      };
    } catch {
      // Fallback to generic audit entry
      return {
        entry_id: `entry-${Date.now()}`,
        timestamp: new Date().toISOString(),
        workflow_name: 'unknown',
        function_name: 'unknown',
        status: response.isError ? 'error' : 'success',
        context_input: {},
        result: null,
        error_message: response.isError ? text : undefined,
        execution_time_ms: 0,
      };
    }
  }

  private extractDiagram(response: MCPToolResponse): string {
    const content = response.content[0];
    const text = content?.text || '';

    try {
      const parsed = JSON.parse(text);
      return parsed.diagram || parsed.mermaid || text;
    } catch {
      return text;
    }
  }

  private extractErrorMessage(response: MCPToolResponse): string {
    const content = response.content[0];
    return content?.text || 'Unknown error';
  }
}

/**
 * Factory function to create and initialize MCP client
 *
 * @param config Optional client configuration
 * @returns Initialized LedgrrMCPClient instance
 */
export async function initLedgrrMCP(
  config?: LedgrrMCPClientConfig,
): Promise<LedgrrMCPClient> {
  const client = new LedgrrMCPClient(config);
  await client.init();
  return client;
}

/**
 * Convenience function for single workflow invocation
 *
 * @param functionName Rhai function to invoke
 * @param context Context object
 * @param config Optional client configuration
 * @returns Workflow execution result
 */
export async function invokeWorkflow(
  functionName: string,
  context?: Record<string, unknown>,
  config?: LedgrrMCPClientConfig,
): Promise<WorkflowExecutionResult> {
  const client = new LedgrrMCPClient(config);
  try {
    await client.init();
    return await client.invokeWorkflow(functionName, context);
  } finally {
    await client.close();
  }
}

/**
 * Convenience function for single Mermaid generation
 *
 * @param workflowPath Path to workflow file
 * @param config Optional client configuration
 * @returns Mermaid diagram result
 */
export async function getWorkflowMermaid(
  workflowPath: string,
  config?: LedgrrMCPClientConfig,
): Promise<MermaidDiagramResult> {
  const client = new LedgrrMCPClient(config);
  try {
    await client.init();
    return await client.getWorkflowMermaid(workflowPath);
  } finally {
    await client.close();
  }
}
