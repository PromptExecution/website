import type { ComicExpression, ComicPanel, ComicScene, ComicScript } from './comic-generator.ts';

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
        font-size: 13px;
        fill: #111;
      }
      .title-text {
        font-family: 'Chalkboard SE', 'Comic Sans MS', 'Marker Felt', 'Trebuchet MS', sans-serif;
        font-size: 16px;
        font-weight: 600;
        fill: #444;
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
      .screen-text {
        font-family: 'SFMono-Regular', 'Courier New', monospace;
        font-size: 6px;
        font-weight: 600;
        fill: #292929;
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
  const panelSeed = hashString(`${renderSeed}|panel|${panel.panelNumber}|${panel.speaker}|${panel.dialogue || ''}|${panel.robotThought || ''}|${panel.action || ''}|${panel.screenText || ''}`);
  const borderRng = createRng(hashString(`border|${panelSeed}`));
  const border = renderClosedSketch(
    roughRectanglePoints(x, y, width, height, borderRng, SKETCH_CONTROLS, 2.8),
    borderRng,
    {
      fill: 'white',
      stroke: '#4a4a4a',
      width: 1.55,
      opacity: 0.74,
      doubleStroke: true,
    },
    `url(#panel-wobble-${panel.panelNumber})`,
  );

  let content = `
  <!-- Panel ${panel.panelNumber} -->
  ${border}
`;

  const scene = detectScene(panel);
  const pose = normalizePose(panel.pose);
  const figureX = x + width / 2;
  const figureY = y + height - (scene === 'terminal' || scene === 'desk' ? 90 : 84);

  content += drawSceneBackdrop(scene, x, y, width, height, panel, panelSeed);

  if (panel.dialogue) {
    const bubbleX = getBubbleX(panel, x, width, panelSeed);
    content += drawSpeechBubble(bubbleX, y + 20, panel.dialogue, width * 0.56, panelSeed);
  }

  if (panel.robotThought) {
    const thoughtY = panel.dialogue ? y + 70 : y + 20;
    const thoughtX = getThoughtBubbleX(panel, x, width, panelSeed);
    content += drawThoughtBubble(thoughtX, thoughtY, panel.robotThought, width * 0.54, panelSeed);
  }

  if (panel.speaker === 'robot') {
    content += drawRobotFigure(figureX, figureY - 24, panel, script.day, pose);
  } else if (panel.speaker === 'simon') {
    content += drawSimonFigure(figureX, figureY - 24, panel, script.day, pose);
  } else if (panel.speaker === 'boss') {
    content += drawBossFigure(figureX, figureY - 24, panel, script.day, pose);
  } else if (panel.speaker === 'ferris') {
    content += drawFerrisFigure(figureX, figureY + 10, panel, script.day);
  } else if (panel.speaker === 'tux') {
    content += drawTuxFigure(figureX, figureY - 4, panel, script.day);
  } else if (panel.speaker === 'python') {
    content += drawPythonFigure(figureX, figureY + 18, panel, script.day);
  } else if (panel.speaker === 'kube_captain') {
    content += drawKubeCaptainFigure(figureX, figureY - 24, panel, script.day, pose);
  } else {
    content += drawHumanFigure(figureX, figureY - 24, panel, script.day, pose);
  }

  if (panel.cameo === 'ferris' && panel.speaker !== 'ferris') {
    content += drawFerrisFigure(x + width - 42, y + height - 62, { ...panel, expression: 'delighted' }, script.day);
  }

  return content;
}

function drawHumanFigure(x: number, y: number, panel: ComicPanel, day: string, pose: string): string {
  const ctx = createCharacterContext('user', panel, day);
  const skeleton = buildStandingPose(x, y, ctx, 0.9, 1.28, pose);
  return `<g filter="url(#${ctx.filterId})">${drawHumanLikeFigure(ctx, skeleton, normalizeExpression(panel.expression, 'user'))}</g>`;
}

function drawSimonFigure(x: number, y: number, panel: ComicPanel, day: string, pose: string): string {
  const ctx = createCharacterContext('simon', panel, day);
  const skeleton = buildStandingPose(x - 2, y - 1, ctx, 0.72, 1.22, pose === 'neutral' ? 'deadpan' : pose);
  let content = `<g filter="url(#${ctx.filterId})">`;
  content += drawHumanLikeFigure(ctx, skeleton, normalizeExpression(panel.expression, 'simon'));

  const hatRng = createRng(hashString(`simon-hat|${day}|${panel.panelNumber}`));
  const brimY = skeleton.headCenter.y - 16;
  content += renderOpenSketch(
    roughLinePoints(
      { x: skeleton.headCenter.x - 24, y: brimY + jitter(hatRng, 0.6) },
      { x: skeleton.headCenter.x + 26, y: brimY + jitter(hatRng, 0.8) },
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
      { x: skeleton.headCenter.x - 15, y: brimY - 1 },
      { x: skeleton.headCenter.x - 9, y: brimY - 13 },
      { x: skeleton.headCenter.x + 7, y: brimY - 15 },
      { x: skeleton.headCenter.x + 15, y: brimY - 2 },
    ], hatRng, 1.3),
    hatRng,
    { fill: 'white', width: 2.0, opacity: 0.97 },
  );

  const beardRng = createRng(hashString(`simon-beard|${day}|${panel.panelNumber}`));
  for (let index = 0; index < 3; index += 1) {
    const start = { x: skeleton.headCenter.x - 3 + index * 3, y: skeleton.headCenter.y + 11 + jitter(beardRng, 0.8) };
    const end = { x: start.x + jitter(beardRng, 1.2), y: skeleton.headCenter.y + 18 + jitter(beardRng, 1.1) };
    content += renderOpenSketch(
      roughLinePoints(start, end, beardRng, ctx.controls, 3, 0.03),
      beardRng,
      { width: 1.4, opacity: 0.9, stroke: '#666', doubleStroke: false },
    );
  }

  content += drawSquareGlasses(ctx, skeleton.headCenter);

  content += `</g>`;
  return content;
}

