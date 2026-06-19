import { describe, it, expect } from 'vitest';
import {
  parseTimestampToMs,
  parseTTML,
  parseWebVTT,
  parseJSONSubtitles,
} from '@/shared/utils/subtitle-parser';

// Self-contained DOMParser mock for Node environment in Vitest
if (typeof global.DOMParser === 'undefined') {
  global.DOMParser = class {
    parseFromString(markup: string, _mimeType: string) {
      return {
        getElementsByTagName: (tagName: string) => {
          if (tagName === 'tt') {
            const matches = markup.match(/<tt\s+[^>]*ttp:tickRate="(\d+)"[^>]*>/i);
            const rate = matches ? matches[1] : null;
            return [
              {
                getAttribute: (name: string) => (name === 'ttp:tickRate' ? rate : null),
              },
            ];
          }
          if (tagName === 'p') {
            const pRegex = /<p\s+begin="([^"]*)"\s+end="([^"]*)"[^>]*>([\s\S]*?)<\/p>/gi;
            const elements: any[] = [];
            let match;
            while ((match = pRegex.exec(markup)) !== null) {
              const begin = match[1];
              const end = match[2];
              const text = match[3].replace(/<[^>]+>/g, '').trim();
              elements.push({
                getAttribute: (name: string) => {
                  if (name === 'begin') return begin;
                  if (name === 'end') return end;
                  return null;
                },
                textContent: text,
              });
            }
            return elements;
          }
          return [];
        },
      } as any;
    }
  } as any;
}

describe('parseTimestampToMs', () => {
  it('should parse HH:MM:SS.mmm format', () => {
    expect(parseTimestampToMs('00:01:20.123')).toBe(80123);
    expect(parseTimestampToMs('01:30:15.500')).toBe(5415500);
  });

  it('should parse seconds format with s suffix', () => {
    expect(parseTimestampToMs('120.5s')).toBe(120500);
    expect(parseTimestampToMs('45s')).toBe(45000);
  });

  it('should parse ticks format with t suffix', () => {
    expect(parseTimestampToMs('1000t', 1000)).toBe(1000);
    expect(parseTimestampToMs('24000t', 1000)).toBe(24000);
    expect(parseTimestampToMs('48000t', 2000)).toBe(24000);
  });

  it('should fallback to plain float seconds', () => {
    expect(parseTimestampToMs('120.123')).toBe(120123);
  });
});

describe('parseTTML', () => {
  it('should parse TTML timed text XML', () => {
    const xml = `
      <tt xml:lang="ja" ttp:tickRate="1000">
        <body>
          <div>
            <p begin="00:00:05.100" end="00:00:08.200">こんにちは</p>
            <p begin="10s" end="12.5s">さようなら</p>
          </div>
        </body>
      </tt>
    `;
    const entries = parseTTML(xml);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      index: 1,
      startMs: 5100,
      endMs: 8200,
      text: 'こんにちは',
    });
    expect(entries[1]).toEqual({
      index: 2,
      startMs: 10000,
      endMs: 12500,
      text: 'さようなら',
    });
  });
});

describe('parseWebVTT', () => {
  it('should parse WebVTT text', () => {
    const vtt = `WEBVTT

00:00:01.500 --> 00:00:04.000
Hello World

00:00:05.000 --> 00:00:08.500
<b>Welcome</b> to LinguaFlix
`;
    const entries = parseWebVTT(vtt);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      index: 1,
      startMs: 1500,
      endMs: 4000,
      text: 'Hello World',
    });
    expect(entries[1]).toEqual({
      index: 2,
      startMs: 5000,
      endMs: 8500,
      text: 'Welcome to LinguaFlix',
    });
  });
});

describe('parseJSONSubtitles', () => {
  it('should parse Netflix timed text JSON', () => {
    const json = JSON.stringify({
      events: [
        {
          startTime: 1000,
          duration: 3000,
          segs: [{ utf8: 'Hello' }, { utf8: 'from JSON' }],
        },
        {
          startTime: 5000,
          duration: 2000,
          text: 'Single text field',
        },
      ],
    });
    const entries = parseJSONSubtitles(json);
    expect(entries).not.toBeNull();
    expect(entries).toHaveLength(2);
    expect(entries![0]).toEqual({
      index: 1,
      startMs: 1000,
      endMs: 4000,
      text: 'Hello from JSON',
    });
    expect(entries![1]).toEqual({
      index: 2,
      startMs: 5000,
      endMs: 7000,
      text: 'Single text field',
    });
  });
});
