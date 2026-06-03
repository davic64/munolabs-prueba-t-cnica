'use client';
/* Focused markdown renderer (mirrors Claude Design bundle).
   Supports:
   - ## [Icon] Heading  → gradient bar + Lucide icon
   - ### subheading
   - > [!warning|danger|success|info] text  → callouts
   - GFM tables (striped + hover)
   - "Fuente: ..." lines  → citation chips
   - **bold** *italic* `code`, fenced code, lists, blockquotes
*/

import * as Icons from 'lucide-react';
import type { ReactNode } from 'react';

type CalloutKind = 'warning' | 'danger' | 'success' | 'info';

const CALLOUT_CFG: Record<CalloutKind, { icon: keyof typeof Icons; tone: 'amber' | 'red' | 'emerald' | 'blue' }> = {
  warning: { icon: 'AlertTriangle', tone: 'amber' },
  danger:  { icon: 'ShieldAlert',   tone: 'red' },
  success: { icon: 'CheckCircle2',  tone: 'emerald' },
  info:    { icon: 'Info',          tone: 'blue' },
};

function getIcon(name: string): React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>>)[name];
  return C ?? Icons.Sparkles;
}

// Colored icon tints based on common status semantics
const ICON_TINT: Record<string, string> = {
  CheckCircle2: 'var(--emerald-ink)',
  CheckCircle: 'var(--emerald-ink)',
  Check: 'var(--emerald-ink)',
  ShieldAlert: 'var(--red-ink)',
  AlertTriangle: 'var(--amber-ink)',
  AlertCircle: 'var(--amber-ink)',
  XCircle: 'var(--red-ink)',
  X: 'var(--red-ink)',
  Clock: 'var(--muted)',
  CircleDashed: 'var(--muted)',
  TrendingUp: 'var(--emerald-ink)',
  TrendingDown: 'var(--red-ink)',
  Pause: 'var(--amber-ink)',
  Play: 'var(--emerald-ink)',
  Loader2: 'var(--amber-ink)',
  Info: 'var(--blue-ink)',
  Zap: 'var(--amber-ink)',
};

function parseInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Match: **bold**, `code`, *italic*, or [IconName]
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\*(.+?)\*|\[([A-Z][A-Za-z0-9]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) out.push(<strong key={`b${k++}`}>{m[1]}</strong>);
    else if (m[2] != null) out.push(<code className="md-code" key={`c${k++}`}>{m[2]}</code>);
    else if (m[3] != null) out.push(<em key={`i${k++}`}>{m[3]}</em>);
    else if (m[4] != null) {
      const Icon = getIcon(m[4]);
      const tint = ICON_TINT[m[4]];
      out.push(
        <Icon
          key={`ic${k++}`}
          size={14}
          strokeWidth={2.25}
          className="md-inline-icon"
          style={tint ? { color: tint, verticalAlign: '-2px', display: 'inline-block', marginRight: 2 } : { verticalAlign: '-2px', display: 'inline-block', marginRight: 2 }}
        />,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function MdTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>{head.map((c, i) => <th key={i}>{parseInline(c)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>{r.map((c, ci) => <td key={ci}>{parseInline(c)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ kind, text }: { kind: CalloutKind; text: string }) {
  const cfg = CALLOUT_CFG[kind] ?? CALLOUT_CFG.info;
  const Icon = getIcon(cfg.icon);
  return (
    <div className={`md-callout tone-${cfg.tone}`}>
      <Icon size={20} strokeWidth={2} className="md-callout-icon" />
      <div className="md-callout-body">{parseInline(text)}</div>
    </div>
  );
}

function CitationChips({ items }: { items: string[] }) {
  const Arrow = getIcon('ArrowUpRight');
  return (
    <div className="md-cites">
      {items.map((c, i) => (
        <span className="md-cite" key={i}>
          <Arrow size={12} strokeWidth={2.25} />
          {c}
        </span>
      ))}
    </div>
  );
}

export function Markdown({ source }: { source: string }) {
  const lines = (source || '').replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }

    // fenced code
    if (line.trim().startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { buf.push(lines[i]); i++; }
      i++;
      blocks.push(<pre className="md-pre" key={key++}><code>{buf.join('\n')}</code></pre>);
      continue;
    }

    // h3
    if (/^###\s+/.test(line)) {
      blocks.push(<h3 className="md-h3" key={key++}>{parseInline(line.replace(/^###\s+/, ''))}</h3>);
      i++; continue;
    }

    // h2 with optional [Icon]
    if (/^##\s+/.test(line)) {
      const m = line.match(/^##\s+(?:\[(\w+)\]\s+)?(.*)$/)!;
      const iconName = m[1] || 'Sparkles';
      const Icon = getIcon(iconName);
      const title = m[2];
      blocks.push(
        <div className="md-h2" key={key++}>
          <span className="md-h2-bar" aria-hidden />
          <Icon size={20} strokeWidth={2.25} className="md-h2-icon" />
          <h2>{parseInline(title)}</h2>
        </div>,
      );
      i++; continue;
    }

    // blockquote / callout — group consecutive '>' lines
    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      const joined = buf.join(' ').trim();
      const cm = joined.match(/^\[!(\w+)\]\s*(.*)$/i);
      if (cm) blocks.push(<Callout key={key++} kind={cm[1].toLowerCase() as CalloutKind} text={cm[2]} />);
      else blocks.push(<blockquote className="md-quote" key={key++}>{parseInline(joined)}</blockquote>);
      continue;
    }

    // table
    if (line.includes('|') && i + 1 < lines.length
        && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])
        && lines[i + 1].includes('-')) {
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i])); i++;
      }
      blocks.push(<MdTable key={key++} head={head} rows={rows} />);
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++;
      }
      blocks.push(<ul className="md-ul" key={key++}>{items.map((it, x) => <li key={x}>{parseInline(it)}</li>)}</ul>);
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++;
      }
      blocks.push(<ol className="md-ol" key={key++}>{items.map((it, x) => <li key={x}>{parseInline(it)}</li>)}</ol>);
      continue;
    }

    // citations — consecutive "Fuente:" lines
    if (/^Fuente:/i.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^Fuente:/i.test(lines[i])) {
        items.push(lines[i].replace(/^Fuente:\s*/i, '')); i++;
      }
      blocks.push(<CitationChips key={key++} items={items} />);
      continue;
    }

    // paragraph — collect until blank or block boundary
    const buf: string[] = [];
    while (
      i < lines.length
      && lines[i].trim() !== ''
      && !/^(\s*>|#{2,3}\s|```|\s*[-*]\s|\s*\d+\.\s|Fuente:)/.test(lines[i])
    ) { buf.push(lines[i]); i++; }
    blocks.push(<p className="md-p" key={key++}>{parseInline(buf.join(' '))}</p>);
  }

  return <div className="md">{blocks}</div>;
}