function drawBossFigure(x: number, y: number, panel: ComicPanel, day: string, pose: string): string {
  const ctx = createCharacterContext('boss', panel, day);
  const skeleton = buildStandingPose(x + 2, y, ctx, 1.15, 1.25, poseFromBoss(pose));
  let content = `<g filter="url(#${ctx.filterId})">`;
  content += drawHumanLikeFigure(ctx, skeleton, normalizeExpression(panel.expression, 'boss'));

  const tieRng = createRng(hashString(`boss-tie|${day}|${panel.panelNumber}`));
  content += renderClosedSketch(
    roughPolygonPoints([
      { x: skeleton.torsoTop.x - 3, y: skeleton.torsoTop.y + 4 },
      { x: skeleton.torsoTop.x + 4, y: skeleton.torsoTop.y + 5 },
      { x: skeleton.torsoTop.x + 1, y: skeleton.torsoTop.y + 20 },
      { x: skeleton.torsoTop.x - 5, y: skeleton.torsoTop.y + 19 },
    ], tieRng, 0.9),
    tieRng,
    { fill: 'white', width: 1.55, opacity: 0.92, doubleStroke: false },
  );

  content += renderOpenSketch(
    roughLinePoints(
      { x: skeleton.torsoTop.x - 1, y: skeleton.torsoTop.y + 4 },
      { x: skeleton.torsoTop.x - 4, y: skeleton.torsoTop.y + 14 },
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
      { x: skeleton.torsoTop.x + 2, y: skeleton.torsoTop.y + 4 },
      { x: skeleton.torsoTop.x + 1, y: skeleton.torsoTop.y + 14 },
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

function drawRobotFigure(x: number, y: number, panel: ComicPanel, day: string, pose: string): string {
  const ctx = createCharacterContext('robot', panel, day);
  const rng = ctx.frameRng;
  const leanBase = pose === 'smug' ? 2.8 : pose === 'uncertain' ? -1.8 : pose === 'typing' ? 3.6 : 0.8;
  const expression = normalizeExpression(panel.expression, 'robot');
  const lean = leanBase + jitter(ctx.identityRng, 1.7);
  const headX = x + lean;
  const headY = y + jitter(rng, 0.8) + (pose === 'typing' ? 3 : 0);
  const headWidth = 32 + jitter(ctx.identityRng, 1.4);
  const headHeight = 30 + jitter(ctx.identityRng, 1.2);
  const neck = { x: headX + jitter(rng, 0.3), y: headY + headHeight * 0.5 };
  const hip = { x: x + lean * 0.45, y: y + 68 };
  const shoulder = { x: x + lean * 0.35, y: y + 42 };
  const leftHand = { x: x - 24 + jitter(rng, 1.4), y: y + 67 + (pose === 'typing' ? 8 : 0) + jitter(rng, 1.2) };
  const rightHand = { x: x + 24 + jitter(rng, 1.1), y: y + 66 + (pose === 'typing' ? 5 : 0) + jitter(rng, 1.0) };
  const leftFoot = { x: x - 18 + jitter(rng, 1.4), y: y + 108 + jitter(rng, 1.0) };
  const rightFoot = { x: x + 18 + jitter(rng, 1.2), y: y + 108 + jitter(rng, 1.0) };

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
  content += drawRobotFace(ctx, headX, headY, expression);
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
  const expression = normalizeExpression(panel.expression, 'ferris');
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
  if (expression === 'panicked') {
    content += drawEmotionMark(ctx, x + 20, y - 22, 'sweat');
  } else if (expression === 'annoyed') {
    content += drawEmotionMark(ctx, x + 19, y - 18, 'tick');
  } else if (expression === 'delighted') {
    content += drawEmotionMark(ctx, x + 20, y - 19, 'spark');
  }
  content += `</g>`;
  return content;
}

function drawTuxFigure(x: number, y: number, panel: ComicPanel, day: string): string {
  const ctx = createCharacterContext('tux', panel, day);
  const rng = ctx.frameRng;
  const expression = normalizeExpression(panel.expression, 'tux');
  let content = `<g filter="url(#${ctx.filterId})">`;
  content += renderClosedSketch(roughLoopPoints(x, y + 12, 24, 38, rng, ctx.controls, { pointCount: 14, radialVariance: 0.08 }), rng, { fill: '#111', width: 2.1, opacity: 0.95 });
  content += renderClosedSketch(roughLoopPoints(x, y + 22, 14, 25, rng, ctx.controls, { pointCount: 12, radialVariance: 0.07 }), rng, { fill: 'white', width: 1.3, opacity: 0.94, doubleStroke: false });
  content += renderClosedSketch(roughLoopPoints(x, y - 22, 18, 17, rng, ctx.controls, { pointCount: 12, radialVariance: 0.08 }), rng, { fill: '#111', width: 2.0, opacity: 0.96 });
  content += renderClosedSketch(roughPolygonPoints([{ x: x - 5, y: y - 18 }, { x: x + 6, y: y - 18 }, { x: x + 1, y: y - 11 }], rng, 0.5), rng, { fill: 'white', width: 0.9, opacity: 0.96, doubleStroke: false });
  content += drawSimpleFace(ctx, { x, y: y - 22 }, expression, 0.82);
  content += renderOpenSketch(roughLinePoints({ x: x - 19, y: y + 1 }, { x: x - 34, y: y + 27 }, rng, ctx.controls, 4, 0.08), rng, { width: 2.0, opacity: 0.9 });
  content += renderOpenSketch(roughLinePoints({ x: x + 19, y: y + 2 }, { x: x + 34, y: y + 25 }, rng, ctx.controls, 4, 0.08), rng, { width: 2.0, opacity: 0.9 });
  content += renderOpenSketch(roughLinePoints({ x: x - 10, y: y + 52 }, { x: x - 27, y: y + 57 }, rng, ctx.controls, 3, 0.03), rng, { width: 1.6, opacity: 0.75 });
  content += renderOpenSketch(roughLinePoints({ x: x + 10, y: y + 52 }, { x: x + 27, y: y + 57 }, rng, ctx.controls, 3, 0.03), rng, { width: 1.6, opacity: 0.75 });
  content += `</g>`;
  return content;
}

function drawPythonFigure(x: number, y: number, panel: ComicPanel, day: string): string {
  const ctx = createCharacterContext('python', panel, day);
  const rng = ctx.frameRng;
  const expression = normalizeExpression(panel.expression, 'python');
  const coil = [
    { x: x - 55, y: y + 30 },
    { x: x - 30, y: y + 47 },
    { x: x + 12, y: y + 43 },
    { x: x + 39, y: y + 19 },
    { x: x + 22, y: y - 2 },
    { x: x - 16, y: y + 7 },
    { x: x - 3, y: y + 27 },
    { x: x + 44, y: y + 22 },
  ];
  let content = `<g filter="url(#${ctx.filterId})">`;
  const bodyPath = pathFromPoints(roughSnakePoints(coil, rng), false);
  content += buildSketchPath(bodyPath, rng, { width: 16.5, stroke: '#143d20', opacity: 0.96, doubleStroke: false });
  content += buildSketchPath(bodyPath, rng, { width: 11.8, stroke: '#4f9f45', opacity: 0.98, doubleStroke: false });
  content += buildSketchPath(bodyPath, rng, { width: 3.1, stroke: '#bfe8a8', opacity: 0.52, doubleStroke: false });
  const head = { x: x + 52, y: y + 20 };
  content += renderClosedSketch(roughLoopPoints(head.x, head.y, 18, 13, rng, ctx.controls, { pointCount: 11, radialVariance: 0.08 }), rng, { fill: '#5eaa46', stroke: '#143d20', width: 2.0, opacity: 0.98 });
  content += drawSimpleFace(ctx, head, expression, 0.75);
  content += renderOpenSketch(roughLinePoints({ x: head.x + 15, y: head.y + 3 }, { x: head.x + 26, y: head.y + 2 }, rng, ctx.controls, 2, 0.01), rng, { width: 0.9, stroke: '#2f5b2b', opacity: 0.72, doubleStroke: false });
  content += renderOpenSketch(roughLinePoints({ x: head.x + 26, y: head.y + 2 }, { x: head.x + 31, y: head.y - 3 }, rng, ctx.controls, 2, 0.01), rng, { width: 0.75, stroke: '#2f5b2b', opacity: 0.68, doubleStroke: false });
  content += renderOpenSketch(roughLinePoints({ x: head.x + 26, y: head.y + 2 }, { x: head.x + 31, y: head.y + 7 }, rng, ctx.controls, 2, 0.01), rng, { width: 0.75, stroke: '#2f5b2b', opacity: 0.68, doubleStroke: false });
  content += `</g>`;
  return content;
}

function drawKubeCaptainFigure(x: number, y: number, panel: ComicPanel, day: string, pose: string): string {
  const ctx = createCharacterContext('kube_captain', panel, day);
  const skeleton = buildStandingPose(x, y, ctx, 1.12, 1.25, pose === 'neutral' ? 'pointing' : pose);
  const rng = ctx.frameRng;
  let content = `<g filter="url(#${ctx.filterId})">`;
  content += drawHumanLikeFigure(ctx, skeleton, normalizeExpression(panel.expression, 'kube_captain'));
  const hatY = skeleton.headCenter.y - 19;
  content += renderClosedSketch(
    roughPolygonPoints([
      { x: skeleton.headCenter.x - 25, y: hatY + 4 },
      { x: skeleton.headCenter.x - 12, y: hatY - 13 },
      { x: skeleton.headCenter.x + 2, y: hatY - 7 },
      { x: skeleton.headCenter.x + 17, y: hatY - 14 },
      { x: skeleton.headCenter.x + 26, y: hatY + 4 },
    ], rng, 1.1),
    rng,
    { fill: 'white', width: 2.05, opacity: 0.97 },
  );
  content += renderTinyLabel(skeleton.headCenter.x + 2, hatY + 1, 'K8s', 'middle');
  content += renderOpenSketch(roughLinePoints({ x: skeleton.hip.x + 8, y: skeleton.hip.y + 6 }, { x: skeleton.hip.x + 14, y: skeleton.hip.y + 48 }, rng, ctx.controls, 4, 0.05), rng, { width: 3.0, opacity: 0.9 });
  content += renderOpenSketch(roughLinePoints({ x: skeleton.hip.x + 14, y: skeleton.hip.y + 48 }, { x: skeleton.hip.x + 24, y: skeleton.hip.y + 48 }, rng, ctx.controls, 2, 0.02), rng, { width: 2.2, opacity: 0.85 });
  content += renderClosedSketch(roughPolygonPoints([
    { x: skeleton.torsoTop.x - 13, y: skeleton.torsoTop.y + 2 },
    { x: skeleton.torsoTop.x + 15, y: skeleton.torsoTop.y + 5 },
    { x: skeleton.hip.x + 20, y: skeleton.hip.y + 12 },
    { x: skeleton.hip.x - 18, y: skeleton.hip.y + 12 },
  ], rng, 1.0), rng, { fill: 'none', width: 1.35, opacity: 0.65, doubleStroke: false });
  content += `</g>`;
  return content;
}

function drawHumanLikeFigure(ctx: CharacterContext, pose: ReturnType<typeof buildStandingPose>, expression: ComicExpression): string {
  const rng = ctx.frameRng;
  let content = '';

  content += renderClosedSketch(
    roughLoopPoints(
      pose.headCenter.x,
      pose.headCenter.y,
      17.2 * pose.headScaleX * pose.scale,
      17.2 * pose.headScaleY * pose.scale,
      rng,
      ctx.controls,
      { pointCount: 11, asymmetry: pose.headAsymmetry, radialVariance: 0.11 },
    ),
    rng,
    { fill: 'white', width: 2.7, opacity: 0.99 },
  );
  content += drawHumanFace(ctx, pose.headCenter, pose.scale, expression);
  content += renderOpenSketch(roughLinePoints(pose.torsoTop, pose.hip, rng, ctx.controls, 4, 0.1), rng, { width: 2.6, opacity: 0.98 });
  content += renderOpenSketch(roughLinePoints(pose.shoulder, pose.leftHand, rng, ctx.controls, 4, 0.1), rng, { width: 2.45, opacity: 0.97 });
  content += renderOpenSketch(roughLinePoints(pose.shoulder, pose.rightHand, rng, ctx.controls, 4, 0.1), rng, { width: 2.45, opacity: 0.97 });
  content += renderOpenSketch(roughLinePoints(pose.hip, pose.leftFoot, rng, ctx.controls, 4, 0.09), rng, { width: 2.52, opacity: 0.98 });
  content += renderOpenSketch(roughLinePoints(pose.hip, pose.rightFoot, rng, ctx.controls, 4, 0.09), rng, { width: 2.52, opacity: 0.98 });

  return content;
}

function drawHumanFace(ctx: CharacterContext, headCenter: Point, scale: number, expression: ComicExpression): string {
  const rng = ctx.frameRng;
  const eyeY = headCenter.y - 3.4 * scale;
  const leftEye = { x: headCenter.x - 6.4 * scale, y: eyeY };
  const rightEye = { x: headCenter.x + 6.4 * scale, y: eyeY };
  let content = '';

  if (expression === 'deadpan' || expression === 'annoyed') {
    content += renderOpenSketch(roughLinePoints({ x: leftEye.x - 3.2, y: leftEye.y }, { x: leftEye.x + 3.2, y: leftEye.y + 0.3 }, rng, ctx.controls, 3, 0.02), rng, { width: 1.35, opacity: 0.9, doubleStroke: false });
    content += renderOpenSketch(roughLinePoints({ x: rightEye.x - 3.2, y: rightEye.y }, { x: rightEye.x + 3.2, y: rightEye.y + 0.3 }, rng, ctx.controls, 3, 0.02), rng, { width: 1.35, opacity: 0.9, doubleStroke: false });
  } else if (expression === 'panicked') {
    content += renderClosedSketch(roughLoopPoints(leftEye.x, leftEye.y, 2.5, 3.0, rng, ctx.controls, { pointCount: 8 }), rng, { fill: 'white', width: 1.25, opacity: 0.94, doubleStroke: false });
    content += renderClosedSketch(roughLoopPoints(rightEye.x, rightEye.y, 2.5, 3.0, rng, ctx.controls, { pointCount: 8 }), rng, { fill: 'white', width: 1.25, opacity: 0.94, doubleStroke: false });
  } else {
    content += renderClosedSketch(roughLoopPoints(leftEye.x, leftEye.y, 1.7, 2.0, rng, ctx.controls, { pointCount: 8 }), rng, { fill: 'black', width: 0.9, opacity: 0.95, doubleStroke: false });
    content += renderClosedSketch(roughLoopPoints(rightEye.x, rightEye.y, 1.7, 2.0, rng, ctx.controls, { pointCount: 8 }), rng, { fill: 'black', width: 0.9, opacity: 0.95, doubleStroke: false });
  }

  if (expression === 'confused' || expression === 'thinking') {
    content += renderOpenSketch(roughLinePoints({ x: leftEye.x - 4, y: leftEye.y - 6 }, { x: leftEye.x + 2, y: leftEye.y - 8 }, rng, ctx.controls, 3, 0.03), rng, { width: 1.15, opacity: 0.78, doubleStroke: false });
    content += renderOpenSketch(roughLinePoints({ x: rightEye.x - 2, y: rightEye.y - 8 }, { x: rightEye.x + 4, y: rightEye.y - 6 }, rng, ctx.controls, 3, 0.03), rng, { width: 1.15, opacity: 0.78, doubleStroke: false });
  } else if (expression === 'annoyed') {
    content += renderOpenSketch(roughLinePoints({ x: leftEye.x - 4, y: leftEye.y - 7 }, { x: leftEye.x + 4, y: leftEye.y - 5 }, rng, ctx.controls, 3, 0.03), rng, { width: 1.2, opacity: 0.82, doubleStroke: false });
    content += renderOpenSketch(roughLinePoints({ x: rightEye.x - 4, y: rightEye.y - 5 }, { x: rightEye.x + 4, y: rightEye.y - 7 }, rng, ctx.controls, 3, 0.03), rng, { width: 1.2, opacity: 0.82, doubleStroke: false });
  }

  const mouthY = headCenter.y + 8.2 * scale;
  const mouthWidth = expression === 'panicked' ? 2.7 : 8.5 * scale;
  if (expression === 'panicked') {
    content += renderClosedSketch(roughLoopPoints(headCenter.x, mouthY - 1, mouthWidth, 3.6, rng, ctx.controls, { pointCount: 8 }), rng, { fill: 'white', width: 1.2, opacity: 0.9, doubleStroke: false });
    content += drawEmotionMark(ctx, headCenter.x + 18 * scale, headCenter.y - 14 * scale, 'sweat');
  } else if (expression === 'delighted') {
    content += renderOpenSketch(roughArcPoints(headCenter.x, mouthY - 2, mouthWidth, 5.0 * scale, 0.1, Math.PI - 0.1, rng), rng, { width: 1.35, opacity: 0.86, doubleStroke: false });
  } else if (expression === 'worried') {
    content += renderOpenSketch(roughArcPoints(headCenter.x, mouthY + 4, mouthWidth, 4.6 * scale, Math.PI + 0.12, TAU - 0.12, rng), rng, { width: 1.35, opacity: 0.86, doubleStroke: false });
    content += drawEmotionMark(ctx, headCenter.x + 18 * scale, headCenter.y - 12 * scale, 'sweat');
  } else if (expression === 'smug') {
    content += renderOpenSketch(roughLinePoints({ x: headCenter.x - 7 * scale, y: mouthY }, { x: headCenter.x + 5 * scale, y: mouthY - 2.3 * scale }, rng, ctx.controls, 3, 0.04), rng, { width: 1.35, opacity: 0.86, doubleStroke: false });
  } else {
    content += renderOpenSketch(roughLinePoints({ x: headCenter.x - mouthWidth, y: mouthY }, { x: headCenter.x + mouthWidth, y: mouthY + jitter(rng, 0.35) }, rng, ctx.controls, 3, 0.04), rng, { width: 1.3, opacity: 0.84, doubleStroke: false });
  }

  if (expression === 'confused') {
    content += renderTinyLabel(headCenter.x + 19 * scale, headCenter.y - 17 * scale, '?', 'middle');
  } else if (expression === 'thinking') {
    content += renderTinyLabel(headCenter.x + 19 * scale, headCenter.y - 17 * scale, '...', 'middle');
  }

  return content;
}

function drawSquareGlasses(ctx: CharacterContext, headCenter: Point): string {
  const rng = ctx.frameRng;
  const y = headCenter.y - 3.8;
  let content = '';
  content += renderClosedSketch(roughRectanglePoints(headCenter.x - 14.2, y - 4.8, 8.6, 8.2, rng, ctx.controls, 0.45), rng, { fill: 'none', width: 1.05, opacity: 0.74, doubleStroke: false });
  content += renderClosedSketch(roughRectanglePoints(headCenter.x + 5.6, y - 4.8, 8.6, 8.2, rng, ctx.controls, 0.45), rng, { fill: 'none', width: 1.05, opacity: 0.74, doubleStroke: false });
  content += renderOpenSketch(roughLinePoints({ x: headCenter.x - 5.6, y: y - 0.6 }, { x: headCenter.x + 5.6, y: y - 0.6 }, rng, ctx.controls, 2, 0.01), rng, { width: 0.85, opacity: 0.62, doubleStroke: false });
  return content;
}

function drawSimpleFace(ctx: CharacterContext, center: Point, expression: ComicExpression, scale: number): string {
  const rng = ctx.frameRng;
  const leftEye = { x: center.x - 6 * scale, y: center.y - 2.8 * scale };
  const rightEye = { x: center.x + 6 * scale, y: center.y - 2.8 * scale };
  const mouthY = center.y + 6.5 * scale;
  let content = '';
  if (expression === 'deadpan' || expression === 'annoyed' || expression === 'blank') {
    content += renderOpenSketch(roughLinePoints({ x: leftEye.x - 2.5, y: leftEye.y }, { x: leftEye.x + 2.5, y: leftEye.y }, rng, ctx.controls, 2, 0.01), rng, { width: 1.0, opacity: 0.82, doubleStroke: false });
    content += renderOpenSketch(roughLinePoints({ x: rightEye.x - 2.5, y: rightEye.y }, { x: rightEye.x + 2.5, y: rightEye.y }, rng, ctx.controls, 2, 0.01), rng, { width: 1.0, opacity: 0.82, doubleStroke: false });
  } else {
    content += renderClosedSketch(roughLoopPoints(leftEye.x, leftEye.y, 1.45 * scale, 1.65 * scale, rng, ctx.controls, { pointCount: 8 }), rng, { fill: 'black', width: 0.85, opacity: 0.9, doubleStroke: false });
    content += renderClosedSketch(roughLoopPoints(rightEye.x, rightEye.y, 1.45 * scale, 1.65 * scale, rng, ctx.controls, { pointCount: 8 }), rng, { fill: 'black', width: 0.85, opacity: 0.9, doubleStroke: false });
  }

  if (expression === 'delighted') {
    content += renderOpenSketch(roughArcPoints(center.x, mouthY - 2, 7.5 * scale, 4.2 * scale, 0.12, Math.PI - 0.12, rng), rng, { width: 1.1, opacity: 0.8, doubleStroke: false });
  } else if (expression === 'worried' || expression === 'confused') {
    content += renderOpenSketch(roughArcPoints(center.x, mouthY + 3, 7.2 * scale, 3.8 * scale, Math.PI + 0.12, TAU - 0.12, rng), rng, { width: 1.1, opacity: 0.8, doubleStroke: false });
  } else if (expression === 'smug') {
    content += renderOpenSketch(roughLinePoints({ x: center.x - 6.2 * scale, y: mouthY }, { x: center.x + 6.2 * scale, y: mouthY - 1.8 * scale }, rng, ctx.controls, 3, 0.03), rng, { width: 1.05, opacity: 0.78, doubleStroke: false });
  } else {
    content += renderOpenSketch(roughLinePoints({ x: center.x - 6.2 * scale, y: mouthY }, { x: center.x + 6.2 * scale, y: mouthY + jitter(rng, 0.25) }, rng, ctx.controls, 3, 0.03), rng, { width: 1.05, opacity: 0.76, doubleStroke: false });
  }

  if (expression === 'thinking') {
    content += renderTinyLabel(center.x + 14 * scale, center.y - 13 * scale, '...', 'middle');
  } else if (expression === 'panicked') {
    content += drawEmotionMark(ctx, center.x + 14 * scale, center.y - 12 * scale, 'sweat');
  }
  return content;
}

function drawRobotFace(ctx: CharacterContext, headX: number, headY: number, expression: ComicExpression): string {
  const rng = ctx.frameRng;
  let content = '';
  const leftEye = { x: headX - 6.4, y: headY - 2 };
  const rightEye = { x: headX + 6.2, y: headY - 1.8 };

  if (expression === 'blank') {
    content += renderOpenSketch(roughLinePoints({ x: leftEye.x - 2.7, y: leftEye.y }, { x: leftEye.x + 2.7, y: leftEye.y }, rng, ctx.controls, 3, 0.02), rng, { width: 1.2, opacity: 0.78, doubleStroke: false });
    content += renderOpenSketch(roughLinePoints({ x: rightEye.x - 2.7, y: rightEye.y }, { x: rightEye.x + 2.7, y: rightEye.y }, rng, ctx.controls, 3, 0.02), rng, { width: 1.2, opacity: 0.78, doubleStroke: false });
  } else {
    const eyeScale = expression === 'panicked' ? 1.35 : expression === 'smug' ? 0.8 : 1;
    content += renderClosedSketch(roughLoopPoints(leftEye.x, leftEye.y, 2.1 * eyeScale, 2.3 * eyeScale, rng, ctx.controls, { pointCount: 8 }), rng, { fill: 'black', width: 1.0, opacity: 0.95, doubleStroke: false });
    content += renderClosedSketch(roughLoopPoints(rightEye.x, rightEye.y, 2.1 * eyeScale, 2.1 * eyeScale, rng, ctx.controls, { pointCount: 8 }), rng, { fill: 'black', width: 1.0, opacity: 0.95, doubleStroke: false });
  }

  if (expression === 'thinking' || expression === 'confused') {
    content += renderOpenSketch(roughLinePoints({ x: leftEye.x - 4, y: leftEye.y - 6 }, { x: leftEye.x + 2, y: leftEye.y - 8 }, rng, ctx.controls, 3, 0.03), rng, { width: 1.0, opacity: 0.72, doubleStroke: false });
    content += renderOpenSketch(roughLinePoints({ x: rightEye.x - 2, y: rightEye.y - 8 }, { x: rightEye.x + 4, y: rightEye.y - 6 }, rng, ctx.controls, 3, 0.03), rng, { width: 1.0, opacity: 0.72, doubleStroke: false });
  }

  if (expression === 'panicked') {
    content += renderClosedSketch(roughLoopPoints(headX, headY + 8.5, 3.0, 3.6, rng, ctx.controls, { pointCount: 8 }), rng, { fill: 'white', width: 1.25, opacity: 0.9, doubleStroke: false });
    content += drawEmotionMark(ctx, headX + 19, headY - 13, 'sweat');
  } else if (expression === 'smug') {
    content += renderOpenSketch(roughLinePoints({ x: headX - 8.3, y: headY + 9.3 }, { x: headX + 8.1, y: headY + 7.9 + jitter(rng, 0.4) }, rng, ctx.controls, 4, 0.05), rng, { width: 1.5, opacity: 0.88, doubleStroke: false });
  } else if (expression === 'confused') {
    content += renderOpenSketch(roughArcPoints(headX, headY + 11.5, 7.0, 3.3, Math.PI + 0.2, TAU - 0.2, rng), rng, { width: 1.35, opacity: 0.85, doubleStroke: false });
  } else {
    content += renderOpenSketch(roughLinePoints({ x: headX - 8.3, y: headY + 8.6 }, { x: headX + 8.1, y: headY + 9.1 + jitter(rng, 0.4) }, rng, ctx.controls, 4, 0.05), rng, { width: 1.5, opacity: 0.88, doubleStroke: false });
  }

  return content;
}

function drawEmotionMark(ctx: CharacterContext, x: number, y: number, mark: 'sweat' | 'tick' | 'spark'): string {
  const rng = ctx.frameRng;
  if (mark === 'sweat') {
    return renderClosedSketch(roughLoopPoints(x, y, 2.4, 4.2, rng, ctx.controls, { pointCount: 8, radialVariance: 0.12 }), rng, { fill: 'white', width: 1.0, opacity: 0.75, doubleStroke: false });
  }
  if (mark === 'tick') {
    return renderOpenSketch(roughLinePoints({ x: x - 3, y: y - 3 }, { x: x + 3, y: y + 3 }, rng, ctx.controls, 2, 0.02), rng, { width: 1.0, opacity: 0.65, doubleStroke: false })
      + renderOpenSketch(roughLinePoints({ x: x + 3, y: y - 3 }, { x: x - 3, y: y + 3 }, rng, ctx.controls, 2, 0.02), rng, { width: 1.0, opacity: 0.65, doubleStroke: false });
  }
  return renderOpenSketch(roughLinePoints({ x: x - 4, y }, { x: x + 4, y }, rng, ctx.controls, 2, 0.02), rng, { width: 0.9, opacity: 0.6, doubleStroke: false })
    + renderOpenSketch(roughLinePoints({ x, y: y - 4 }, { x, y: y + 4 }, rng, ctx.controls, 2, 0.02), rng, { width: 0.9, opacity: 0.6, doubleStroke: false });
}

function buildStandingPose(x: number, y: number, ctx: CharacterContext, leanMultiplier: number, scale: number, pose: string) {
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
  const torsoTop = { x: headCenter.x + randBetween(frame, -0.4, 0.4), y: headCenter.y + 18 * scale };
  const shoulder = { x: headCenter.x + torsoLean * 0.15, y: headCenter.y + 36 * scale + shoulderTilt * 0.1 };
  const hip = { x: headCenter.x + torsoLean + hipDrift, y: headCenter.y + 64 * scale };
  const leftHand = { x: shoulder.x - armSpread * scale + randBetween(frame, -limbDrift, limbDrift), y: shoulder.y + leftArmDrop * scale };
  const rightHand = { x: shoulder.x + armSpread * scale + randBetween(frame, -limbDrift, limbDrift), y: shoulder.y + rightArmDrop * scale };
  const leftFoot = { x: hip.x - leftLegSpread * scale + randBetween(frame, -limbDrift * 0.7, limbDrift * 0.7), y: hip.y + 34 * scale + randBetween(frame, -1.0, 1.4) };
  const rightFoot = { x: hip.x + rightLegSpread * scale + randBetween(frame, -limbDrift * 0.7, limbDrift * 0.7), y: hip.y + 34 * scale + randBetween(frame, -1.2, 1.2) };

  applyPoseToSkeleton(pose, headCenter, shoulder, hip, leftHand, rightHand, leftFoot, rightFoot, scale);

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
    scale,
  };
}

function applyPoseToSkeleton(
  pose: string,
  headCenter: Point,
  shoulder: Point,
  hip: Point,
  leftHand: Point,
  rightHand: Point,
  leftFoot: Point,
  rightFoot: Point,
  scale: number,
): void {
  if (pose === 'leaning') {
    headCenter.x += 4 * scale;
    shoulder.x += 6 * scale;
    hip.x += 5 * scale;
  } else if (pose === 'pointing') {
    rightHand.x += 14 * scale;
    rightHand.y -= 9 * scale;
    leftHand.y += 5 * scale;
  } else if (pose === 'facepalm') {
    rightHand.x = headCenter.x + 4 * scale;
    rightHand.y = headCenter.y + 5 * scale;
    leftHand.y += 7 * scale;
  } else if (pose === 'slumped') {
    headCenter.y += 5 * scale;
    shoulder.y += 6 * scale;
    hip.y += 8 * scale;
    leftHand.y += 10 * scale;
    rightHand.y += 10 * scale;
  } else if (pose === 'hands_up') {
    leftHand.y -= 19 * scale;
    rightHand.y -= 19 * scale;
  } else if (pose === 'typing') {
    headCenter.x += 5 * scale;
    shoulder.x += 5 * scale;
    leftHand.y += 9 * scale;
    rightHand.y += 8 * scale;
    leftHand.x += 5 * scale;
    rightHand.x -= 3 * scale;
  } else if (pose === 'smug') {
    headCenter.y -= 3 * scale;
    shoulder.x -= 3 * scale;
  } else if (pose === 'uncertain') {
    rightHand.y -= 10 * scale;
    rightHand.x -= 4 * scale;
  } else if (pose === 'deadpan') {
    leftHand.x += 7 * scale;
    rightHand.x -= 7 * scale;
    leftHand.y += 7 * scale;
    rightHand.y += 7 * scale;
  }

  leftFoot.x -= 1.8 * scale;
  rightFoot.x += 1.8 * scale;
}

function normalizePose(pose: unknown): string {
  const value = String(pose || 'neutral').toLowerCase().replace(/[\s-]+/g, '_');
  const allowed = new Set(['neutral', 'leaning', 'pointing', 'facepalm', 'slumped', 'hands_up', 'typing', 'smug', 'uncertain', 'deadpan']);
  return allowed.has(value) ? value : 'neutral';
}

function normalizeExpression(expression: unknown, speaker: string): ComicExpression {
  const value = String(expression || '').toLowerCase().replace(/[\s-]+/g, '_');
  const allowedBySpeaker: Record<string, ComicExpression[]> = {
    user: ['neutral', 'confused', 'worried', 'thinking', 'panicked'],
    robot: ['blank', 'thinking', 'confused', 'smug', 'panicked'],
    simon: ['deadpan', 'annoyed', 'smug', 'neutral'],
    boss: ['smug', 'delighted', 'annoyed', 'panicked', 'neutral'],
    ferris: ['blank', 'annoyed', 'delighted', 'panicked'],
    tux: ['neutral', 'thinking', 'deadpan', 'worried', 'delighted'],
    python: ['smug', 'thinking', 'confused', 'delighted', 'worried'],
    kube_captain: ['smug', 'panicked', 'annoyed', 'delighted', 'thinking'],
  };
  const allowed = allowedBySpeaker[speaker] || ['neutral', 'confused', 'worried', 'deadpan', 'smug', 'panicked', 'annoyed', 'delighted', 'thinking', 'blank'];
  if ((allowed as string[]).includes(value)) return value as ComicExpression;

  if (speaker === 'robot') return 'thinking';
  if (speaker === 'simon') return 'deadpan';
  if (speaker === 'boss') return 'smug';
  if (speaker === 'ferris') return 'blank';
  if (speaker === 'tux') return 'deadpan';
  if (speaker === 'python') return 'smug';
  if (speaker === 'kube_captain') return 'smug';
  return 'neutral';
}

function poseFromBoss(pose: string): string {
  if (pose === 'deadpan' || pose === 'typing' || pose === 'pointing') return pose;
  if (pose === 'neutral') return 'smug';
  return pose;
}

function getBubbleX(panel: ComicPanel, panelX: number, panelWidth: number, panelSeed: number): number {
  const rng = createRng(hashString(`bubble-x|${panelSeed}`));
  const base = panelX + panelWidth / 2;
  const left = panelX + panelWidth * 0.33;
  const right = panelX + panelWidth * 0.67;
  if (panel.speaker === 'simon') return left + jitter(rng, 4);
  if (panel.speaker === 'boss') return right + jitter(rng, 4);
  if (panel.speaker === 'robot') return right + jitter(rng, 4);
  return base + jitter(rng, 9);
}

function getThoughtBubbleX(panel: ComicPanel, panelX: number, panelWidth: number, panelSeed: number): number {
  const rng = createRng(hashString(`thought-x|${panelSeed}`));
  const left = panelX + panelWidth * 0.3;
  const right = panelX + panelWidth * 0.69;
  if (panel.speaker === 'robot') return left + jitter(rng, 5);
  return right + jitter(rng, 5);
}

function drawSpeechBubble(x: number, y: number, text: string, maxWidth: number, seed: number): string {
  const lines = wrapText(text, 20).slice(0, 2);
  const bubbleHeight = lines.length * 14 + 16;
  const maxByArea = Math.max(95, (PANEL_WIDTH * PANEL_HEIGHT * 0.22) / bubbleHeight);
  const bubbleWidth = Math.min(maxWidth, maxByArea, Math.max(96, longestLine(lines) * 6.8 + 22));
  const rng = createRng(hashString(`speech|${seed}|${text}`));
  const outline = roughLoopPoints(x, y + bubbleHeight / 2, bubbleWidth / 2, bubbleHeight / 2, rng, SKETCH_CONTROLS, {
    pointCount: 14,
    asymmetry: 0.03,
    radialVariance: 0.12,
  });
  const tail = roughPolygonPoints([
    { x: x - 8 + jitter(rng, 0.9), y: y + bubbleHeight - 2 },
    { x: x - 1 + jitter(rng, 0.8), y: y + bubbleHeight + 8 + jitter(rng, 0.8) },
    { x: x + 6 + jitter(rng, 0.9), y: y + bubbleHeight - 1 },
  ], rng, 1.2);

  return `
  <g filter="url(#bubble-wobble)">
    ${renderClosedSketch(outline, rng, { fill: 'white', width: 1.65, opacity: 0.96 })}
    ${renderClosedSketch(tail, rng, { fill: 'white', width: 1.45, opacity: 0.95, doubleStroke: false })}
  </g>
  ${lines.map((line, index) => (
    `<text x="${fmt(x)}" y="${fmt(y + 15 + index * 14)}" text-anchor="middle" class="comic-text">${escapeXml(line)}</text>`
  )).join('')}
`;
}

function drawThoughtBubble(x: number, y: number, text: string, maxWidth: number, seed: number): string {
  const lines = wrapText(text, 24).slice(0, 3);
  const bubbleHeight = lines.length * 13 + 18;
  const maxByArea = Math.max(110, (PANEL_WIDTH * PANEL_HEIGHT * 0.22) / bubbleHeight);
  const bubbleWidth = Math.min(maxWidth, maxByArea, Math.max(112, longestLine(lines) * 6.5 + 26));
  const rng = createRng(hashString(`thought|${seed}|${text}`));
  const cloud = roughCloudPoints(x, y + bubbleHeight / 2, bubbleWidth / 2, bubbleHeight / 2, rng);
  const puffOne = roughLoopPoints(x - 19, y + bubbleHeight + 2, 3.7, 3.5, rng, SKETCH_CONTROLS, { pointCount: 8, radialVariance: 0.1 });
  const puffTwo = roughLoopPoints(x - 10, y + bubbleHeight + 9, 2.8, 2.6, rng, SKETCH_CONTROLS, { pointCount: 8, radialVariance: 0.1 });

  return `
  <g filter="url(#thought-wobble)">
    ${renderClosedSketch(cloud, rng, { fill: '#f6f6f6', width: 1.55, opacity: 0.94 })}
    ${renderClosedSketch(puffOne, rng, { fill: '#f6f6f6', width: 1.0, opacity: 0.93, doubleStroke: false })}
    ${renderClosedSketch(puffTwo, rng, { fill: '#f6f6f6', width: 0.95, opacity: 0.93, doubleStroke: false })}
  </g>
  ${lines.map((line, index) => (
    `<text x="${fmt(x)}" y="${fmt(y + 14 + index * 13)}" text-anchor="middle" class="robot-thought">${escapeXml(line)}</text>`
  )).join('')}
`;
}

function drawSceneBackdrop(scene: ComicScene, x: number, y: number, width: number, height: number, panel: ComicPanel, seed: number): string {
  if (scene === 'terminal' || scene === 'desk') {
    return drawTerminalScene(x + 30, y + height - 106, width - 60, seed, panel.screenText || panel.visualFocus);
  }

  if (scene === 'whiteboard') {
    return drawWhiteboardScene(x + 25, y + 66, width - 50, seed, panel.visualFocus);
  }

  if (scene === 'incident_room') {
    return drawIncidentScene(x + 24, y + 67, width - 48, height, seed, panel.visualFocus);
  }

  if (scene === 'meeting') {
    return drawMeetingScene(x + 28, y + height - 96, width - 56, seed, panel.visualFocus);
  }

  if (scene === 'network') {
    return drawNetworkScene(x + 28, y + 76, width - 56, seed, panel.visualFocus);
  }

  return drawPlainScene(x, y, width, height, seed, panel.beat);
}

function drawTerminalScene(x: number, y: number, width: number, seed: number, screenText?: string): string {
  const rng = createRng(hashString(`terminal|${seed}|${width}`));
  const deskLeft = { x, y: y + 26 + jitter(rng, 0.9) };
  const deskRight = { x: x + width, y: y + 23 + jitter(rng, 1.2) };
  const monitorX = x + width * 0.56;
  const monitorY = y - 20;

  let content = `<g filter="url(#prop-wobble)">`;
  content += renderOpenSketch(roughLinePoints(deskLeft, deskRight, rng, SKETCH_CONTROLS, 4, 0.06), rng, { stroke: '#646464', width: 1.85, opacity: 0.72 });
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
    { stroke: '#646464', width: 1.5, opacity: 0.68, doubleStroke: false },
  );
  content += renderClosedSketch(
    roughRectanglePoints(monitorX - 34, monitorY - 18, 64, 38, rng, SKETCH_CONTROLS, 2.2),
    rng,
    { fill: 'white', stroke: '#676767', width: 1.5, opacity: 0.66, doubleStroke: false },
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
    { stroke: '#6d6d6d', width: 1.1, opacity: 0.56, doubleStroke: false },
  );
  if (screenText) {
    const screenLines = wrapText(screenText, 16).slice(0, 2);
    content += screenLines.map((line, index) => (
      `<text x="${fmt(monitorX - 2)}" y="${fmt(monitorY - 5 + index * 8)}" text-anchor="middle" class="screen-text">${escapeXml(line)}</text>`
    )).join('');
  }
  content += renderClosedSketch(
    roughPolygonPoints([
      { x: x + width * 0.34 - 22, y: y + 8 },
      { x: x + width * 0.34 + 22, y: y + 4 },
      { x: x + width * 0.34 + 19, y: y + 14 },
      { x: x + width * 0.34 - 20, y: y + 16 },
    ], rng, 1.3),
    rng,
    { fill: 'white', stroke: '#6a6a6a', width: 1.2, opacity: 0.58, doubleStroke: false },
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
    { stroke: '#7a7a7a', width: 0.9, opacity: 0.5, doubleStroke: false },
  );
  content += renderClosedSketch(
    roughLoopPoints(x + width * 0.18, y + 10, 7.5, 7.5, rng, SKETCH_CONTROLS, { pointCount: 10, radialVariance: 0.09 }),
    rng,
    { fill: 'white', stroke: '#6a6a6a', width: 1.0, opacity: 0.58, doubleStroke: false },
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
    { stroke: '#747474', width: 0.85, opacity: 0.5, doubleStroke: false },
  );
  content += `</g>`;
  return content;
}

function drawWhiteboardScene(x: number, y: number, width: number, seed: number, focus = 'causal arrow'): string {
  const rng = createRng(hashString(`whiteboard|${seed}|${focus}`));
  let content = `<g filter="url(#prop-wobble)">`;
  content += renderClosedSketch(
    roughRectanglePoints(x, y, width, 88, rng, SKETCH_CONTROLS, 2.4),
    rng,
    { fill: 'white', stroke: '#6a6a6a', width: 1.35, opacity: 0.55, doubleStroke: false },
  );

  const boxes = [
    { x: x + width * 0.18, y: y + 30, label: 'spec' },
    { x: x + width * 0.50, y: y + 22, label: 'model' },
    { x: x + width * 0.78, y: y + 40, label: 'prod' },
  ];

  for (const box of boxes) {
    content += renderClosedSketch(
      roughRectanglePoints(box.x - 22, box.y - 11, 44, 22, rng, SKETCH_CONTROLS, 1.4),
      rng,
      { fill: 'white', stroke: '#777', width: 1.1, opacity: 0.58, doubleStroke: false },
    );
    content += renderTinyLabel(box.x, box.y + 4, box.label, 'middle');
  }

  content += renderArrow({ x: boxes[0].x + 25, y: boxes[0].y }, { x: boxes[1].x - 25, y: boxes[1].y }, rng, 0.48);
  content += renderArrow({ x: boxes[1].x + 25, y: boxes[1].y + 2 }, { x: boxes[2].x - 25, y: boxes[2].y }, rng, 0.48);
  content += renderTinyLabel(x + width / 2, y + 78, focus, 'middle');
  content += `</g>`;
  return content;
}

function drawIncidentScene(x: number, y: number, width: number, height: number, seed: number, focus = 'sev clock'): string {
  const rng = createRng(hashString(`incident|${seed}|${focus}`));
  const clockX = x + width * 0.18;
  const boardX = x + width * 0.62;
  let content = `<g filter="url(#prop-wobble)">`;
  content += renderClosedSketch(
    roughLoopPoints(clockX, y + 24, 20, 20, rng, SKETCH_CONTROLS, { pointCount: 12, radialVariance: 0.08 }),
    rng,
    { fill: 'white', stroke: '#666', width: 1.35, opacity: 0.62, doubleStroke: false },
  );
  content += renderOpenSketch(roughLinePoints({ x: clockX, y: y + 24 }, { x: clockX + 1, y: y + 10 }, rng, SKETCH_CONTROLS, 3, 0.04), rng, { stroke: '#777', width: 1.0, opacity: 0.55, doubleStroke: false });
  content += renderOpenSketch(roughLinePoints({ x: clockX, y: y + 24 }, { x: clockX + 12, y: y + 27 }, rng, SKETCH_CONTROLS, 3, 0.04), rng, { stroke: '#777', width: 1.0, opacity: 0.55, doubleStroke: false });
  content += renderTinyLabel(clockX, y + 52, focus, 'middle');

  content += renderClosedSketch(
    roughRectanglePoints(boardX - 54, y + 4, 108, 64, rng, SKETCH_CONTROLS, 2.0),
    rng,
    { fill: 'white', stroke: '#6d6d6d', width: 1.2, opacity: 0.54, doubleStroke: false },
  );
  for (let index = 0; index < 4; index += 1) {
    const rowY = y + 18 + index * 11;
    content += renderOpenSketch(roughLinePoints({ x: boardX - 43, y: rowY }, { x: boardX + 42, y: rowY + jitter(rng, 0.6) }, rng, SKETCH_CONTROLS, 3, 0.03), rng, { stroke: '#777', width: 0.9, opacity: 0.44, doubleStroke: false });
  }

  content += renderOpenSketch(roughLinePoints({ x, y: y + height - 132 }, { x: x + width, y: y + height - 134 + jitter(rng, 0.8) }, rng, SKETCH_CONTROLS, 4, 0.04), rng, { stroke: '#777', width: 1.25, opacity: 0.42, doubleStroke: false });
  content += `</g>`;
  return content;
}

function drawMeetingScene(x: number, y: number, width: number, seed: number, focus = 'status table'): string {
  const rng = createRng(hashString(`meeting|${seed}|${focus}`));
  let content = `<g filter="url(#prop-wobble)">`;
  content += renderClosedSketch(
    roughPolygonPoints([
      { x, y: y + 22 },
      { x: x + width, y: y + 18 },
      { x: x + width - 24, y: y + 45 },
      { x: x + 24, y: y + 50 },
    ], rng, 1.6),
    rng,
    { fill: 'white', stroke: '#686868', width: 1.35, opacity: 0.54, doubleStroke: false },
  );
  for (let index = 0; index < 3; index += 1) {
    const mugX = x + width * (0.27 + index * 0.22);
    content += renderClosedSketch(roughLoopPoints(mugX, y + 29 + jitter(rng, 1), 5, 4, rng, SKETCH_CONTROLS, { pointCount: 8 }), rng, { fill: 'white', stroke: '#777', width: 0.8, opacity: 0.48, doubleStroke: false });
  }
  content += renderClosedSketch(roughRectanglePoints(x + width * 0.58, y - 44, 62, 38, rng, SKETCH_CONTROLS, 1.5), rng, { fill: 'white', stroke: '#777', width: 1.0, opacity: 0.46, doubleStroke: false });
  content += renderTinyLabel(x + width * 0.58 + 31, y - 22, focus, 'middle');
  content += `</g>`;
  return content;
}

function drawNetworkScene(x: number, y: number, width: number, seed: number, focus = 'cache path'): string {
  const rng = createRng(hashString(`network|${seed}|${focus}`));
  const nodes = [
    { x: x + width * 0.16, y: y + 34, label: 'user' },
    { x: x + width * 0.42, y: y + 14, label: 'cdn' },
    { x: x + width * 0.63, y: y + 54, label: 'api' },
    { x: x + width * 0.84, y: y + 27, label: 'db' },
  ];
  let content = `<g filter="url(#prop-wobble)">`;
  content += renderArrow(nodes[0], nodes[1], rng, 0.45);
  content += renderArrow(nodes[1], nodes[2], rng, 0.45);
  content += renderArrow(nodes[2], nodes[3], rng, 0.45);
  content += renderArrow(nodes[2], { x: nodes[1].x + 4, y: nodes[1].y + 31 }, rng, 0.34);
  for (const node of nodes) {
    content += renderClosedSketch(roughLoopPoints(node.x, node.y, 16, 11, rng, SKETCH_CONTROLS, { pointCount: 10, radialVariance: 0.09 }), rng, { fill: 'white', stroke: '#707070', width: 1.0, opacity: 0.54, doubleStroke: false });
    content += renderTinyLabel(node.x, node.y + 4, node.label, 'middle');
  }
  content += renderTinyLabel(x + width / 2, y + 82, focus, 'middle');
  content += `</g>`;
  return content;
}

function drawPlainScene(x: number, y: number, width: number, height: number, seed: number, beat?: string): string {
  const rng = createRng(hashString(`plain|${seed}|${beat || ''}`));
  const floorY = y + height - 42 + jitter(rng, 0.7);
  let content = `<g filter="url(#prop-wobble)">`;
  content += renderOpenSketch(roughLinePoints({ x: x + 26, y: floorY }, { x: x + width - 26, y: floorY + jitter(rng, 0.8) }, rng, SKETCH_CONTROLS, 4, 0.03), rng, { stroke: '#777', width: 1.0, opacity: 0.34, doubleStroke: false });
  if (beat === 'punchline' || beat === 'reversal') {
    content += renderOpenSketch(roughLinePoints({ x: x + width * 0.72, y: y + 74 }, { x: x + width * 0.82, y: y + 74 + jitter(rng, 0.5) }, rng, SKETCH_CONTROLS, 3, 0.03), rng, { stroke: '#777', width: 1.0, opacity: 0.36, doubleStroke: false });
  }
  content += `</g>`;
  return content;
}

function renderArrow(start: Point, end: Point, rng: () => number, opacity: number): string {
  let content = renderOpenSketch(roughLinePoints(start, end, rng, SKETCH_CONTROLS, 4, 0.05), rng, { stroke: '#777', width: 1.0, opacity, doubleStroke: false });
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const left = { x: end.x - Math.cos(angle - 0.55) * 7, y: end.y - Math.sin(angle - 0.55) * 7 };
  const right = { x: end.x - Math.cos(angle + 0.55) * 7, y: end.y - Math.sin(angle + 0.55) * 7 };
  content += renderOpenSketch(roughLinePoints(left, end, rng, SKETCH_CONTROLS, 2, 0.02), rng, { stroke: '#777', width: 0.95, opacity, doubleStroke: false });
  content += renderOpenSketch(roughLinePoints(right, end, rng, SKETCH_CONTROLS, 2, 0.02), rng, { stroke: '#777', width: 0.95, opacity, doubleStroke: false });
  return content;
}

function renderTinyLabel(x: number, y: number, text: string, anchor: 'start' | 'middle' = 'start'): string {
  const safe = escapeXml(truncateLabel(text, 16));
  return `<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="${anchor}" class="caption-text" opacity="0.5">${safe}</text>`;
}

function truncateLabel(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength - 1).trim();
}

