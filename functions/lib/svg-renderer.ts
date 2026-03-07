import type { ComicPanel, ComicScript } from './comic-generator.ts';

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 260;
const PADDING = 18;
const TAU = Math.PI * 2;

interface SketchControls {
  roughness: number;
  bowing: number;
  strokeJitter: number;
  multiStroke: boolean;
  multiStrokeOffset: number;
  shapeIrregularity: number;
  headAsymmetry: number;
  limbAngleVariance: number;
}

interface Point {
  x: number;
  y: number;
}

interface CharacterContext {
  controls: SketchControls;
  identityRng: () => number;
  frameRng: () => number;
  filterId: string;
}

interface StrokeOptions {
  fill?: string;
  stroke?: string;
  width?: number;
  opacity?: number;
  doubleStroke?: boolean;
}

const SKETCH_CONTROLS: SketchControls = {
  roughness: 1.45,
  bowing: 0.72,
  strokeJitter: 0.95,
  multiStroke: true,
  multiStrokeOffset: 0.78,
  shapeIrregularity: 0.92,
  headAsymmetry: 0.028,
  limbAngleVariance: 3.8,
};

export function renderComicToSVG(script: ComicScript): string {
  const panelCount = Math.max(1, script.panels.length);
  const totalWidth = PANEL_WIDTH * panelCount + PADDING * (panelCount + 1);
  const totalHeight = PANEL_HEIGHT + PADDING * 3 + 58;
  const renderSeed = hashString(`${script.day}|${script.title}|${script.model}|${panelCount}`);
  const titleRng = createRng(hashString(`title|${renderSeed}`));
  const titleUnderline = renderOpenSketch(
    roughLinePoints(
      { x: totalWidth * 0.24, y: 36 },
      { x: totalWidth * 0.76, y: 36 + jitter(titleRng, 0.9) },
      titleRng,
      SKETCH_CONTROLS,
      4,
      0.1,
    ),
    titleRng,
    { width: 1.8, opacity: 0.54, doubleStroke: false },
  );

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  <defs>
    <style>
      .comic-text {
        font-family: 'Chalkboard SE', 'Comic Sans MS', 'Marker Felt', 'Trebuchet MS', sans-serif;
        font-size: 14px;
        fill: #111;
      }
      .title-text {
        font-family: 'Chalkboard SE', 'Comic Sans MS', 'Marker Felt', 'Trebuchet MS', sans-serif;
        font-size: 22px;
        font-weight: 700;
        fill: #111;
      }
      .caption-text {
        font-family: 'Trebuchet MS', 'Verdana', sans-serif;
        font-size: 11px;
        fill: #3a3a3a;
      }
      .robot-thought {
        font-family: 'SFMono-Regular', 'Courier New', monospace;
        font-size: 11px;
        fill: #2f2f2f;
      }
    </style>
    ${buildFilters(renderSeed, panelCount)}
  </defs>

  <rect width="${totalWidth}" height="${totalHeight}" fill="white"/>
  <text x="${fmt(totalWidth / 2)}" y="28" text-anchor="middle" class="title-text">${escapeXml(script.title)}</text>
  ${titleUnderline}
`;

  script.panels.forEach((panel, index) => {
    const x = PADDING + index * (PANEL_WIDTH + PADDING);
    const y = 48;
    svg += renderPanel(panel, x, y, PANEL_WIDTH, PANEL_HEIGHT, script, renderSeed);
  });

  svg += `</svg>`;
  return svg;
}

function renderPanel(
  panel: ComicPanel,
  x: number,
  y: number,
  width: number,
  height: number,
  script: ComicScript,
  renderSeed: number,
): string {
  const panelSeed = hashString(`${renderSeed}|panel|${panel.panelNumber}|${panel.speaker}|${panel.dialogue || ''}|${panel.robotThought || ''}|${panel.action || ''}`);
  const borderRng = createRng(hashString(`border|${panelSeed}`));
  const border = renderClosedSketch(
    roughRectanglePoints(x, y, width, height, borderRng, SKETCH_CONTROLS, 2.8),
    borderRng,
    {
      fill: 'white',
      width: 2.45,
      opacity: 0.98,
      doubleStroke: true,
    },
    `url(#panel-wobble-${panel.panelNumber})`,
  );

  let content = `
  <!-- Panel ${panel.panelNumber} -->
  ${border}
`;

  if (panel.action) {
    const actionLines = wrapText(panel.action, 34).slice(0, 2);
    content += actionLines.map((line, index) => (
      `<text x="${fmt(x + 14)}" y="${fmt(y + 18 + index * 13)}" class="caption-text">${escapeXml(line)}</text>`
    )).join('');
  }

  const scene = detectScene(panel);
  const figureX = x + width / 2;
  const figureY = y + height - (scene === 'terminal' ? 112 : 108);

  if (scene === 'terminal') {
    content += drawTerminalScene(x + 26, y + height - 104, width - 52, panelSeed);
  }

  if (panel.dialogue) {
    content += drawSpeechBubble(x + width / 2, y + 26, panel.dialogue, width - 36, panelSeed);
  }

  if (panel.robotThought) {
    const thoughtY = panel.dialogue ? y + 86 : y + 28;
    content += drawThoughtBubble(x + width / 2, thoughtY, panel.robotThought, width - 36, panelSeed);
  }

  if (panel.speaker === 'robot') {
    content += drawRobotFigure(figureX, figureY - 30, panel, script.day);
  } else if (panel.speaker === 'simon') {
    content += drawSimonFigure(figureX, figureY - 30, panel, script.day);
  } else if (panel.speaker === 'boss') {
    content += drawBossFigure(figureX, figureY - 30, panel, script.day);
  } else if (panel.speaker === 'ferris') {
    content += drawFerrisFigure(figureX, figureY + 10, panel, script.day);
  } else {
    content += drawHumanFigure(figureX, figureY - 30, panel, script.day);
  }

  return content;
}

