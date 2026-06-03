/* app.jsx — routing, theme, tweaks orchestrator */
const { useState, useEffect, useRef } = React;

const prefersDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "accent": ["#8b5cf6", "#d946ef"],
  "fontScale": 1,
  "startActive": false
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  ["#8b5cf6", "#d946ef"], // violet → fuchsia (default)
  ["#6366f1", "#a855f7"], // indigo → purple
  ["#7c3aed", "#ec4899"], // violet → pink
  ["#0ea5e9", "#8b5cf6"], // sky → violet
];

function heroConversation() {
  return [
    { id: 'h1', role: 'user', text: '¿Qué quedó con Acme en la reunión de ayer? Tengo el QBR mañana a las 10.' },
    { id: 'h2', role: 'assistant', resp: RESPONSES.status },
  ];
}

function App() {
  const [t, setTweak] = useTweaks({ ...TWEAK_DEFAULTS, dark: TWEAK_DEFAULTS.dark || prefersDark });

  const [route, setRoute] = useState('signin'); // signin | chat | pending
  const [account, setAccount] = useState(null);
  const [clients, setClients] = useState(CLIENTS);
  const [activeClient, setActiveClient] = useState(CLIENTS[0].id);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [intents, setIntents] = useState(INTENTS);
  const [sbOpen, setSbOpen] = useState(false);
  const idRef = useRef(0);
  const nextId = () => 'm' + (++idRef.current);

  // theme + accent + scale.
  // Disable transitions for the frame in which theme vars swap — otherwise a
  // background/border transition mid-flight can hold a stale (old-theme) color.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-instant');
    root.setAttribute('data-theme', t.dark ? 'dark' : 'light');
    const acc = t.accent || ACCENT_OPTIONS[0];
    root.style.setProperty('--grad-from', acc[0]);
    root.style.setProperty('--grad-to', acc[1]);
    root.style.setProperty('--scale', t.fontScale || 1);
    void root.offsetWidth; // force reflow so the var change applies with transitions off
    const id = requestAnimationFrame(() => root.classList.remove('theme-instant'));
    return () => cancelAnimationFrame(id);
  }, [t.dark, t.accent, t.fontScale]);

  // seed conversation from the startActive tweak
  useEffect(() => {
    if (route === 'chat') setMessages(t.startActive ? heroConversation() : []);
    // eslint-disable-next-line
  }, [t.startActive]);

  const pendingCount = intents.filter((i) => i.status === 'pending').length;
  const activeName = (clients.find((c) => c.id === activeClient) || {}).name;

  const signIn = (acct) => {
    setAccount(acct);
    const cl = acct.scopeLabel === 'all' ? CLIENTS : CLIENTS.filter((c) => c.id === acct.scopeLabel);
    setClients(cl);
    setActiveClient(cl[0].id);
    setMessages(t.startActive ? heroConversation() : []);
    setRoute('chat');
  };
  const signOut = () => { setRoute('signin'); setMessages([]); setSbOpen(false); };

  const send = (text, suggestionId) => {
    if (sending) return;
    const resp = responseFor(text, suggestionId);
    const aId = nextId();
    setMessages((m) => [...m, { id: nextId(), role: 'user', text }, { id: aId, role: 'assistant', typing: true }]);
    setSending(true);
    setTimeout(() => {
      setMessages((m) => m.map((x) => (x.id === aId ? { id: aId, role: 'assistant', resp } : x)));
      setSending(false);
    }, 1300);
  };

  const selectClient = (id) => { setActiveClient(id); setRoute('chat'); setSbOpen(false); };
  const confirmIntent = (id) => setIntents((arr) => arr.map((i) => (i.id === id ? { ...i, status: 'confirmed' } : i)));
  const rejectIntent = (id) => setIntents((arr) => arr.map((i) => (i.id === id ? { ...i, status: 'rejected' } : i)));

  const tweaks = (
    <TweaksPanel>
      <TweakSection label="Tema" />
      <TweakToggle label="Modo oscuro" value={t.dark} onChange={(v) => setTweak('dark', v)} />
      <TweakColor label="Acento de marca" value={t.accent} options={ACCENT_OPTIONS} onChange={(v) => setTweak('accent', v)} />
      <TweakSection label="Tipografía" />
      <TweakSlider label="Escala de texto" value={t.fontScale} min={0.9} max={1.15} step={0.05} onChange={(v) => setTweak('fontScale', v)} />
      <TweakSection label="Demo" />
      <TweakToggle label="Empezar con conversación" value={t.startActive} onChange={(v) => setTweak('startActive', v)} />
    </TweaksPanel>
  );

  if (route === 'signin') {
    return (<>
      <SignIn accounts={ACCOUNTS} onSignIn={signIn} />
      {tweaks}
    </>);
  }

  return (
    <div className="shell">
      <Sidebar
        open={sbOpen} onClose={() => setSbOpen(false)}
        user={account || USER} clients={clients}
        activeClient={activeClient} onSelectClient={selectClient}
        pendingCount={pendingCount} onPending={() => { setRoute('pending'); setSbOpen(false); }}
        onSignOut={signOut} route={route}
      />
      <main className="main">
        <header className="chat-header">
          <button className="icon-btn menu-btn" onClick={() => setSbOpen(true)} aria-label="Menú">
            <LucideIcon name="Menu" size={18} />
          </button>
          <span className="chat-title">{route === 'pending' ? 'Pending writes' : (activeName || 'Todas las cuentas')}</span>
          {route === 'chat' && (
            <span className="status-badge"><span className="dot live"></span>Conectado</span>
          )}
          <span className="header-spacer"></span>
          <button className="icon-btn" onClick={() => setTweak('dark', !t.dark)} aria-label="Cambiar tema">
            <LucideIcon name={t.dark ? 'Sun' : 'Moon'} size={17} />
          </button>
        </header>

        {route === 'pending' ? (
          <PendingPage intents={intents} onConfirm={confirmIntent} onReject={rejectIntent} onBack={() => setRoute('chat')} />
        ) : (
          <ChatView messages={messages} sending={sending} onSend={send} suggestions={SUGGESTIONS} activeClientName={activeName} />
        )}
      </main>
      {tweaks}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);