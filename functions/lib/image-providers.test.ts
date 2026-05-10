/**
 * Unit tests for Image Provider Abstraction Layer
 * Tests for multiple image generation backends
 */

import {
  assertEquals,
  assertExists,
  assertIsNull,
  assertThrows,
  assertRejects,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';

import {
  ImageProvider,
  ImageProviderConfig,
  GenerateImageInput,
  GenerateImageOutput,
  createImageProvider,
  createImageRenderer,
  getAvailableProviders,
} from './image-providers.ts';

/**
 * Mock AI binding for testing
 */
class MockAI {
  async run(model: string, options: any): Promise<Response | null> {
    // Default success response with mock image buffer
    const mockBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG header
    return new Response(mockBuffer);
  }
}

/**
 * Mock AI binding that returns null
 */
class MockAINull {
  async run(model: string, options: any): Promise<null> {
    return null;
  }
}

/**
 * Mock AI binding that throws error
 */
class MockAIError {
  async run(model: string, options: any): Promise<never> {
    throw new Error('AI service unavailable');
  }
}

Deno.test('ImageProvider - generate() throws error without AI binding', async () => {
  const config: ImageProviderConfig = {
    name: 'test',
    model: '@cf/test-model',
    type: 'script-generator',
    provider: 'cloudflare',
  };

  const provider = new ImageProvider(config, null, {});
  const input: GenerateImageInput = {
    prompt: 'test prompt',
  };

  await assertRejects(
    () => provider.generate(input),
    Error,
    'AI binding not available'
  );
});

Deno.test('ImageProvider - generate() succeeds with valid AI binding', async () => {
  const config: ImageProviderConfig = {
    name: 'test',
    model: '@cf/test-model',
    type: 'script-generator',
    provider: 'cloudflare',
  };

  const mockAI = new MockAI();
  const provider = new ImageProvider(config, mockAI, {});
  const input: GenerateImageInput = {
    prompt: 'a beautiful landscape',
    width: 512,
    height: 512,
    steps: 20,
    seed: 12345,
  };

  const result = await provider.generate(input);

  assertExists(result);
  assertExists(result.imageBuffer);
  assertEquals(result.contentType, 'image/jpeg');
  assertEquals(result.metadata.model, '@cf/test-model');
  assertEquals(result.metadata.provider, 'cloudflare');
  assertExists(result.metadata.timestamp);
});

Deno.test('ImageProvider - generate() throws error when model returns null', async () => {
  const config: ImageProviderConfig = {
    name: 'test',
    model: '@cf/test-model',
    type: 'script-generator',
    provider: 'cloudflare',
  };

  const mockAI = new MockAINull();
  const provider = new ImageProvider(config, mockAI, {});
  const input: GenerateImageInput = {
    prompt: 'test prompt',
  };

  await assertRejects(
    () => provider.generate(input),
    Error,
    'No response from image generation model'
  );
});

Deno.test('ImageProvider - generate() propagates AI errors', async () => {
  const config: ImageProviderConfig = {
    name: 'test',
    model: '@cf/test-model',
    type: 'script-generator',
    provider: 'cloudflare',
  };

  const mockAI = new MockAIError();
  const provider = new ImageProvider(config, mockAI, {});
  const input: GenerateImageInput = {
    prompt: 'test prompt',
  };

  await assertRejects(
    () => provider.generate(input),
    Error,
    'AI service unavailable'
  );
});

Deno.test('ImageProvider - generate() includes optional parameters', async () => {
  let capturedOptions: any;

  class MockAICapture extends MockAI {
    async run(model: string, options: any): Promise<Response> {
      capturedOptions = options;
      return await super.run(model, options);
    }
  }

  const config: ImageProviderConfig = {
    name: 'test',
    model: '@cf/test-model',
    type: 'script-generator',
    provider: 'cloudflare',
  };

  const mockAI = new MockAICapture();
  const provider = new ImageProvider(config, mockAI, {});
  const input: GenerateImageInput = {
    prompt: 'test prompt',
    width: 1024,
    height: 768,
    steps: 50,
    seed: 999,
  };

  await provider.generate(input);

  assertEquals(capturedOptions.prompt, 'test prompt');
  assertEquals(capturedOptions.width, 1024);
  assertEquals(capturedOptions.height, 768);
  assertEquals(capturedOptions.steps, 50);
  assertEquals(capturedOptions.seed, 999);
});

Deno.test('ImageProvider - generate() omits undefined optional parameters', async () => {
  let capturedOptions: any;

  class MockAICapture extends MockAI {
    async run(model: string, options: any): Promise<Response> {
      capturedOptions = options;
      return await super.run(model, options);
    }
  }

  const config: ImageProviderConfig = {
    name: 'test',
    model: '@cf/test-model',
    type: 'script-generator',
    provider: 'cloudflare',
  };

  const mockAI = new MockAICapture();
  const provider = new ImageProvider(config, mockAI, {});
  const input: GenerateImageInput = {
    prompt: 'minimal input',
  };

  await provider.generate(input);

  assertEquals(capturedOptions.prompt, 'minimal input');
  assertEquals(capturedOptions.width, undefined);
  assertEquals(capturedOptions.height, undefined);
  assertEquals(capturedOptions.steps, undefined);
  assertEquals(capturedOptions.seed, undefined);
});

Deno.test('createImageProvider() returns null when env var is missing', () => {
  const env = {};
  const mockAI = new MockAI();

  const provider = createImageProvider('gemma4', env, mockAI);

  assertIsNull(provider);
});

Deno.test('createImageProvider() returns ImageProvider when configured', () => {
  const env = {
    IMAGE_PROVIDER_GEMMA4: '@cf/gemma-4',
  };
  const mockAI = new MockAI();

  const provider = createImageProvider('gemma4', env, mockAI);

  assertExists(provider);
  assertEquals(provider instanceof ImageProvider, true);
});

Deno.test('createImageProvider() handles different provider names', () => {
  const env = {
    IMAGE_PROVIDER_CUSTOM: '@cf/custom-model',
  };
  const mockAI = new MockAI();

  const provider = createImageProvider('custom', env, mockAI);

  assertExists(provider);
  assertEquals(provider instanceof ImageProvider, true);
});

Deno.test('createImageProvider() uses correct env var naming convention', () => {
  const env = {
    IMAGE_PROVIDER_QWEN3: '@cf/qwen-vl-3',
  };
  const mockAI = new MockAI();

  const provider = createImageProvider('qwen3', env, mockAI);

  assertExists(provider);
});

Deno.test('createImageProvider() is case-insensitive for provider name', () => {
  const env = {
    IMAGE_PROVIDER_FLUX: '@cf/flux-pro',
  };
  const mockAI = new MockAI();

  // Should normalize to uppercase
  const provider = createImageProvider('flux', env, mockAI);

  assertExists(provider);
});

Deno.test('createImageRenderer() returns null when IMAGE_RENDERER_MODEL is missing', () => {
  const env = {};
  const mockAI = new MockAI();

  const provider = createImageRenderer(env, mockAI);

  assertIsNull(provider);
});

Deno.test('createImageRenderer() returns ImageProvider when configured', () => {
  const env = {
    IMAGE_RENDERER_MODEL: '@cf/flux-pro',
  };
  const mockAI = new MockAI();

  const provider = createImageRenderer(env, mockAI);

  assertExists(provider);
  assertEquals(provider instanceof ImageProvider, true);
});

Deno.test('createImageRenderer() creates provider with correct config', async () => {
  const env = {
    IMAGE_RENDERER_MODEL: '@cf/flux-dev',
  };
  const mockAI = new MockAI();

  const provider = createImageRenderer(env, mockAI);
  assertExists(provider);

  // Verify the provider works with the renderer model
  const input: GenerateImageInput = {
    prompt: 'render test',
  };

  const result = await provider!.generate(input);

  assertExists(result);
  assertEquals(result.metadata.model, '@cf/flux-dev');
});

Deno.test('getAvailableProviders() returns empty array when no providers configured', () => {
  const env = {};

  const providers = getAvailableProviders(env);

  assertEquals(providers.length, 0);
  assertEquals(Array.isArray(providers), true);
});

Deno.test('getAvailableProviders() correctly lists available providers', () => {
  const env = {
    IMAGE_PROVIDER_A: '@cf/model-a',
    IMAGE_PROVIDER_B: '@cf/model-b',
    IMAGE_RENDERER_MODEL: '@cf/flux-pro',
  };

  const providers = getAvailableProviders(env);

  assertEquals(providers.length, 3);
  assertEquals(providers.includes('a'), true);
  assertEquals(providers.includes('b'), true);
  assertEquals(providers.includes('renderer'), true);
});

Deno.test('getAvailableProviders() returns only provider A when configured', () => {
  const env = {
    IMAGE_PROVIDER_A: '@cf/model-a',
  };

  const providers = getAvailableProviders(env);

  assertEquals(providers.length, 1);
  assertEquals(providers[0], 'a');
});

Deno.test('getAvailableProviders() returns only provider B when configured', () => {
  const env = {
    IMAGE_PROVIDER_B: '@cf/model-b',
  };

  const providers = getAvailableProviders(env);

  assertEquals(providers.length, 1);
  assertEquals(providers[0], 'b');
});

Deno.test('getAvailableProviders() returns only renderer when configured', () => {
  const env = {
    IMAGE_RENDERER_MODEL: '@cf/flux-pro',
  };

  const providers = getAvailableProviders(env);

  assertEquals(providers.length, 1);
  assertEquals(providers[0], 'renderer');
});

Deno.test('getAvailableProviders() returns subset when partially configured', () => {
  const env = {
    IMAGE_PROVIDER_A: '@cf/model-a',
    IMAGE_RENDERER_MODEL: '@cf/flux-pro',
  };

  const providers = getAvailableProviders(env);

  assertEquals(providers.length, 2);
  assertEquals(providers.includes('a'), true);
  assertEquals(providers.includes('renderer'), true);
  assertEquals(providers.includes('b'), false);
});

Deno.test('getAvailableProviders() handles falsy values correctly', () => {
  const env = {
    IMAGE_PROVIDER_A: '@cf/model-a',
    IMAGE_PROVIDER_B: '',
    IMAGE_RENDERER_MODEL: null,
  };

  const providers = getAvailableProviders(env);

  assertEquals(providers.length, 1);
  assertEquals(providers[0], 'a');
});

Deno.test('ImageProvider constructor stores configuration correctly', () => {
  const config: ImageProviderConfig = {
    name: 'test-provider',
    model: '@cf/test-model',
    type: 'image-renderer',
    provider: 'cloudflare',
  };
  const mockAI = new MockAI();
  const env = { TEST: 'value' };

  const provider = new ImageProvider(config, mockAI, env);

  assertExists(provider);
  assertEquals(provider instanceof ImageProvider, true);
});

Deno.test('ImageProvider - generate() with seed = 0 includes seed parameter', async () => {
  let capturedOptions: any;

  class MockAICapture extends MockAI {
    async run(model: string, options: any): Promise<Response> {
      capturedOptions = options;
      return await super.run(model, options);
    }
  }

  const config: ImageProviderConfig = {
    name: 'test',
    model: '@cf/test-model',
    type: 'script-generator',
    provider: 'cloudflare',
  };

  const mockAI = new MockAICapture();
  const provider = new ImageProvider(config, mockAI, {});
  const input: GenerateImageInput = {
    prompt: 'test',
    seed: 0,
  };

  await provider.generate(input);

  assertEquals(capturedOptions.seed, 0);
});
