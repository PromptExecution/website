# from wasmer import wasi, engine, Store, Module, Instance, wasm2wat, wat2wasm
# from wasmer_compiler_cranelift import Compiler as CompilerCL
# #from wasmer_compiler_llvm import Compiler as CompilerLLVM
# from wasmer_compiler_singlepass import Compiler as CompilerSP
# import os

# def load_wasm_module(wasm_file_path):
#     if not os.path.exists(wasm_file_path):
#         raise FileNotFoundError(f"WASM file not found: {wasm_file_path}")

#     # Read the WASM file
#     with open(wasm_file_path, 'rb') as file:
#         wasm_bytes = file.read()


#     # # Compile the module
#     # store = Store(engine.JIT)
#     # store = Store(Compiler())
#     #   store = Store(engine.Universal())  # Error: Compilation error: The UniversalEngine is operating in headless mode, so it can only execute already compiled Modules.
#     # store = Store(engine.Universal(CompilerLLVM()))  # Error: Compilation error: The UniversalEngine is operating in headless mode, so it can only execute already compiled Modules.
#     store = Store(engine.Universal(CompilerCL))
#     print("Store created")
#     module = Module(store, wasm_bytes)
#     print("Module created")
#     # Get the WASI version.
#     # Create an instance of the module

#     wasi_version = wasi.get_version(module, strict=True)
#     wasi_env = wasi.StateBuilder('test-program').argument('--foo').finalize()
#     print("wasi version: ", wasi_version)
#     print("Creating instance")
#     # Generate an `ImportObject` from the WASI environment.
#     import_object = wasi_env.generate_import_object(store, wasi_version)

#     # Now we are ready to instantiate the module.
#     instance = Instance(module, import_object)
#     #instance = Instance(module)
#     print("Instance created")

#     # You need to call a specific function from the WASM module.
#     # This depends on the exports of your WASM module.
#     # For example, if your WASM module has a function named 'run':
#     # instance.exports.run()

#     # Check available exports
#     print("Available exports:")
#     for export in instance.exports:
#         print(f" - {export}")

import wasm3, base64
import os
import types

# # Path to your WASM file
def demo(wasm_file_path):
    # WebAssembly binary
    # WASM = base64.b64decode("AGFzbQEAAAABBgFgAX4"
    #     "BfgMCAQAHBwEDZmliAAAKHwEdACAAQgJUBEAgAA"
    #     "8LIABCAn0QACAAQgF9EAB8Dws=")


    if not os.path.exists(wasm_file_path):
        raise FileNotFoundError(f"WASM file not found: {file_path}")

    # Read the WASM file
    WASM = ""
    with open(wasm_file_path, 'rb') as file:
        WASM = file.read()


    env = wasm3.Environment()
    rt  = env.new_runtime(2048)
    mod = env.parse_module(WASM)
    rt.load(mod)
    print("load")

    wasm_fib = rt.find_function("run")
    result = wasm_fib(24)
    print(result)                       # 46368

def main():
    print("Hello from Python!")
    # wasm_file_path = '/home/brianh/promptexecution/website/rust/wasm_websocket_client/pkg/wasm_websocket_client_bg.wasm'
    wasm_file_path = '/home/brianh/promptexecution/infrastructure/rust/hello_wasm/pkg/hello_world_bg.wasm'

    try:
        demo(wasm_file_path)
        #wasm_module = load_wasm_module(wasm_file_path)
        #run_wasm_module(wasm_module)
    except Exception as e:
        print(f"😱 Error: {e}")

if __name__ == "__main__":
    main()