function createCharacterContext(kind: string, panel: ComicPanel, day: string): CharacterContext {
  return {
    controls: SKETCH_CONTROLS,
    identityRng: createRng(hashString(`character|${kind}`)),
    frameRng: createRng(hashString(`frame|${kind}|${day}|${panel.panelNumber}|${panel.dialogue || ''}|${panel.robotThought || ''}`)),
    filterId: `character-wobble-${kind}`,
  };
}

function detectScene(panel: ComicPanel): ComicScene {
  const explicit = String(panel.scene || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['terminal', 'whiteboard', 'incident_room', 'meeting', 'network', 'desk', 'plain'].includes(explicit)) {
    return explicit as ComicScene;
  }

  if (panel.screenText) return 'terminal';

  const haystack = `${panel.action || ''} ${panel.dialogue || ''} ${panel.robotThought || ''} ${panel.visualFocus || ''}`.toLowerCase();
  if (/\b(?:whiteboard|diagram|arrow|architecture|schema|chart)\b/.test(haystack)) return 'whiteboard';
  if (/\b(?:incident|outage|pager|status|sev|war room|rollback|postmortem)\b/.test(haystack)) return 'incident_room';
  if (/\b(?:meeting|standup|roadmap|kpi|slide|stakeholder|executive)\b/.test(haystack)) return 'meeting';
  if (/\b(?:dns|tcp|packet|cache|cdn|api|queue|service|network)\b/.test(haystack)) return 'network';
  if (/\b(type|typing|terminal|deploy|build|compile|keyboard|cursor|shell|screen|monitor|reply|debug|logs?|ssh|kubectl|merge|commit|branch|prod|production|prompt|code)\b/.test(haystack)) return 'terminal';
  if (/\b(?:desk|laptop|coffee|keyboard|chair)\b/.test(haystack)) return 'desk';
  return 'plain';
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
  filters.push(buildFilter('character-wobble-tux', renderSeed + 361, 0.0109, 0.58));
  filters.push(buildFilter('character-wobble-python', renderSeed + 391, 0.0114, 0.62));
  filters.push(buildFilter('character-wobble-kube_captain', renderSeed + 421, 0.0108, 0.6));

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

function roughArcPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startAngle: number,
  endAngle: number,
  rng: () => number,
): Point[] {
  const points: Point[] = [];
  const segments = 7;

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const angle = lerp(startAngle, endAngle, t) + jitter(rng, 0.025);
    points.push({
      x: cx + Math.cos(angle) * rx + jitter(rng, 0.35),
      y: cy + Math.sin(angle) * ry + jitter(rng, 0.35),
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

function roughPolyline(points: Point[], rng: () => number, controls: SketchControls): Point[] {
  const roughPoints: Point[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const segment = roughLinePoints(points[index], points[index + 1], rng, controls, 4, 0.06);
    if (index > 0) segment.shift();
    roughPoints.push(...segment);
  }
  return roughPoints;
}

function roughSnakePoints(points: Point[], rng: () => number): Point[] {
  return points.map((point, index) => ({
    x: point.x + jitter(rng, index === 0 || index === points.length - 1 ? 0.45 : 1.0),
    y: point.y + jitter(rng, index === 0 || index === points.length - 1 ? 0.45 : 1.0),
  }));
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
