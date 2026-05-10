/**
 * SVG Prompt Generator
 * Converts comic scripts into detailed prompts for image generation
 * Intermediate step in A→B→C pipeline
 */

import type { ComicScript, ComicPanel } from './comic-generator.ts';

export interface SvgPromptGeneration {
  script: ComicScript;
  svgDescription: string; // Detailed layout description
  imagePrompt: string; // Detailed prompt for FLUX/Stable Diffusion
}

/**
 * Convert comic script to SVG abstract description
 * This describes layout, characters, colors, emotions
 */
export function generateSvgDescription(script: ComicScript): string {
  const panelCount = script.panels.length;

  const panelDescriptions = script.panels.map((panel, idx) => {
    const lines = [
      `Panel ${panel.panelNumber}:`,
      `  Speaker: ${panel.speaker}`,
    ];

    if (panel.dialogue) {
      lines.push(`  Dialogue: "${panel.dialogue}"`);
    }

    if (panel.robotThought) {
      lines.push(`  Thought: "${panel.robotThought}"`);
    }

    if (panel.action) {
      lines.push(`  Action: ${panel.action}`);
    }

    if (panel.pose) {
      lines.push(`  Pose: ${panel.pose}`);
    }

    return lines.join('\n');
  });

  return `
Comic: "${script.title}"
Day: ${script.day}
Panel Layout: ${panelCount}-panel grid
Style: Retro technical webcomic, dry humor, ASCII-art influenced

${panelDescriptions.join('\n\n')}
  `.trim();
}

/**
 * Generate detailed image prompt from SVG description
 * This feeds into FLUX/Stable Diffusion
 */
export function generateImagePrompt(
  svgDescription: string,
  variantStyle: string = ''
): string {
  const basePrompt = `
Retro technical webcomic style image for:
"LLM DOES NOT COMPUTE"

${svgDescription}

Style Guide:
- Retro ASCII-art inspired comic panels
- Technical/minimalist aesthetic
- Clear character silhouettes
- Readable speech bubbles
- Dark background, bright text
- 1024x768 resolution optimized for web
${variantStyle ? `- Variant: ${variantStyle}` : ''}
  `.trim();

  return basePrompt;
}

/**
 * Full pipeline: Script → SVG Description → Image Prompt
 */
export function generateSvgPrompt(script: ComicScript): SvgPromptGeneration {
  const svgDescription = generateSvgDescription(script);
  const imagePrompt = generateImagePrompt(svgDescription);

  return {
    script,
    svgDescription,
    imagePrompt,
  };
}

/**
 * Generate variant prompts for A/B testing
 */
export function generateVariantPrompts(script: ComicScript): {
  promptA: string;
  promptB: string;
} {
  const svgDescription = generateSvgDescription(script);

  const promptA = generateImagePrompt(svgDescription, 'High contrast, bold lines');
  const promptB = generateImagePrompt(svgDescription, 'Soft colors, detailed');

  return { promptA, promptB };
}
