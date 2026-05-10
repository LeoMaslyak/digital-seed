// Integration health row — shows live status of connected services.
// Status is polled from /api/health every 30 seconds.
// CUSTOMIZE: Add/remove pills to match the integrations you care about.
const { useState: useStateF, useEffect: useEffectF } = React;

function IntegrationPill({ status, name, detail }) {
  const dotClass = status === 'ok' ? 'ok' : status === 'warn' ? 'warn' : status === 'mute' ? 'mute' : 'err';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 14px',
      background: status === 'mute' ? 'transparent' : 'oklch(0.20 0.02 248 / 0.6)',
      border: '1px solid var(--border)',
      borderRadius: 999,
      fontSize: 12,
      color: status === 'mute' ? 'var(--fg-faint)' : 'var(--fg-mute)',
      opacity: status === 'mute' ? 0.7 : 1
    }}>
      <span className={`dot ${dotClass}`} />
      <span style={{fontWeight: 500, color: status === 'mute' ? 'var(--fg-faint)' : 'var(--fg)'}}>{name}</span>
      <span className="mono" style={{fontSize: 11, color: 'var(--fg-dim)'}}>{detail}</span>
    </div>
  );
}

function IntegrationRow() {
  const [health, setHealth] = useStateF(null);

  useEffectF(() => {
    function poll() {
      fetch('/api/health')
        .then(r => r.json())
        .then(d => setHealth(d))
        .catch(() => setHealth(null));
    }
    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, []);

  // CUSTOMIZE: Add your own integration pills here.
  // status: 'ok' | 'warn' | 'err' | 'mute'
  const items = [
    { status: health ? 'ok' : 'warn', name: 'Claude Code',   detail: health ? `Connected · ${health.claudeVersion || 'v1.x'}` : 'Checking…' },
    { status: health?.memory  ? 'ok' : 'warn', name: 'Memory Server', detail: health?.memory  ? 'Active' : 'Not started' },
    { status: health?.rag     ? 'ok' : 'warn', name: 'RAG Index',     detail: health?.ragDocs  ? `${health.ragDocs} docs` : '—' },
    { status: health?.knowledgeBase ? 'ok' : 'warn', name: 'Knowledge Index',  detail: health?.knowledgeBaseSyncAge || 'Synced' },
    { status: 'mute',                           name: 'PAI Bridge',    detail: 'Not configured' },
  ];

  return (
    <div style={{
      display:'flex', alignItems:'center',
      gap: 10, padding: '14px 0 6px 0', flexWrap: 'wrap'
    }}>
      <div className="label" style={{marginRight: 8}}>INTEGRATIONS</div>
      {items.map(i => <IntegrationPill key={i.name} {...i} />)}
      <div style={{flex: 1}} />
      <button className="btn-ghost btn" style={{fontSize: 12}}>
        <Icon.Settings size={12} /> Manage
      </button>
    </div>
  );
}

window.IntegrationRow = IntegrationRow;