function drawHumanFigure(x: number, y: number, panel: ComicPanel, day: string): string {
  const ctx = createCharacterContext('user', panel, day);
  const pose = buildStandingPose(x, y, ctx, 0.9);
  return `<g filter="url(#${ctx.filterId})">${drawHumanLikeFigure(ctx, pose)}</g>`;
}

function drawSimonFigure(x: number, y: number, panel: ComicPanel, day: string): string {
  const ctx = createCharacterContext('simon', panel, day);
  const pose = buildStandingPose(x - 2, y - 1, ctx, 0.72);
  let content = `<g filter="url(#${ctx.filterId})">`;
  content += drawHumanLikeFigure(ctx, pose);

  const hatRng = createRng(hashString(`simon-hat|${day}|${panel.panelNumber}`));
  const brimY = pose.headCenter.y - 16;
  content += renderOpenSketch(
    roughLinePoints(
      { x: pose.headCenter.x - 24, y: brimY + jitter(hatRng, 0.6) },
      { x: pose.headCenter.x + 26, y: brimY + jitter(hatRng, 0.8) },
      hatRng,
      ctx.controls,
      4,
      0.06,
    ),
    hatRng,
    { width: 2.15, opacity: 0.98 },
  );
  content += renderClosedSketch(
    roughPolygonPoints([
      { x: pose.headCenter.x - 15, y: brimY - 1 },
      { x: pose.headCenter.x - 9, y: brimY - 13 },
      { x: pose.headCenter.x + 7, y: brimY - 15 },
      { x: pose.headCenter.x + 15, y: brimY - 2 },
    ], hatRng, 1.3),
    hatRng,
    { fill: 'white', width: 2.0, opacity: 0.97 },
  );

  const beardRng = createRng(hashString(`simon-beard|${day}|${panel.panelNumber}`));
  for (let index = 0; index < 3; index += 1) {
    const start = { x: pose.headCenter.x - 3 + index * 3, y: pose.headCenter.y + 11 + jitter(beardRng, 0.8) };
    const end = { x: start.x + jitter(beardRng, 1.2), y: pose.headCenter.y + 18 + jitter(beardRng, 1.1) };
    content += renderOpenSketch(
      roughLinePoints(start, end, beardRng, ctx.controls, 3, 0.03),
      beardRng,
      { width: 1.4, opacity: 0.9, stroke: '#666', doubleStroke: false },
    );
  }

  content += `</g>`;
  return content;
}

function drawBossFigure(x: number, y: number, panel: ComicPanel, day: string): string {
  const ctx = createCharacterContext('boss', panel, day);
  const pose = buildStandingPose(x + 2, y, ctx, 1.15);
  let content = `<g filter="url(#${ctx.filterId})">`;
  content += drawHumanLikeFigure(ctx, pose);

  const tieRng = createRng(hashString(`boss-tie|${day}|${panel.panelNumber}`));
  content += renderClosedSketch(
    roughPolygonPoints([
      { x: pose.torsoTop.x - 3, y: pose.torsoTop.y + 4 },
      { x: pose.torsoTop.x + 4, y: pose.torsoTop.y + 5 },
      { x: pose.torsoTop.x + 1, y: pose.torsoTop.y + 20 },
      { x: pose.torsoTop.x - 5, y: pose.torsoTop.y + 19 },
    ], tieRng, 0.9),
    tieRng,
    { fill: 'white', width: 1.55, opacity: 0.92, doubleStroke: false },
  );

  content += renderOpenSketch(
    roughLinePoints(
      { x: pose.torsoTop.x - 1, y: pose.torsoTop.y + 4 },
      { x: pose.torsoTop.x - 4, y: pose.torsoTop.y + 14 },
      tieRng,
      ctx.controls,
      3,
      0.04,
    ),
    tieRng,
    { width: 1.35, opacity: 0.92, doubleStroke: false },
  );
  content += renderOpenSketch(
    roughLinePoints(
      { x: pose.torsoTop.x + 2, y: pose.torsoTop.y + 4 },
      { x: pose.torsoTop.x + 1, y: pose.torsoTop.y + 14 },
      tieRng,
      ctx.controls,
      3,
      0.04,
    ),
    tieRng,
    { width: 1.35, opacity: 0.92, doubleStroke: false },
  );

  content += `</g>`;
  return content;
}

