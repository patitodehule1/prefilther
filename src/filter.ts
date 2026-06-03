import type { Row, ErrorOut, EventOut, SuccessOut, Result, Level } from './types.js';
import { ANSI, SPINNER, PROGRESS, PREFIX, TS, LEVEL, STACK, SQLERR, CONNERR, STARTSTOP, SUCCESS } from './regex.js';

function lvl(raw: string): Level | null {
  const m = raw.match(LEVEL);
  if (!m) return null;
  const u = m[1].toUpperCase();
  if (u === 'ERR') return 'ERROR';
  if (u === 'WARN' || u === 'WARNING') return 'WARNING';
  if (u === 'PANIC') return 'FATAL';
  return u as Level;
}

function shortPath(s: string): string {
  return s
    .replace(/\/(?:home|usr\/src|var\/www|app|opt)\/[^/\s]+\/(src|app|dist|build)/g, '/$1')
    .replace(/\/(?:home|usr\/local|opt)\/[^/\s:]+\//g, '/');
}

function rel(ts: number | null, newest: number): string | null {
  if (!ts || !newest) return null;
  const d = Math.max(0, Math.round((newest - ts) / 1000));
  if (d < 60) return d + 's ago';
  if (d < 3600) return Math.round(d / 60) + 'm ago';
  return Math.round(d / 3600) + 'h ago';
}

const bare = (s: string) => s.replace(TS, '').replace(LEVEL, '').replace(/\s+/g, ' ').trim();

export function run(input: string, windowMinutes: number): Result {
  const rawLines = input.split(/\r?\n/);
  const rows: Row[] = [];
  let newest = 0;

  for (let line of rawLines) {
    line = line.replace(ANSI, '');
    if (line.includes('\r')) line = line.slice(line.lastIndexOf('\r') + 1);
    if (!line.trim()) continue;

    let container = '';
    let content = line;
    const p = line.match(PREFIX);
    if (p) { container = p[1].trim(); content = p[2]; }

    if (PROGRESS.test(content)) continue;
    if (!content.replace(SPINNER, '').trim()) continue;

    const tm = content.match(TS);
    const ts = tm ? Date.parse(tm[1]) : null;
    if (ts) newest = Math.max(newest, ts);

    rows.push({
      container,
      content: shortPath(content),
      level: lvl(content),
      ts,
      isStack: STACK.test(bare(content)),
    });
  }

  // dedup consecutive + time window
  const cutoff = newest ? newest - windowMinutes * 60000 : 0;
  const kept: Row[] = [];
  for (const r of rows) {
    if (r.ts && newest && r.ts < cutoff && r.level !== 'ERROR' && r.level !== 'FATAL') continue;
    const last = kept[kept.length - 1];
    if (last && last.content === r.content && last.container === r.container) {
      last.dups = (last.dups || 1) + 1;
      continue;
    }
    kept.push(r);
  }

  // extract
  const errors: ErrorOut[] = [];
  const events: EventOut[] = [];
  let lastSuccess: SuccessOut | null = null;

  for (let i = 0; i < kept.length; i++) {
    const r = kept[i];
    const c = r.content;

    if (r.isStack) continue;

    if (r.level === 'ERROR' || r.level === 'FATAL' || r.level === 'WARNING') {
      // lookahead: collect stack frames
      let j = i + 1;
      const frames: string[] = [];
      while (j < kept.length && kept[j].isStack) { frames.push(bare(kept[j].content)); j++; }

      let context = '';
      if (frames.length) {
        const t = frames.length > 4
          ? [frames[0], `… ${frames.length - 4} frames …`, ...frames.slice(-3)]
          : frames;
        context = t.join(' / ');
        i = j - 1;
      } else if (SQLERR.test(c)) {
        const det: string[] = [];
        for (let k = i + 1; k < kept.length && det.length < 2 && !kept[k].level; k++)
          det.push(bare(kept[k].content));
        context = det.join(' ⏎ ');
      } else if (CONNERR.test(c)) {
        context = 'conn';
      }

      errors.push({
        container: r.container || '-',
        level: r.level,
        message: bare(c).slice(0, 300),
        context: context.slice(0, 400),
        when: rel(r.ts, newest) || '-',
        repeat: r.dups || 1,
      });
      continue;
    }

    if (STARTSTOP.test(c)) {
      events.push({
        container: r.container || '-',
        type: /shutdown|stop|exit|signal|terminat/i.test(c) ? 'down' : 'up',
        msg: bare(c).slice(0, 120),
      });
      continue;
    }

    if (SUCCESS.test(c))
      lastSuccess = { container: r.container || '-', msg: bare(c).slice(0, 160), when: rel(r.ts, newest) || '-' };
  }

  const nFatal = errors.filter((e) => e.level === 'FATAL').length;
  const nErr = errors.filter((e) => e.level === 'ERROR').length;
  const nWarn = errors.filter((e) => e.level === 'WARNING').length;
  const bad = new Set(errors.map((e) => e.container));
  const summary = errors.length === 0
    ? `No errors. ${events.length} lifecycle events, ${kept.length} lines kept.`
    : `${nFatal} fatal, ${nErr} error, ${nWarn} warn across ${bad.size} container(s): ${[...bad].join(', ')}.`;

  return {
    summary,
    stats: { in: rawLines.length, kept: kept.length, dropped: rawLines.length - kept.length },
    errors,
    events,
    last_success: lastSuccess,
  };
}
