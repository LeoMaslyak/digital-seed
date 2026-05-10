// Hero row — the three primary action cards.
// CUSTOMIZE: Change the dropdowns, placeholders, or add/remove cards.
const { useState: useStateH } = React;

function HeroCard({ icon, kicker, title, subLabel, children, ctaLabel, accent, onLaunch }) {
  return (
    <div className="card hero-card" style={{
      padding: 22,
      display: 'flex', flexDirection: 'column', gap: 14,
      minHeight: 270
    }}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center', gap: 10}}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'oklch(0.82 0.14 195 / 0.10)',
            border: '1px solid oklch(0.82 0.14 195 / 0.22)',
            color: 'var(--accent)',
            display: 'grid', placeItems: 'center'
          }}>
            {icon}
          </div>
          <div>
            <div className="label" style={{marginBottom: 2}}>{kicker}</div>
            <div style={{fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em'}}>{title}</div>
          </div>
        </div>
        <span className="mono" style={{fontSize: 10.5, color:'var(--fg-faint)'}}>⌘{accent}</span>
      </div>

      <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 8}}>
        {children}
      </div>

      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: 4}}>
        <div style={{fontSize: 11.5, color:'var(--fg-dim)'}}>{subLabel}</div>
        <button className="btn btn-primary" onClick={onLaunch}>
          {ctaLabel} <Icon.ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

function HeroRow({ onQueue }) {
  const [deck, setDeck] = useStateH({ topic: '', kind: 'Project' });
  const [xl, setXl] = useStateH({ topic: '', kind: 'DCF' });
  const [agentText, setAgentText] = useStateH('');

  return (
    <div className="hero-row" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 18,
    }}>
      {/* CUSTOMIZE: Change dropdown options to match your skill packs */}
      <HeroCard
        icon={<Icon.Slides size={18} />}
        kicker="PRESENT"
        title="Project Deck"
        accent="1"
        subLabel="Uploads to Google Slides automatically"
        ctaLabel="Generate"
        onLaunch={() => onQueue(`Generate ${deck.kind.toLowerCase()} deck: ${deck.topic || 'Untitled'}`)}
      >
        <input
          className="input"
          placeholder="Project name or topic…"
          value={deck.topic}
          onChange={e => setDeck({...deck, topic: e.target.value})}
        />
        <select className="select" value={deck.kind} onChange={e => setDeck({...deck, kind: e.target.value})}>
          <option>Project</option>
          <option>Strategy</option>
          <option>Finance</option>
        </select>
      </HeroCard>

      <HeroCard
        icon={<Icon.Sheet size={18} />}
        kicker="MODEL"
        title="Excel Model"
        accent="2"
        subLabel="AI fills assumptions, exports to .xlsx"
        ctaLabel="Build"
        onLaunch={() => onQueue(`Build ${xl.kind} model: ${xl.topic || 'Untitled'}`)}
      >
        <input
          className="input"
          placeholder="Company or scenario…"
          value={xl.topic}
          onChange={e => setXl({...xl, topic: e.target.value})}
        />
        <select className="select" value={xl.kind} onChange={e => setXl({...xl, kind: e.target.value})}>
          <option>DCF</option>
          <option>Ratios</option>
          <option>Project Model</option>
        </select>
      </HeroCard>

      <HeroCard
        icon={<Icon.Agent size={18} />}
        kicker="AGENT"
        title="Run in Background"
        accent="3"
        subLabel="Claude Code runs this while you're in class"
        ctaLabel="Queue Task"
        onLaunch={() => { if (agentText.trim()) { onQueue(agentText.trim()); setAgentText(''); } }}
      >
        <textarea
          className="textarea"
          placeholder="Describe what to research or prepare…"
          value={agentText}
          onChange={e => setAgentText(e.target.value)}
          rows={3}
          style={{minHeight: 92}}
        />
      </HeroCard>
    </div>
  );
}

window.HeroRow = HeroRow;
