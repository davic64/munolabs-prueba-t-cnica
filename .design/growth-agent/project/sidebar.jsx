/* sidebar.jsx */
function Sidebar({ open, onClose, user, clients, activeClient, onSelectClient, pendingCount, onPending, onSignOut, route }) {
  return (
    <>
      <div className={'scrim' + (open ? ' show' : '')} onClick={onClose}></div>
      <aside className={'sb' + (open ? ' open' : '')}>
        <div className="sb-brand">
          <span className="brand-mark"><LucideIcon name="Sparkles" size={17} strokeWidth={2.5} /></span>
          <span className="pname">Growth Agent</span>
        </div>

        <div className="sb-user">
          <span className="avatar"><LucideIcon name="User" size={17} /></span>
          <div style={{ minWidth: 0 }}>
            <div className="uname">{user.name}</div>
            <div className="umeta">{user.role} · {user.clients} cuentas</div>
          </div>
        </div>

        <div className="sb-label">Cuentas</div>
        <nav className="sb-clients">
          {clients.map((c) => (
            <button
              key={c.id}
              className={'sb-client' + (activeClient === c.id && route === 'chat' ? ' active' : '')}
              onClick={() => onSelectClient(c.id)}
            >
              <span className="dot"></span>
              {c.name}
            </button>
          ))}
        </nav>

        <div className="sb-foot">
          <button className={'sb-link' + (route === 'pending' ? ' active' : '')} onClick={onPending}>
            <LucideIcon name="Inbox" size={16} />
            Pending writes
            {pendingCount > 0 && <span className="count-chip">{pendingCount}</span>}
          </button>
          <button className="sb-link muted" onClick={onSignOut}>
            <LucideIcon name="LogOut" size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
Object.assign(window, { Sidebar });