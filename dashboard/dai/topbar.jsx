// CUSTOMIZE: Change the name, date format, or add nav links here.
const { useState, useEffect } = React;

function SessionClock() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return <span className="mono">{h}:{m}:{s}</span>;
}

function TopBar() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <header style={{
      height: 60,
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      borderBottom: '1px solid var(--border)',
      background: 'oklch(0.19 0.02 250 / 0.7)',
      backdropFilter: 'blur(14px)',
      position: 'sticky', top: 0, zIndex: 10
    }}>
      {/* Logo — CUSTOMIZE: change "DAI" and the icon */}
      <div style={{display:'flex', alignItems:'center', gap: 10}}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          display: 'grid', placeItems: 'center',
          color: 'oklch(0.15 0.02 250)',
          boxShadow: '0 0 0 1px oklch(1 0 0 / 0.1) inset'
        }}>
          <Icon.Bolt size={14} stroke={2} />
        </div>
        <div style={{fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em'}}>DAI</div>
        <div className="mono" style={{fontSize: 10.5, color: 'var(--fg-faint)', marginLeft: 2, letterSpacing: '0.06em'}}>COCKPIT</div>
      </div>

      {/* Search bar */}
      <div style={{
        marginLeft: 36,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 12px',
        background: 'oklch(0.16 0.02 248)',
        border: '1px solid var(--border)',
        borderRadius: 9,
        minWidth: 340,
        color: 'var(--fg-faint)',
        fontSize: 13,
        cursor: 'text'
      }}>
        <Icon.Search size={13} />
        <span style={{flex: 1}}>Search cases, models, tasks…</span>
        <span className="mono" style={{fontSize: 10.5, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4}}>⌘K</span>
      </div>

      <div style={{flex: 1}} />

      {/* System health pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px 6px 10px',
        background: 'oklch(0.80 0.15 155 / 0.08)',
        border: '1px solid oklch(0.80 0.15 155 / 0.25)',
        borderRadius: 999,
        fontSize: 12.5, color: 'oklch(0.90 0.10 155)'
      }}>
        <span className="dot ok" />
        System Ready
      </div>

      {/* Date + session clock */}
      <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', marginLeft: 22, marginRight: 22, lineHeight: 1.2}}>
        <div style={{fontSize: 12.5, color: 'var(--fg-mute)'}}>{dateStr}</div>
        <div style={{fontSize: 11, color: 'var(--fg-faint)'}}>Session <SessionClock /></div>
      </div>

      {/* Avatar — CUSTOMIZE: change initials and name */}
      <div style={{display:'flex', alignItems:'center', gap: 10}}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg, oklch(0.50 0.10 250), oklch(0.35 0.08 270))',
          display: 'grid', placeItems: 'center',
          fontSize: 11.5, fontWeight: 600,
          border: '1px solid var(--border-2)'
        }}>LM</div>
        <div style={{fontSize: 13, fontWeight: 500}}>Leo M.</div>
      </div>
    </header>
  );
}

window.TopBar = TopBar;
window.SessionClock = SessionClock;