function drawRobotFigure(x: number, y: number, panel: ComicPanel, day: string): string {
  const ctx = createCharacterContext('robot', panel, day);
  const rng = ctx.frameRng;
  const lean = jitter(ctx.identityRng, 1.6);
  const headX = x + lean;
  const headY = y + jitter(rng, 0.8);
  const headWidth = 25 + jitter(ctx.identityRng, 1.4);
  const headHeight = 24 + jitter(ctx.identityRng, 1.2);
  const neck = { x: headX + jitter(rng, 0.3), y: headY + headHeight * 0.5 };
  const hip = { x: x + lean * 0.45, y: y + 50 };
  const shoulder = { x: x + lean * 0.35, y: y + 30 };
  const leftHand = { x: x - 20 + jitter(rng, 1.4), y: y + 49 + jitter(rng, 1.2) };
  const rightHand = { x: x + 20 + jitter(rng, 1.1), y: y + 48 + jitter(rng, 1.0) };
  const leftFoot = { x: x - 15 + jitter(rng, 1.4), y: y + 80 + jitter(rng, 1.0) };
  const rightFoot = { x: x + 16 + jitter(rng, 1.2), y: y + 80 + jitter(rng, 1.0) };

  let content = `<g filter="url(#${ctx.filterId})">`;
  content += renderOpenSketch(
    roughLinePoints(
      { x: headX + jitter(rng, 0.3), y: headY - 10 },
      { x: headX + jitter(rng, 0.2), y: headY - 4 },
      rng,
      ctx.controls,
      3,
      0.05,
    ),
    rng,
    { width: 1.9, opacity: 0.98 },
  );
  content += renderClosedSketch(
    roughLoopPoints(headX, headY - 12, 3.4, 3.2, rng, ctx.controls, { pointCount: 8, asymmetry: 0.01 }),
    rng,
    { fill: 'black', width: 1.1, opacity: 0.95, doubleStroke: false },
  );
  content += renderClosedSketch(
    roughRectanglePoints(headX - headWidth / 2, headY - headHeight / 2, headWidth, headHeight, rng, ctx.controls, 2.2),
    rng,
    { fill: 'white', width: 2.3, opacity: 0.98 },
  );
  content += renderClosedSketch(
    roughLoopPoints(headX - 5.4, headY - 2, 1.9, 2.3, rng, ctx.controls, { pointCount: 8 }),
    rng,
    { fill: 'black', width: 1.0, opacity: 0.95, doubleStroke: false },
  );
  content += renderClosedSketch(
    roughLoopPoints(headX + 5.3, headY - 1.8, 2.0, 2.1, rng, ctx.controls, { pointCount: 8 }),
    rng,
    { fill: 'black', width: 1.0, opacity: 0.95, doubleStroke: false },
  );
  content += renderOpenSketch(
    roughLinePoints(
      { x: headX - 6.6, y: headY + 6 },
      { x: headX + 6.2, y: headY + 6.5 + jitter(rng, 0.4) },
      rng,
      ctx.controls,
      4,
      0.05,
    ),
    rng,
    { width: 1.5, opacity: 0.88, doubleStroke: false },
  );
  content += renderOpenSketch(roughLinePoints(neck, hip, rng, ctx.controls, 4, 0.08), rng, { width: 2.25, opacity: 0.98 });
  content += renderOpenSketch(roughLinePoints(shoulder, leftHand, rng, ctx.controls, 4, 0.09), rng, { width: 2.1, opacity: 0.97 });
  content += renderOpenSketch(roughLinePoints(shoulder, rightHand, rng, ctx.controls, 4, 0.09), rng, { width: 2.1, opacity: 0.97 });
  content += renderOpenSketch(roughLinePoints(hip, leftFoot, rng, ctx.controls, 4, 0.08), rng, { width: 2.15, opacity: 0.98 });
  content += renderOpenSketch(roughLinePoints(hip, rightFoot, rng, ctx.controls, 4, 0.08), rng, { width: 2.15, opacity: 0.98 });
  content += `</g>`;
  return content;
}

