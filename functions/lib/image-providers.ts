/**
 * Image Provider Abstraction Layer
 * Supports multiple image generation backends (Cloudflare, Hugging Face, etc.)
 * MVP: Cloudflare Workers AI only
 */

export interface ImageProviderConfig {
  name: string; // 'gemma4', 'qwen3', 'flux', etc.
  model: string; // '@cf/...' or 'huggingface/...'
  type: 'script-generator' | 'svg-generator' | 'image-renderer';
  provider: 'cloudflare' | 'huggingface' | 'local';
}

export interface GenerateImageInput {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
}

export interface GenerateImageOutput {
  imageBuffer: ArrayBuffer;
  contentType: string;
  metadata: {
    model: string;
    provider: string;
    timestamp: string;
  };
}

export class ImageProvider {
  private model: string;
  private ai: any;
  private env: any;

  constructor(config: ImageProviderConfig, ai: any, env: any) {
    this.model = config.model;
    this.ai = ai;
    this.env = env;
  }

  async generate(input: GenerateImageInput): Promise<GenerateImageOutput> {
    if (!this.ai) {
      throw new Error('AI binding not available');
    }

    try {
      const response = await this.ai.run(this.model, {
        prompt: input.prompt,
        ...(input.width && { width: input.width }),
        ...(input.height && { height: input.height }),
        ...(input.steps && { steps: input.steps }),
        ...(input.seed !== undefined && { seed: input.seed }),
      });

      if (!response) {
        throw new Error('No response from image generation model');
      }

      const imageBuffer = await new Response(response).arrayBuffer();

      return {
        imageBuffer,
        contentType: 'image/jpeg',
        metadata: {
          model: this.model,
          provider: 'cloudflare',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(`Image generation failed for model ${this.model}:`, error);
      throw error;
    }
  }
}

/**
 * Factory for creating providers based on environment config
 */
export function createImageProvider(
  providerName: string,
  env: any,
  ai: any
): ImageProvider | null {
  const modelKey = `IMAGE_PROVIDER_${providerName.toUpperCase()}`;
  const model = env[modelKey];

  if (!model) {
    console.warn(`Provider ${providerName} not configured (missing ${modelKey})`);
    return null;
  }

  const config: ImageProviderConfig = {
    name: providerName,
    model,
    type: 'script-generator',
    provider: 'cloudflare',
  };

  return new ImageProvider(config, ai, env);
}

/**
 * Create image renderer (FLUX or Stable Diffusion)
 */
export function createImageRenderer(env: any, ai: any): ImageProvider | null {
  const model = env.IMAGE_RENDERER_MODEL;

  if (!model) {
    console.warn('Image renderer not configured (missing IMAGE_RENDERER_MODEL)');
    return null;
  }

  const config: ImageProviderConfig = {
    name: 'renderer',
    model,
    type: 'image-renderer',
    provider: 'cloudflare',
  };

  return new ImageProvider(config, ai, env);
}

/**
 * Check which providers are available
 */
export function getAvailableProviders(env: any): string[] {
  const providers = [];

  if (env.IMAGE_PROVIDER_A) providers.push('a');
  if (env.IMAGE_PROVIDER_B) providers.push('b');
  if (env.IMAGE_RENDERER_MODEL) providers.push('renderer');

  return providers;
}
