/* pending.jsx */
const TOOL_ICON = (tool) => {
  if (tool.startsWith('notion')) return 'FileText';
  if (tool.startsWith('linear')) return 'ListTodo';
  if (tool.startsWith('calendar')) return 'Calendar';
  if (tool.startsWith('slack')) return 'MessageSquare';
  return 'Wrench';
};
const STATUS_META = {
  pending:   { label: 'Pendiente', icon: 'Clock' },
  confirmed: { label: 'Confirmado', icon: 'CheckCircle2' },
  rejected:  { label: 'Rechazado', icon: 'X' },
  failed:    { label: 'Falló', icon: 'AlertTriangle' },
};

function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={'status-pill s-' + status}>
      <LucideIcon name={m.icon} size={13} />
      {m.label}
    </span>
  );
}

function IntentCard({ it, onConfirm, onReject }) {
  return (
    <div className="intent-card" style={{ opacity: it.status === 'rejected' || it.status === 'failed' ? 0.72 : 1 }}>
      <div className="intent-head">
        <span className="intent-toolicon"><LucideIcon name={TOOL_ICON(it.tool)} size={16} /></span>
        <div style={{ minWidth: 0 }}>
          <div className="intent-title">{it.title}</div>
          <div className="intent-tool">{it.tool}</div>
        </div>
        <span className="intent-ts">{it.ts}</span>
      </div>
      <div className="intent-body">{it.preview}</div>
      <div className="intent-foot">
        <span className="intent-client">{it.client}</span>
        <StatusPill status={it.status} />
        {it.status === 'pending' && (
          <div className="intent-actions">
            <button className="btn btn-ghost btn-sm btn-danger-ghost" onClick={() => onReject(it.id)}>
              <LucideIcon name="X" size={14} /> Rechazar
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => onConfirm(it.id)}>
              <LucideIcon name="Check" size={14} /> Confirmar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingPage({ intents, onConfirm, onReject, onBack }) {
  const counts = { pending: 0, confirmed: 0, rejected: 0, failed: 0 };
  intents.forEach((i) => { counts[i.status] = (counts[i.status] || 0) + 1; });
  const order = ['pending', 'confirmed', 'rejected', 'failed'];
  const sorted = [...intents].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <div className="pending-page">
      <div className="pending-inner">
        <button className="back-link" onClick={onBack}>
          <LucideIcon name="ArrowLeft" size={15} /> Volver al chat
        </button>
        <div className="pending-head">
          <h1>Pending writes</h1>
          <p>Acciones que el agente quiere ejecutar en tus herramientas. Nada se escribe sin tu confirmación.</p>
        </div>

        <div className="stat-row">
          {order.map((s) => (
            <div className={'stat-pill s-' + s} key={s}>
              <span className="dot"></span>
              <span className="stat-n">{counts[s]}</span>
              <span className="stat-l">{STATUS_META[s].label}</span>
            </div>
          ))}
        </div>

        {intents.length === 0 ? (
          <div className="pending-empty">
            <span className="ico-box"><LucideIcon name="Inbox" size={24} /></span>
            <h3>No hay nada pendiente</h3>
            <p>Cuando el agente proponga escribir en Linear, Notion o Slack, aparece acá para que lo confirmes.</p>
          </div>
        ) : (
          <div className="intent-grid">
            {sorted.map((it) => (
              <IntentCard key={it.id} it={it} onConfirm={onConfirm} onReject={onReject} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
Object.assign(window, { PendingPage });