function drawFerrisFigure(x: number, y: number, panel: ComicPanel, day: string): string {
  const ctx = createCharacterContext('ferris', panel, day);
  const rng = ctx.frameRng;
  const body = roughLoopPoints(x, y, 18.5, 12.5, rng, ctx.controls, {
    pointCount: 12,
    asymmetry: 0.022,
    radialVariance: 0.14,
  });

  let content = `<g filter="url(#${ctx.filterId})">`;
  content += renderClosedSketch(body, rng, { fill: 'white', width: 2.2, opacity: 0.98 });

  const legs = [
    [{ x: x - 10, y: y + 10 }, { x: x - 18, y: y + 18 }],
    [{ x: x - 4, y: y + 10 }, { x: x - 8, y: y + 20 }],
    [{ x: x + 4, y: y + 10 }, { x: x + 8, y: y + 20 }],
    [{ x: x + 10, y: y + 10 }, { x: x + 18, y: y + 18 }],
    [{ x: x - 10, y: y - 4 }, { x: x - 18, y: y - 16 }],
    [{ x: x + 10, y: y - 4 }, { x: x + 18, y: y - 16 }],
  ];

  for (const [start, end] of legs) {
    content += renderOpenSketch(
      roughLinePoints(start, end, rng, ctx.controls, 4, 0.08),
      rng,
      { width: 2.0, opacity: 0.96 },
    );
  }

  content += renderClosedSketch(
    roughLoopPoints(x - 6, y - 2, 1.8, 1.8, rng, ctx.controls, { pointCount: 8 }),
    rng,
    { fill: 'black', width: 0.9, opacity: 0.95, doubleStroke: false },
  );
  content += renderClosedSketch(
    roughLoopPoints(x + 6, y - 1.8, 1.8, 1.8, rng, ctx.controls, { pointCount: 8 }),
    rng,
    { fill: 'black', width: 0.9, opacity: 0.95, doubleStroke: false },
  );
  content += `</g>`;
  return content;
}

function drawHumanLikeFigure(ctx: CharacterContext, pose: ReturnType<typeof buildStandingPose>): string {
  const rng = ctx.frameRng;
  let content = '';

  content += renderClosedSketch(
    roughLoopPoints(
      pose.headCenter.x,
      pose.headCenter.y,
      15 * pose.headScaleX,
      15 * pose.headScaleY,
      rng,
      ctx.controls,
      { pointCount: 11, asymmetry: pose.headAsymmetry, radialVariance: 0.11 },
    ),
    rng,
    { fill: 'white', width: 2.3, opacity: 0.98 },
  );
  content += renderOpenSketch(roughLinePoints(pose.torsoTop, pose.hip, rng, ctx.controls, 4, 0.1), rng, { width: 2.25, opacity: 0.97 });
  content += renderOpenSketch(roughLinePoints(pose.shoulder, pose.leftHand, rng, ctx.controls, 4, 0.1), rng, { width: 2.1, opacity: 0.96 });
  content += renderOpenSketch(roughLinePoints(pose.shoulder, pose.rightHand, rng, ctx.controls, 4, 0.1), rng, { width: 2.05, opacity: 0.96 });
  content += renderOpenSketch(roughLinePoints(pose.hip, pose.leftFoot, rng, ctx.controls, 4, 0.09), rng, { width: 2.15, opacity: 0.98 });
  content += renderOpenSketch(roughLinePoints(pose.hip, pose.rightFoot, rng, ctx.controls, 4, 0.09), rng, { width: 2.15, opacity: 0.98 });

  return content;
}

function buildStandingPose(x: number, y: number, ctx: CharacterContext, leanMultiplier: number) {
  const id = ctx.identityRng;
  const frame = ctx.frameRng;
  const limbDrift = ctx.controls.limbAngleVariance * 0.4;
  const headScaleX = 1 + randBetween(id, -0.04, 0.04);
  const headScaleY = 1 + randBetween(id, -0.03, 0.05);
  const headAsymmetry = randBetween(id, -ctx.controls.headAsymmetry, ctx.controls.headAsymmetry);
  const torsoLean = randBetween(id, -2.3, 2.1) * leanMultiplier + jitter(frame, 0.55);
  const shoulderTilt = randBetween(id, -2.2, 2.2) + jitter(frame, 0.45);
  const armSpread = 20 + randBetween(id, -2.4, 2.7);
  const leftArmDrop = 19 + randBetween(frame, -2.0, 2.4);
  const rightArmDrop = 18 + randBetween(frame, -2.2, 2.0);
  const leftLegSpread = 15 + randBetween(id, -1.6, 2.2);
  const rightLegSpread = 15 + randBetween(id, -1.4, 2.1);
  const hipDrift = randBetween(frame, -1.0, 1.0);

  const headCenter = { x: x + randBetween(frame, -0.8, 0.8), y: y + randBetween(frame, -0.8, 0.9) };
  const torsoTop = { x: headCenter.x + randBetween(frame, -0.4, 0.4), y: headCenter.y + 15 };
  const shoulder = { x: headCenter.x + torsoLean * 0.15, y: headCenter.y + 30 + shoulderTilt * 0.1 };
  const hip = { x: headCenter.x + torsoLean + hipDrift, y: headCenter.y + 51 };
  const leftHand = { x: shoulder.x - armSpread + randBetween(frame, -limbDrift, limbDrift), y: shoulder.y + leftArmDrop };
  const rightHand = { x: shoulder.x + armSpread + randBetween(frame, -limbDrift, limbDrift), y: shoulder.y + rightArmDrop };
  const leftFoot = { x: hip.x - leftLegSpread + randBetween(frame, -limbDrift * 0.7, limbDrift * 0.7), y: hip.y + 30 + randBetween(frame, -1.0, 1.4) };
  const rightFoot = { x: hip.x + rightLegSpread + randBetween(frame, -limbDrift * 0.7, limbDrift * 0.7), y: hip.y + 30 + randBetween(frame, -1.2, 1.2) };

  return {
    headCenter,
    torsoTop,
    shoulder,
    hip,
    leftHand,
    rightHand,
    leftFoot,
    rightFoot,
    headScaleX,
    headScaleY,
    headAsymmetry,
  };
}

