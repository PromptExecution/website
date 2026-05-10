/* tslint:disable */
/* eslint-disable */

/**
 * Compiled workflow in all supported formats.
 */
export class CompiledWorkflow {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Export all compiled formats as JSON.
     */
    to_json(): string;
    readonly mermaid: string;
    readonly name: string;
    readonly rhai: string;
    readonly rust_enum: string;
}

/**
 * Parse and compile a workflow from JSON string all in one call.
 */
export function compile_workflow(json_str: string): CompiledWorkflow;

/**
 * Validate a workflow from JSON string.
 */
export function validate_workflow(json_str: string): any;

/**
 * Convert workflow to Mermaid diagram.
 */
export function workflow_to_mermaid(json_str: string): string;

/**
 * Convert workflow to Rhai state machine.
 */
export function workflow_to_rhai(json_str: string): string;

/**
 * Convert workflow to Rust enum.
 */
export function workflow_to_rust_enum(json_str: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_compiledworkflow_free: (a: number, b: number) => void;
    readonly compile_workflow: (a: number, b: number) => [number, number, number];
    readonly compiledworkflow_mermaid: (a: number) => [number, number];
    readonly compiledworkflow_name: (a: number) => [number, number];
    readonly compiledworkflow_rhai: (a: number) => [number, number];
    readonly compiledworkflow_rust_enum: (a: number) => [number, number];
    readonly compiledworkflow_to_json: (a: number) => [number, number, number, number];
    readonly validate_workflow: (a: number, b: number) => [number, number, number];
    readonly workflow_to_mermaid: (a: number, b: number) => [number, number, number, number];
    readonly workflow_to_rhai: (a: number, b: number) => [number, number, number, number];
    readonly workflow_to_rust_enum: (a: number, b: number) => [number, number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
