// SVG renderer for LLM DOES NOT COMPUTE
// Generates xkcd-style stick figure comics from scripts

import type { ComicScript } from './comic-generator.ts';

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 260;
const PADDING = 18;

export function renderComicToSVG(script: ComicScript): string {
  const panelCount = Math.max(1, script.panels.length);
  const totalWidth = PANEL_WIDTH * panelCount + PADDING * (panelCount + 1);
  const totalHeight = PANEL_HEIGHT + PADDING * 3 + 52;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  <defs>
    <style>
      .comic-text {
        font-family: 'Trebuchet MS', 'Verdana', sans-serif;
        font-size: 14px;
        fill: black;
      }
      .caption-text {
        font-family: 'Trebuchet MS', 'Verdana', sans-serif;
        font-size: 12px;
        fill: #333;
      }
      .robot-thought {
        font-family: 'Courier New', monospace;
        font-size: 11px;
        fill: #333;
      }
      .panel-border {
        stroke: black;
        stroke-width: 2;
        fill: white;
      }
      .bubble {
        stroke: black;
        stroke-width: 1.5;
        fill: white;
      }
      .thought-bubble {
        stroke: black;
        stroke-width: 1.5;
        fill: #f0f0f0;
      }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${totalWidth}" height="${totalHeight}" fill="white"/>

  <!-- Title -->
  <text x="${totalWidth / 2}" y="28" text-anchor="middle" class="comic-text" font-size="20" font-weight="bold">${escapeXml(script.title)}</text>
`;

  // Render each panel
  script.panels.forEach((panel, i) => {
    const x = PADDING + i * (PANEL_WIDTH + PADDING);
    const y = 44;

    svg += renderPanel(panel, x, y, PANEL_WIDTH, PANEL_HEIGHT);
  });

  svg += `</svg>`;
  return svg;
}

function renderPanel(panel: any, x: number, y: number, width: number, height: number): string {
  let content = `
  <!-- Panel ${panel.panelNumber} -->
  <rect x="${x}" y="${y}" width="${width}" height="${height}" class="panel-border"/>
`;

  const figX = x + width / 2;
  const figY = y + height - 108;

  if (panel.action) {
    content += `<text x="${x + 14}" y="${y + 18}" class="caption-text">${escapeXml(panel.action)}</text>`;
  }

  if (panel.speaker === 'robot') {
    content += drawRobotFigure(figX, figY - 30);
  } else if (panel.speaker === 'simon') {
    content += drawSimonFigure(figX, figY - 30);
  } else if (panel.speaker === 'boss') {
    content += drawBossFigure(figX, figY - 30);
  } else if (panel.speaker === 'ferris') {
    content += drawFerrisFigure(figX, figY + 10);
  } else {
    content += drawHumanFigure(figX, figY - 30);
  }

  if (panel.dialogue) {
    content += drawSpeechBubble(x + width / 2, y + 28, panel.dialogue, width - 34);
  }

  if (panel.robotThought) {
    content += drawThoughtBubble(x + width / 2, y + 28, panel.robotThought, width - 34);
  }

  return content;
}

function drawHumanFigure(x: number, y: number): string {
  return `
  <!-- Human stick figure -->
  <circle cx="${x}" cy="${y}" r="15" stroke="black" stroke-width="2" fill="white"/>
  <line x1="${x}" y1="${y + 15}" x2="${x}" y2="${y + 50}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 30}" x2="${x - 20}" y2="${y + 50}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 30}" x2="${x + 20}" y2="${y + 50}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 50}" x2="${x - 15}" y2="${y + 80}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 50}" x2="${x + 15}" y2="${y + 80}" stroke="black" stroke-width="2"/>
`;
}

function drawRobotFigure(x: number, y: number): string {
  return `
  <!-- Robot stick figure with antenna -->
  <line x1="${x}" y1="${y - 10}" x2="${x}" y2="${y - 5}" stroke="black" stroke-width="2"/>
  <circle cx="${x}" cy="${y - 12}" r="3" fill="black"/>
  <rect x="${x - 12}" y="${y}" width="24" height="24" stroke="black" stroke-width="2" fill="white"/>
  <circle cx="${x - 5}" cy="${y + 8}" r="2" fill="black"/>
  <circle cx="${x + 5}" cy="${y + 8}" r="2" fill="black"/>
  <line x1="${x - 6}" y1="${y + 16}" x2="${x + 6}" y2="${y + 16}" stroke="black" stroke-width="1.5"/>
  <line x1="${x}" y1="${y + 24}" x2="${x}" y2="${y + 50}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 30}" x2="${x - 20}" y2="${y + 50}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 30}" x2="${x + 20}" y2="${y + 50}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 50}" x2="${x - 15}" y2="${y + 80}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 50}" x2="${x + 15}" y2="${y + 80}" stroke="black" stroke-width="2"/>
`;
}

function drawSimonFigure(x: number, y: number): string {
  return `
  <!-- Simon (BOFH) - fedora + grey goatee -->
  <line x1="${x - 24}" y1="${y - 18}" x2="${x + 24}" y2="${y - 18}" stroke="black" stroke-width="2"/>
  <path d="M ${x - 16} ${y - 18} L ${x - 8} ${y - 30} L ${x + 8} ${y - 30} L ${x + 16} ${y - 18}" fill="white" stroke="black" stroke-width="2"/>
  <circle cx="${x}" cy="${y}" r="15" stroke="black" stroke-width="2" fill="white"/>
  <path d="M ${x - 6} ${y + 10} Q ${x} ${y + 18} ${x + 6} ${y + 10}" fill="none" stroke="#666" stroke-width="2"/>
  <line x1="${x}" y1="${y + 15}" x2="${x}" y2="${y + 50}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 30}" x2="${x - 20}" y2="${y + 50}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 30}" x2="${x + 20}" y2="${y + 50}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 50}" x2="${x - 15}" y2="${y + 80}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 50}" x2="${x + 15}" y2="${y + 80}" stroke="black" stroke-width="2"/>
`;
}

function drawBossFigure(x: number, y: number): string {
  return `
  <!-- Boss -->
  <circle cx="${x}" cy="${y}" r="15" stroke="black" stroke-width="2" fill="white"/>
  <line x1="${x}" y1="${y + 15}" x2="${x}" y2="${y + 52}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 28}" x2="${x - 20}" y2="${y + 46}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 28}" x2="${x + 20}" y2="${y + 46}" stroke="black" stroke-width="2"/>
  <line x1="${x - 4}" y1="${y + 20}" x2="${x}" y2="${y + 34}" stroke="black" stroke-width="1.5"/>
  <line x1="${x + 4}" y1="${y + 20}" x2="${x}" y2="${y + 34}" stroke="black" stroke-width="1.5"/>
  <line x1="${x}" y1="${y + 52}" x2="${x - 15}" y2="${y + 82}" stroke="black" stroke-width="2"/>
  <line x1="${x}" y1="${y + 52}" x2="${x + 15}" y2="${y + 82}" stroke="black" stroke-width="2"/>
`;
}

function drawFerrisFigure(x: number, y: number): string {
  return `
  <!-- Ferris -->
  <ellipse cx="${x}" cy="${y}" rx="18" ry="12" stroke="black" stroke-width="2" fill="white"/>
  <line x1="${x - 10}" y1="${y + 10}" x2="${x - 18}" y2="${y + 18}" stroke="black" stroke-width="2"/>
  <line x1="${x - 4}" y1="${y + 10}" x2="${x - 8}" y2="${y + 20}" stroke="black" stroke-width="2"/>
  <line x1="${x + 4}" y1="${y + 10}" x2="${x + 8}" y2="${y + 20}" stroke="black" stroke-width="2"/>
  <line x1="${x + 10}" y1="${y + 10}" x2="${x + 18}" y2="${y + 18}" stroke="black" stroke-width="2"/>
  <line x1="${x - 10}" y1="${y - 4}" x2="${x - 18}" y2="${y - 16}" stroke="black" stroke-width="2"/>
  <line x1="${x + 10}" y1="${y - 4}" x2="${x + 18}" y2="${y - 16}" stroke="black" stroke-width="2"/>
`;
}

function drawSpeechBubble(x: number, y: number, text: string, maxWidth: number): string {
  const lines = wrapText(text, 28);
  const bubbleHeight = lines.length * 16 + 20;
  const bubbleWidth = Math.min(maxWidth, Math.max(150, longestLine(lines) * 7.2));

  return `
  <rect x="${x - bubbleWidth/2}" y="${y}" width="${bubbleWidth}" height="${bubbleHeight}" rx="10" class="bubble"/>
  <polygon points="${x - 10},${y + bubbleHeight} ${x},${y + bubbleHeight + 15} ${x + 5},${y + bubbleHeight}" fill="white" stroke="black" stroke-width="1.5"/>
  ${lines.map((line, i) =>
    `<text x="${x}" y="${y + 20 + i * 16}" text-anchor="middle" class="comic-text">${escapeXml(line)}</text>`
  ).join('\n  ')}
`;
}

function drawThoughtBubble(x: number, y: number, text: string, maxWidth: number): string {
  const lines = wrapText(text, 30);
  const bubbleHeight = lines.length * 14 + 20;
  const bubbleWidth = Math.min(maxWidth, Math.max(170, longestLine(lines) * 7));

  return `
  <rect x="${x - bubbleWidth/2}" y="${y}" width="${bubbleWidth}" height="${bubbleHeight}" rx="5" class="thought-bubble"/>
  <circle cx="${x - 20}" cy="${y + bubbleHeight}" r="4" fill="#f0f0f0" stroke="black" stroke-width="1"/>
  <circle cx="${x - 10}" cy="${y + bubbleHeight + 8}" r="3" fill="#f0f0f0" stroke="black" stroke-width="1"/>
  ${lines.map((line, i) =>
    `<text x="${x}" y="${y + 18 + i * 14}" text-anchor="middle" class="robot-thought">${escapeXml(line)}</text>`
  ).join('\n  ')}
`;
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > maxChars && currentLine.length > 0) {
        lines.push(currentLine.trim());
        currentLine = `${word} `;
      } else {
        currentLine += `${word} `;
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
  }

  return lines.filter(Boolean);
}

function longestLine(lines: string[]): number {
  return lines.reduce((max, line) => Math.max(max, line.length), 0);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