function drawSpeechBubble(x: number, y: number, text: string, maxWidth: number, seed: number): string {
  const lines = wrapText(text, 28).slice(0, 4);
  const bubbleHeight = lines.length * 16 + 22;
  const bubbleWidth = Math.min(maxWidth, Math.max(156, longestLine(lines) * 7.2 + 34));
  const rng = createRng(hashString(`speech|${seed}|${text}`));
  const outline = roughLoopPoints(x, y + bubbleHeight / 2, bubbleWidth / 2, bubbleHeight / 2, rng, SKETCH_CONTROLS, {
    pointCount: 14,
    asymmetry: 0.03,
    radialVariance: 0.12,
  });
  const tail = roughPolygonPoints([
    { x: x - 10 + jitter(rng, 1.1), y: y + bubbleHeight - 4 },
    { x: x - 2 + jitter(rng, 0.8), y: y + bubbleHeight + 11 + jitter(rng, 0.8) },
    { x: x + 7 + jitter(rng, 1.0), y: y + bubbleHeight - 1 },
  ], rng, 1.2);

  return `
  <g filter="url(#bubble-wobble)">
    ${renderClosedSketch(outline, rng, { fill: 'white', width: 2.0, opacity: 0.98 })}
    ${renderClosedSketch(tail, rng, { fill: 'white', width: 1.8, opacity: 0.97, doubleStroke: false })}
  </g>
  ${lines.map((line, index) => (
    `<text x="${fmt(x)}" y="${fmt(y + 22 + index * 16)}" text-anchor="middle" class="comic-text">${escapeXml(line)}</text>`
  )).join('')}
`;
}

function drawThoughtBubble(x: number, y: number, text: string, maxWidth: number, seed: number): string {
  const lines = wrapText(text, 30).slice(0, 4);
  const bubbleHeight = lines.length * 14 + 24;
  const bubbleWidth = Math.min(maxWidth, Math.max(176, longestLine(lines) * 7 + 40));
  const rng = createRng(hashString(`thought|${seed}|${text}`));
  const cloud = roughCloudPoints(x, y + bubbleHeight / 2, bubbleWidth / 2, bubbleHeight / 2, rng);
  const puffOne = roughLoopPoints(x - 24, y + bubbleHeight + 3, 4.4, 4.1, rng, SKETCH_CONTROLS, { pointCount: 8, radialVariance: 0.1 });
  const puffTwo = roughLoopPoints(x - 12, y + bubbleHeight + 12, 3.4, 3.1, rng, SKETCH_CONTROLS, { pointCount: 8, radialVariance: 0.1 });

  return `
  <g filter="url(#thought-wobble)">
    ${renderClosedSketch(cloud, rng, { fill: '#f6f6f6', width: 1.9, opacity: 0.97 })}
    ${renderClosedSketch(puffOne, rng, { fill: '#f6f6f6', width: 1.2, opacity: 0.95, doubleStroke: false })}
    ${renderClosedSketch(puffTwo, rng, { fill: '#f6f6f6', width: 1.1, opacity: 0.95, doubleStroke: false })}
  </g>
  ${lines.map((line, index) => (
    `<text x="${fmt(x)}" y="${fmt(y + 18 + index * 14)}" text-anchor="middle" class="robot-thought">${escapeXml(line)}</text>`
  )).join('')}
`;
}

