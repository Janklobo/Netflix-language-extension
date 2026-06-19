import type { SubtitleEntry } from '@/shared/types/subtitle.types';

export function parseTimestampToMs(timestamp: string, tickRate = 1000): number {
  if (!timestamp) return 0;
  const trimmed = timestamp.trim();
  if (trimmed.endsWith('s')) {
    return parseFloat(trimmed.slice(0, -1)) * 1000;
  }
  if (trimmed.endsWith('t')) {
    const ticks = parseInt(trimmed.slice(0, -1), 10);
    return (ticks / tickRate) * 1000;
  }
  const parts = trimmed.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const secondsParts = parts[2].split(/[,.]/);
    const seconds = parseInt(secondsParts[0], 10);
    const ms = secondsParts[1] ? parseInt(secondsParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
    return (hours * 3600 + minutes * 60 + seconds) * 1000 + ms;
  }
  const floatVal = parseFloat(trimmed);
  if (!isNaN(floatVal)) {
    return floatVal * 1000;
  }
  return 0;
}

export function parseTTML(xmlText: string): SubtitleEntry[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  
  // Attempt to parse tickRate if specified
  const ttElement = xmlDoc.getElementsByTagName('tt')[0];
  let tickRate = 1000;
  if (ttElement) {
    const rateAttr = ttElement.getAttribute('ttp:tickRate') || ttElement.getAttribute('tickRate');
    if (rateAttr) {
      const parsedRate = parseInt(rateAttr, 10);
      if (!isNaN(parsedRate)) tickRate = parsedRate;
    }
  }

  const pElements = xmlDoc.getElementsByTagName('p');
  const entries: SubtitleEntry[] = [];
  let index = 0;

  for (let i = 0; i < pElements.length; i++) {
    const p = pElements[i];
    const begin = p.getAttribute('begin') || '';
    const end = p.getAttribute('end') || '';
    const text = p.textContent?.trim() || '';
    if (text) {
      entries.push({
        index: ++index,
        startMs: parseTimestampToMs(begin, tickRate),
        endMs: parseTimestampToMs(end, tickRate),
        text,
      });
    }
  }
  return entries;
}

export function parseWebVTT(vttText: string): SubtitleEntry[] {
  const lines = vttText.split(/\r?\n/);
  const entries: SubtitleEntry[] = [];
  let index = 0;
  let currentEntry: Partial<SubtitleEntry> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const parts = line.split('-->');
      const start = parseTimestampToMs(parts[0].trim());
      // Strip WebVTT cue settings (position, align, size, etc.) that follow
      // the end timestamp, e.g. "00:00:04.000 position:10% align:start"
      const endToken = parts[1].trim().split(/\s+/)[0];
      const end = parseTimestampToMs(endToken);
      currentEntry = { index: ++index, startMs: start, endMs: end, text: '' };
    } else if (currentEntry) {
      if (line) {
        if (currentEntry.text) {
          currentEntry.text += ' ' + line;
        } else {
          currentEntry.text = line;
        }
      } else {
        if (currentEntry.text) {
          const cleanText = currentEntry.text.replace(/<[^>]+>/g, '').trim();
          entries.push({
            index: currentEntry.index!,
            startMs: currentEntry.startMs!,
            endMs: currentEntry.endMs!,
            text: cleanText,
          });
        }
        currentEntry = null;
      }
    }
  }
  if (currentEntry && currentEntry.text) {
    const cleanText = currentEntry.text.replace(/<[^>]+>/g, '').trim();
    entries.push({
      index: currentEntry.index!,
      startMs: currentEntry.startMs!,
      endMs: currentEntry.endMs!,
      text: cleanText,
    });
  }
  return entries;
}

export function parseJSONSubtitles(jsonText: string): SubtitleEntry[] | null {
  try {
    const obj = JSON.parse(jsonText);
    const events = obj?.events || obj?.timedText?.events;
    if (Array.isArray(events)) {
      const entries: SubtitleEntry[] = [];
      let index = 0;
      for (const ev of events) {
        if (!ev.segs && !ev.text) continue;
        
        const startMs = typeof ev.startTime === 'number' ? ev.startTime : (ev.tStartMs || ev.time || 0);
        const duration = typeof ev.duration === 'number' ? ev.duration : (ev.dDurationMs || 0);
        const endMs = typeof ev.endTime === 'number' ? ev.endTime : (startMs + duration);
        
        let text = '';
        if (Array.isArray(ev.segs)) {
          text = (ev.segs as Array<{ utf8?: string }>).map((s) => s.utf8 ?? '').join(' ').trim();
        } else if (ev.text) {
          text = ev.text.trim();
        }
        
        if (text) {
          entries.push({
            index: ++index,
            startMs,
            endMs,
            text,
          });
        }
      }
      return entries;
    }
  } catch {
    // Ignored
  }
  return null;
}
