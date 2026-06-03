/* signin.jsx */
function SignIn({ accounts, onSignIn }) {
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const fill = (a) => { setEmail(a.email); setPw('demo'); };
  const submit = () => {
    if (!email || loading) return;
    setLoading(true);
    const acct = accounts.find((a) => a.email === email) || accounts[0];
    setTimeout(() => onSignIn(acct), 650);
  };

  return (
    <div className="signin-wrap">
      <div className="signin-card">
        <div className="signin-hero">
          <span className="brand-mark"><LucideIcon name="Sparkles" size={26} strokeWidth={2.5} /></span>
          <h1>Growth Agent</h1>
          <p>El PM que ya leyó la última reunión. Estado, riesgos y briefs de tus cuentas.</p>
        </div>

        <div className="field">
          <label>Email</label>
          <input className="input" type="email" value={email} placeholder="vos@studio.co"
            onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input className="input" type="password" value={pw} placeholder="••••••••"
            onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} onClick={submit} disabled={!email || loading}>
          {loading ? <LucideIcon name="Loader2" size={16} className="spin" /> : 'Entrar'}
        </button>

        <div className="qlogin-label">o entrá como demo</div>
        <div className="qlogin-row">
          {accounts.map((a) => (
            <button key={a.id} className="qlogin" onClick={() => fill(a)}>
              <span className="avatar"><LucideIcon name="User" size={16} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="ql-name">{a.name}</div>
                <div className="ql-scope">{a.email}</div>
              </div>
              <span className="ql-pill">{a.scope}</span>
            </button>
          ))}
        </div>

        <div className="pwhint">
          Demo · cualquier contraseña funciona. Probá <span className="mono">demo</span>.
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { SignIn });