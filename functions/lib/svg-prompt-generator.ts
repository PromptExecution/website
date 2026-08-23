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

    if (panel.scene) {
      lines.push(`  Scene: ${panel.scene}`);
    }

    if (panel.beat) {
      lines.push(`  Story beat: ${panel.beat}`);
    }

    if (panel.visualFocus) {
      lines.push(`  Visual focus: ${panel.visualFocus}`);
    }

    if (panel.expression) {
      lines.push(`  Expression: ${panel.expression}`);
    }

    return lines.join('\n');
  });

  return `
Comic: "${script.title}"
Day: ${script.day}
Panel Layout: ${panelCount}-panel grid
Style: xkcd-like black-and-white technical comic, sparse stick figures, expressive diagrams, dry humor

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
- xkcd-inspired black-and-white line art, hand-drawn but readable
- Rich technical props: whiteboards, terminals, dashboards, network arrows, incident timers, tickets
- Each panel should have a distinct visible scene setup and one concrete prop
- Clear character silhouettes
- Visible emotive faces: eyes, brows, mouths, sweat marks, deadpan eyelids as appropriate
- Readable speech bubbles
- White background, black ink, restrained gray shading only
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

  const promptA = generateImagePrompt(svgDescription, 'clean xkcd line economy, precise diagrams, high contrast');
  const promptB = generateImagePrompt(svgDescription, 'richer panel staging, more props, still sparse black-and-white');

  return { promptA, promptB };
}