function drawTerminalScene(x: number, y: number, width: number, seed: number): string {
  const rng = createRng(hashString(`terminal|${seed}|${width}`));
  const deskLeft = { x, y: y + 26 + jitter(rng, 0.9) };
  const deskRight = { x: x + width, y: y + 23 + jitter(rng, 1.2) };
  const monitorX = x + width * 0.56;
  const monitorY = y - 20;

  let content = `<g filter="url(#prop-wobble)">`;
  content += renderOpenSketch(roughLinePoints(deskLeft, deskRight, rng, SKETCH_CONTROLS, 4, 0.06), rng, { width: 2.1, opacity: 0.88 });
  content += renderOpenSketch(
    roughLinePoints(
      { x: monitorX - 20, y: monitorY + 18 },
      { x: monitorX - 4, y: monitorY + 26 },
      rng,
      SKETCH_CONTROLS,
      3,
      0.05,
    ),
    rng,
    { width: 1.8, opacity: 0.82, doubleStroke: false },
  );
  content += renderClosedSketch(
    roughRectanglePoints(monitorX - 34, monitorY - 18, 64, 38, rng, SKETCH_CONTROLS, 2.2),
    rng,
    { fill: 'white', width: 1.9, opacity: 0.88, doubleStroke: false },
  );
  content += renderOpenSketch(
    roughLinePoints(
      { x: monitorX - 26, y: monitorY - 4 },
      { x: monitorX + 20, y: monitorY - 7 + jitter(rng, 0.5) },
      rng,
      SKETCH_CONTROLS,
      4,
      0.05,
    ),
    rng,
    { width: 1.3, opacity: 0.74, doubleStroke: false },
  );
  content += renderClosedSketch(
    roughPolygonPoints([
      { x: x + width * 0.34 - 22, y: y + 8 },
      { x: x + width * 0.34 + 22, y: y + 4 },
      { x: x + width * 0.34 + 19, y: y + 14 },
      { x: x + width * 0.34 - 20, y: y + 16 },
    ], rng, 1.3),
    rng,
    { fill: 'white', width: 1.5, opacity: 0.78, doubleStroke: false },
  );
  content += renderOpenSketch(
    roughLinePoints(
      { x: x + width * 0.34 - 14, y: y + 10 },
      { x: x + width * 0.34 + 12, y: y + 8 + jitter(rng, 0.5) },
      rng,
      SKETCH_CONTROLS,
      4,
      0.04,
    ),
    rng,
    { width: 0.95, opacity: 0.62, doubleStroke: false },
  );
  content += renderClosedSketch(
    roughLoopPoints(x + width * 0.18, y + 10, 7.5, 7.5, rng, SKETCH_CONTROLS, { pointCount: 10, radialVariance: 0.09 }),
    rng,
    { fill: 'white', width: 1.35, opacity: 0.8, doubleStroke: false },
  );
  content += renderOpenSketch(
    roughLinePoints(
      { x: x + width * 0.18 + 4, y: y + 3 },
      { x: x + width * 0.18 + 8, y: y - 2 + jitter(rng, 0.6) },
      rng,
      SKETCH_CONTROLS,
      3,
      0.04,
    ),
    rng,
    { width: 1.0, opacity: 0.7, doubleStroke: false },
  );
  content += `</g>`;
  return content;
}

function createCharacterContext(kind: string, panel: ComicPanel, day: string): CharacterContext {
  return {
    controls: SKETCH_CONTROLS,
    identityRng: createRng(hashString(`character|${kind}`)),
    frameRng: createRng(hashString(`frame|${kind}|${day}|${panel.panelNumber}|${panel.dialogue || ''}|${panel.robotThought || ''}`)),
    filterId: `character-wobble-${kind}`,
  };
}

function detectScene(panel: ComicPanel): 'plain' | 'terminal' {
  const haystack = `${panel.action || ''} ${panel.dialogue || ''} ${panel.robotThought || ''}`.toLowerCase();
  const terminalPattern = /\b(type|typing|terminal|deploy|build|compile|keyboard|cursor|shell|screen|monitor|reply|debug|logs?|ssh|kubectl|merge|commit|branch|cache|prod|production|api|prompt|code)\b/;
  return terminalPattern.test(haystack) ? 'terminal' : 'plain';
}

function buildFilters(renderSeed: number, panelCount: number): string {
  const filters: string[] = [];

  for (let index = 0; index < panelCount; index += 1) {
    filters.push(buildFilter(`panel-wobble-${index + 1}`, renderSeed + index * 17, 0.0105, 0.55));
  }

  filters.push(buildFilter('bubble-wobble', renderSeed + 101, 0.0095, 0.45));
  filters.push(buildFilter('thought-wobble', renderSeed + 151, 0.0105, 0.55));
  filters.push(buildFilter('prop-wobble', renderSeed + 181, 0.011, 0.48));
  filters.push(buildFilter('character-wobble-user', renderSeed + 211, 0.011, 0.6));
  filters.push(buildFilter('character-wobble-robot', renderSeed + 241, 0.0115, 0.62));
  filters.push(buildFilter('character-wobble-simon', renderSeed + 271, 0.0108, 0.58));
  filters.push(buildFilter('character-wobble-boss', renderSeed + 301, 0.0106, 0.57));
  filters.push(buildFilter('character-wobble-ferris', renderSeed + 331, 0.0112, 0.6));

  return filters.join('\n');
}

