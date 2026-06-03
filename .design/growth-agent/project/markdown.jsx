/* markdown.jsx — focused renderer for assistant messages.
   Supports: ## [Icon] heading (gradient bar), ### subheading, GFM tables (striped+hover),
   callouts via > [!warning|danger|success|info], plain blockquotes, ordered/unordered
   lists, fenced + inline code, **bold**, *italic*, and "Fuente: ..." citation chips. */

const CALLOUTS = {
  warning: { icon: 'AlertTriangle', tone: 'amber' },
  danger:  { icon: 'ShieldAlert',   tone: 'red' },
  success: { icon: 'CheckCircle2',  tone: 'emerald' },
  info:    { icon: 'Info',          tone: 'blue' },
};

function parseInline(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\*(.+?)\*/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) out.push(<strong key={'b' + k++}>{m[1]}</strong>);
    else if (m[2] != null) out.push(<code className="md-code" key={'c' + k++}>{m[2]}</code>);
    else if (m[3] != null) out.push(<em key={'i' + k++}>{m[3]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function MarkdownTable({ head, rows }) {
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

function Callout({ type, text }) {
  const cfg = CALLOUTS[type] || CALLOUTS.info;
  return (
    <div className={'md-callout tone-' + cfg.tone}>
      <LucideIcon name={cfg.icon} size={20} strokeWidth={2} className="md-callout-icon" />
      <div className="md-callout-body">{parseInline(text)}</div>
    </div>
  );
}

function CitationChips({ items }) {
  return (
    <div className="md-cites">
      {items.map((c, i) => (
        <span className="md-cite" key={i}>
          <LucideIcon name="ArrowUpRight" size={12} strokeWidth={2.25} />
          {c}
        </span>
      ))}
    </div>
  );
}

function Markdown({ source }) {
  const lines = (source || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0, key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }

    // fenced code
    if (line.trim().startsWith('```')) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { buf.push(lines[i]); i++; }
      i++;
      blocks.push(<pre className="md-pre" key={key++}><code>{buf.join('\n')}</code></pre>);
      continue;
    }

    // h3 (check before h2)
    if (/^###\s+/.test(line)) {
      blocks.push(<h3 className="md-h3" key={key++}>{parseInline(line.replace(/^###\s+/, ''))}</h3>);
      i++; continue;
    }

    // h2 with optional [Icon] and gradient bar
    if (/^##\s+/.test(line)) {
      const m = line.match(/^##\s+(?:\[(\w+)\]\s+)?(.*)$/);
      const icon = m[1] || 'Sparkles';
      const title = m[2];
      blocks.push(
        <div className="md-h2" key={key++}>
          <span className="md-h2-bar" aria-hidden="true"></span>
          <LucideIcon name={icon} size={20} strokeWidth={2.25} className="md-h2-icon" />
          <h2>{parseInline(title)}</h2>
        </div>
      );
      i++; continue;
    }

    // blockquote / callout — collect consecutive '>' lines
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      const joined = buf.join(' ').trim();
      const cm = joined.match(/^\[!(\w+)\]\s*(.*)$/i);
      if (cm) blocks.push(<Callout key={key++} type={cm[1].toLowerCase()} text={cm[2]} />);
      else blocks.push(<blockquote className="md-quote" key={key++}>{parseInline(joined)}</blockquote>);
      continue;
    }

    // table
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i])); i++;
      }
      blocks.push(<MarkdownTable key={key++} head={head} rows={rows} />);
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++;
      }
      blocks.push(<ul className="md-ul" key={key++}>{items.map((it, x) => <li key={x}>{parseInline(it)}</li>)}</ul>);
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++;
      }
      blocks.push(<ol className="md-ol" key={key++}>{items.map((it, x) => <li key={x}>{parseInline(it)}</li>)}</ol>);
      continue;
    }

    // citations — consecutive "Fuente:" lines
    if (/^Fuente:/i.test(line)) {
      const items = [];
      while (i < lines.length && /^Fuente:/i.test(lines[i])) {
        items.push(lines[i].replace(/^Fuente:\s*/i, '')); i++;
      }
      blocks.push(<CitationChips key={key++} items={items} />);
      continue;
    }

    // paragraph
    const buf = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(\s*>|#{2,3}\s|```|\s*[-*]\s|\s*\d+\.\s|Fuente:)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    blocks.push(<p className="md-p" key={key++}>{parseInline(buf.join(' '))}</p>);
  }

  return <div className="md">{blocks}</div>;
}

Object.assign(window, { Markdown });