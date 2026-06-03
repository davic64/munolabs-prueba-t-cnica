/* chat.jsx */

function ToolCard({ t }) {
  const [open, setOpen] = React.useState(false);
  const stateIcon = t.state === 'running'
    ? <LucideIcon name="Loader2" size={14} className="spin" />
    : t.state === 'pending'
      ? <LucideIcon name="Clock" size={14} />
      : <LucideIcon name="CheckCircle2" size={14} />;
  return (
    <div className={'tool-card' + (open ? ' open' : '')}>
      <button className="tool-head" onClick={() => setOpen((o) => !o)}>
        <LucideIcon name="ChevronRight" size={14} className="tool-chev" />
        <span className={'tool-state' + (t.state === 'done' ? ' done' : '')}>{stateIcon}</span>
        <span className="tool-name">{t.tool}</span>
        <span className="tool-client">client_id: {t.client}</span>
      </button>
      {open && (
        <div className="tool-body">
          {t.note} {t.state === 'pending' && <span className="mono">· pendiente de confirmación</span>}
        </div>
      )}
    </div>
  );
}

function AssistantMessage({ msg }) {
  return (
    <div className="msg-row assistant">
      <span className="asst-avatar brand-mark"><LucideIcon name="Sparkles" size={17} strokeWidth={2.5} /></span>
      <div className="bubble-asst">
        {msg.typing ? (
          <div className="asst-card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            <div className="typing"><span></span><span></span><span></span></div>
          </div>
        ) : (
          <div className="asst-card">
            {msg.resp.tools && msg.resp.tools.length > 0 && (
              <div className="tools" style={{ marginTop: 14 }}>
                {msg.resp.tools.map((t, i) => <ToolCard key={i} t={t} />)}
              </div>
            )}
            <Markdown source={msg.resp.md} />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ suggestions, onPick }) {
  return (
    <div className="empty">
      <span className="brand-mark empty-hero"><LucideIcon name="Sparkles" size={30} strokeWidth={2.5} /></span>
      <h1 className="empty-title">¿Qué necesitás saber?</h1>
      <p className="empty-sub">Sintetizo Linear, Notion, Slack, Granola y Calendar de tus cuentas. Pedime un estado, los riesgos abiertos o el brief de tu próxima reunión.</p>
      <div className="suggest-grid">
        {suggestions.map((s) => (
          <button key={s.id} className="suggest-card" onClick={() => onPick(s)}>
            <span className="suggest-corner"><LucideIcon name="CornerDownLeft" size={14} /></span>
            <span className="suggest-icon"><LucideIcon name={s.icon} size={17} /></span>
            <div>
              <div className="suggest-cat">{s.cat}</div>
              <div className="suggest-label">{s.label}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Composer({ onSend, sending }) {
  const [val, setVal] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  const grow = (el) => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; };
  const submit = () => {
    const t = val.trim();
    if (!t || sending) return;
    onSend(t);
    setVal('');
    if (ref.current) ref.current.style.height = 'auto';
  };
  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={ref}
          rows={1}
          value={val}
          placeholder="Preguntá por una cuenta, un riesgo o un brief…"
          onChange={(e) => { setVal(e.target.value); grow(e.target); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <button className="send-btn" onClick={submit} disabled={!val.trim() || sending} aria-label="Enviar">
          {sending ? <LucideIcon name="Loader2" size={17} className="spin" /> : <LucideIcon name="Send" size={16} />}
        </button>
      </div>
      <div className="composer-hint">Enter para enviar · Shift+Enter para salto de línea</div>
    </div>
  );
}

function ChatView({ messages, sending, onSend, suggestions, activeClientName }) {
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const empty = messages.length === 0;

  return (
    <>
      <div className="chat-scroll" ref={scrollRef}>
        {empty ? (
          <EmptyState suggestions={suggestions} onPick={(s) => onSend(s.prompt, s.id)} />
        ) : (
          <div className="msgs">
            {messages.map((m) => (
              m.role === 'user'
                ? <div className="msg-row user" key={m.id}><div className="bubble-user">{m.text}</div></div>
                : <AssistantMessage key={m.id} msg={m} />
            ))}
          </div>
        )}
      </div>
      <Composer onSend={(t) => onSend(t)} sending={sending} />
    </>
  );
}

Object.assign(window, { ChatView });