function buildFilter(id: string, seed: number, baseFrequency: number, scale: number): string {
  return `<filter id="${id}" x="-8%" y="-8%" width="116%" height="116%">
    <feTurbulence type="fractalNoise" baseFrequency="${fmt(baseFrequency)} ${fmt(baseFrequency * 1.7)}" numOctaves="1" seed="${Math.abs(seed % 997)}" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="${fmt(scale)}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;
}

function renderOpenSketch(points: Point[], rng: () => number, options: StrokeOptions = {}, filter?: string): string {
  const basePath = pathFromPoints(points, false);
  const lines = [buildSketchPath(basePath, rng, options, filter)];

  if (options.doubleStroke !== false && SKETCH_CONTROLS.multiStroke) {
    const secondPass = points.map((point) => ({
      x: point.x + jitter(rng, SKETCH_CONTROLS.multiStrokeOffset),
      y: point.y + jitter(rng, SKETCH_CONTROLS.multiStrokeOffset),
    }));
    lines.push(buildSketchPath(
      pathFromPoints(secondPass, false),
      rng,
      { ...options, fill: 'none', width: (options.width || 2.35) - 0.25, opacity: clamp((options.opacity || 0.96) - 0.06, 0.72, 0.98), doubleStroke: false },
      filter,
    ));
  }

  return lines.join('');
}

function renderClosedSketch(points: Point[], rng: () => number, options: StrokeOptions = {}, filter?: string): string {
  const basePath = pathFromPoints(points, true);
  const lines = [buildSketchPath(basePath, rng, options, filter)];

  if (options.doubleStroke !== false && SKETCH_CONTROLS.multiStroke) {
    const secondPass = points.map((point) => ({
      x: point.x + jitter(rng, SKETCH_CONTROLS.multiStrokeOffset),
      y: point.y + jitter(rng, SKETCH_CONTROLS.multiStrokeOffset),
    }));
    lines.push(buildSketchPath(
      pathFromPoints(secondPass, true),
      rng,
      { ...options, fill: 'none', width: (options.width || 2.35) - 0.25, opacity: clamp((options.opacity || 0.96) - 0.07, 0.72, 0.98), doubleStroke: false },
      filter,
    ));
  }

  return lines.join('');
}

function buildSketchPath(d: string, rng: () => number, options: StrokeOptions, filter?: string): string {
  const width = clamp((options.width || 2.45) + randBetween(rng, -0.22, 0.35), 1.0, 3.4);
  const opacity = clamp(options.opacity ?? (0.92 + rng() * 0.08), 0.6, 1);
  const fill = options.fill ?? 'none';
  const stroke = options.stroke ?? '#111';
  const filterAttr = filter ? ` filter="${filter}"` : '';

  return `<path d="${d}"${filterAttr} fill="${fill}" stroke="${stroke}" stroke-width="${fmt(width)}" stroke-linecap="round" stroke-linejoin="round" opacity="${fmt(opacity)}"/>`;
}

function roughLinePoints(
  start: Point,
  end: Point,
  rng: () => number,
  controls: SketchControls,
  preferredSegments = 4,
  bowScale = 0.1,
): Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const roughness = controls.roughness;
  const segments = Math.max(2, preferredSegments + Math.round(randBetween(rng, -roughness * 0.8, roughness * 0.8)));
  const bowMagnitude = length * bowScale * controls.bowing * (0.28 + roughness * 0.05);
  const endpointDrift = controls.strokeJitter * 0.35 * roughness;
  const points: Point[] = [{
    x: start.x + jitter(rng, endpointDrift),
    y: start.y + jitter(rng, endpointDrift),
  }];

  for (let index = 1; index < segments; index += 1) {
    const t = index / segments;
    const base = {
      x: lerp(start.x, end.x, t),
      y: lerp(start.y, end.y, t),
    };
    const bow = Math.sin(Math.PI * t) * bowMagnitude * randBetween(rng, 0.65, 1.35);
    const longitudinal = jitter(rng, controls.strokeJitter * 0.4 * roughness);
    points.push({
      x: base.x + nx * bow + (dx / length) * longitudinal + jitter(rng, controls.strokeJitter * roughness),
      y: base.y + ny * bow + (dy / length) * longitudinal + jitter(rng, controls.strokeJitter * roughness),
    });
  }

  points.push({
    x: end.x + jitter(rng, endpointDrift),
    y: end.y + jitter(rng, endpointDrift),
  });

  return points;
}

function roughLoopPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rng: () => number,
  controls: SketchControls,
  options: { pointCount?: number; asymmetry?: number; radialVariance?: number } = {},
): Point[] {
  const pointCount = options.pointCount || 12;
  const asymmetry = options.asymmetry || 0;
  const radialVariance = (options.radialVariance || 0.09) * controls.roughness;
  const points: Point[] = [];

  for (let index = 0; index < pointCount; index += 1) {
    const angle = (index / pointCount) * TAU + jitter(rng, 0.05);
    const sideBias = Math.cos(angle) > 0 ? asymmetry : -asymmetry;
    const radialScale = 1 + sideBias + randBetween(rng, -radialVariance, radialVariance) * controls.shapeIrregularity;
    points.push({
      x: cx + Math.cos(angle) * rx * radialScale + jitter(rng, controls.strokeJitter * 0.45),
      y: cy + Math.sin(angle) * ry * (1 + randBetween(rng, -radialVariance, radialVariance) * controls.shapeIrregularity) + jitter(rng, controls.strokeJitter * 0.45),
    });
  }

  return points;
}

function roughCloudPoints(cx: number, cy: number, rx: number, ry: number, rng: () => number): Point[] {
  const points: Point[] = [];
  const lobes = 16;

  for (let index = 0; index < lobes; index += 1) {
    const angle = (index / lobes) * TAU + jitter(rng, 0.04);
    const pulse = index % 2 === 0 ? 1.06 : 0.9;
    const radiusDrift = 1 + randBetween(rng, -0.09, 0.12);
    points.push({
      x: cx + Math.cos(angle) * rx * pulse * radiusDrift + jitter(rng, 0.75),
      y: cy + Math.sin(angle) * ry * pulse * radiusDrift + jitter(rng, 0.75),
    });
  }

  return points;
}

function roughRectanglePoints(
  x: number,
  y: number,
  width: number,
  height: number,
  rng: () => number,
  controls: SketchControls,
  cornerDrift: number,
): Point[] {
  return roughPolygonPoints([
    { x: x + jitter(rng, cornerDrift), y: y + jitter(rng, cornerDrift) },
    { x: x + width * 0.5 + jitter(rng, controls.strokeJitter), y: y + jitter(rng, cornerDrift) },
    { x: x + width + jitter(rng, cornerDrift), y: y + jitter(rng, cornerDrift) },
    { x: x + width + jitter(rng, cornerDrift), y: y + height * 0.5 + jitter(rng, controls.strokeJitter) },
    { x: x + width + jitter(rng, cornerDrift), y: y + height + jitter(rng, cornerDrift) },
    { x: x + width * 0.48 + jitter(rng, controls.strokeJitter), y: y + height + jitter(rng, cornerDrift) },
    { x: x + jitter(rng, cornerDrift), y: y + height + jitter(rng, cornerDrift) },
    { x: x + jitter(rng, cornerDrift), y: y + height * 0.52 + jitter(rng, controls.strokeJitter) },
  ], rng, 0);
}

function roughPolygonPoints(points: Point[], rng: () => number, drift: number): Point[] {
  const roughPoints: Point[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % points.length];
    roughPoints.push({
      x: point.x + jitter(rng, drift),
      y: point.y + jitter(rng, drift),
    });
    if (index < points.length - 1 || next !== points[0]) {
      roughPoints.push({
        x: lerp(point.x, next.x, 0.52) + jitter(rng, drift * 0.9 + 0.45),
        y: lerp(point.y, next.y, 0.48) + jitter(rng, drift * 0.9 + 0.45),
      });
    }
  }

  return roughPoints;
}

function pathFromPoints(points: Point[], closed: boolean): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  if (points.length === 2) {
    const start = points[0];
    const end = points[1];
    return `M ${fmt(start.x)} ${fmt(start.y)} Q ${fmt(lerp(start.x, end.x, 0.5))} ${fmt(lerp(start.y, end.y, 0.5))} ${fmt(end.x)} ${fmt(end.y)}`;
  }

  if (closed) {
    const loop = [...points];
    let d = '';
    for (let index = 0; index < loop.length; index += 1) {
      const previous = loop[(index - 1 + loop.length) % loop.length];
      const current = loop[index];
      const next = loop[(index + 1) % loop.length];
      const start = midpoint(previous, current);
      const end = midpoint(current, next);
      d += index === 0
        ? `M ${fmt(start.x)} ${fmt(start.y)} Q ${fmt(current.x)} ${fmt(current.y)} ${fmt(end.x)} ${fmt(end.y)}`
        : ` Q ${fmt(current.x)} ${fmt(current.y)} ${fmt(end.x)} ${fmt(end.y)}`;
    }
    return `${d} Z`;
  }

  let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const end = midpoint(current, next);
    d += ` Q ${fmt(current.x)} ${fmt(current.y)} ${fmt(end.x)} ${fmt(end.y)}`;
  }
  const last = points[points.length - 1];
  return `${d} T ${fmt(last.x)} ${fmt(last.y)}`;
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ').filter(Boolean);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length > maxChars && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) lines.push(currentLine);
  }

  return lines.filter(Boolean);
}

function longestLine(lines: string[]): number {
  return lines.reduce((max, line) => Math.max(max, line.length), 0);
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRng(seed: number): () => number {
  let state = seed || 1;

  return () => {
    state += 0x6D2B79F5;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function randBetween(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

function jitter(rng: () => number, amount: number): number {
  return randBetween(rng, -amount, amount);
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function fmt(value: number): string {
  return value.toFixed(2).replace(/\.00$/, '');
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
