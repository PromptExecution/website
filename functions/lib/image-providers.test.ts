/**
 * Image Providers Unit Tests
 * Tests for provider factory functions and ImageProvider class
 */

import { assertEquals, assertExists, assertRejects } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import {
  createImageProvider,
  createImageRenderer,
  getAvailableProviders,
  ImageProvider,
  type ImageProviderConfig,
} from './image-providers.ts';

Deno.test('createImageProvider returns null when env var is missing', () => {
  const env = {};
  const ai = {};

  const provider = createImageProvider('a', env, ai);

  assertEquals(provider, null);
});

Deno.test('createImageProvider returns ImageProvider when configured', () => {
  const env = {
    IMAGE_PROVIDER_A: '@cf/google/gemma-4-26b-a4b-it',
  };
  const ai = {};

  const provider = createImageProvider('a', env, ai);

  assertExists(provider);
  assertEquals(provider instanceof ImageProvider, true);
});

Deno.test('ImageProvider.generate throws error without AI binding', async () => {
  const config: ImageProviderConfig = {
    name: 'test',
    model: '@cf/test/model',
    type: 'image-renderer',
    provider: 'cloudflare',
  };
  const provider = new ImageProvider(config, null, {});

  await assertRejects(
    async () => {
      await provider.generate({ prompt: 'test prompt' });
    },
    Error,
    'AI binding not available'
  );
});

Deno.test('getAvailableProviders returns correct provider list', () => {
  const env = {
    IMAGE_PROVIDER_A: '@cf/google/gemma-4-26b-a4b-it',
    IMAGE_PROVIDER_B: '@cf/qwen/qwen3-30b-a3b-fp8',
    IMAGE_RENDERER_MODEL: '@cf/black-forest-labs/flux-2-klein-4b',
  };

  const providers = getAvailableProviders(env);

  assertEquals(providers.length, 3);
  assertEquals(providers.includes('a'), true);
  assertEquals(providers.includes('b'), true);
  assertEquals(providers.includes('renderer'), true);
});

Deno.test('getAvailableProviders returns empty array when nothing configured', () => {
  const env = {};

  const providers = getAvailableProviders(env);

  assertEquals(providers.length, 0);
});

Deno.test('createImageRenderer returns null when IMAGE_RENDERER_MODEL is missing', () => {
  const env = {};
  const ai = {};

  const renderer = createImageRenderer(env, ai);

  assertEquals(renderer, null);
});

Deno.test('createImageRenderer returns ImageProvider when configured', () => {
  const env = {
    IMAGE_RENDERER_MODEL: '@cf/black-forest-labs/flux-2-klein-4b',
  };
  const ai = {};

  const renderer = createImageRenderer(env, ai);

  assertExists(renderer);
  assertEquals(renderer instanceof ImageProvider, true);
});

Deno.test('getAvailableProviders returns only configured providers', () => {
  const envPartial = {
    IMAGE_PROVIDER_A: '@cf/google/gemma-4-26b-a4b-it',
    // IMAGE_PROVIDER_B is missing
    IMAGE_RENDERER_MODEL: '@cf/black-forest-labs/flux-2-klein-4b',
  };

  const providers = getAvailableProviders(envPartial);

  assertEquals(providers.length, 2);
  assertEquals(providers.includes('a'), true);
  assertEquals(providers.includes('b'), false);
  assertEquals(providers.includes('renderer'), true);
});
