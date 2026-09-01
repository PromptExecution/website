import { describe, expect, test } from 'bun:test';
import { renderComicToSVG } from './svg-renderer.ts';

describe('loop-aware SVG rendering', () => {
  test('renders exact screen evidence and escapes generated text', () => {
    const svg = renderComicToSVG({
      title: 'Independent Review',
      day: '2026-07-22',
      model: 'test-model',
      panels: [
        {
          panelNumber: 1,
          speaker: 'robot',
          dialogue: 'The audit passed.',
          action: 'shows approval screen',
          screenText: 'A & B\nOK <100%>',
        },
      ],
    });

    expect(svg).toContain('class="screen-text"');
    expect(svg).toContain('A &amp; B');
    expect(svg).toContain('OK &lt;100%&gt;');
    expect(svg).not.toContain('OK <100%>');
  });
});
