// Lower row: Knowledge Index, Shared Project, Usage.
// Token usage is loaded live from /api/tokens.
// CUSTOMIZE: Edit skill packs, group members, and budget cap below.

function KnowledgeBaseCard() {
  // CUSTOMIZE: Add/remove skill packs to match what's in your digital-seed-knowledge-base repo.
  const packs = [
    { name: 'Personal context guide', meta: '6 docs' },
    { name: 'Integration recipes',    meta: '8 docs' },
    { name: 'Workflow templates',     meta: '5 docs' },
  ];
  return (
    <div className="card" style={{padding: 22, display:'flex', flexDirection:'column', gap: 14, height:'100%'}}>
      <div style={{display:'flex', alignItems:'center', gap: 10}}>
        <Icon.Book size={14} />
        <div className="label">SHARED RESOURCES</div>
      </div>
      <div style={{fontSize: 17, fontWeight: 600, letterSpacing:'-0.01em'}}>Knowledge Index</div>

      <div style={{display:'flex', flexDirection:'column', gap: 6}}>
        {packs.map(p => (
          <div key={p.name} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding: '10px 12px',
            background: 'oklch(0.16 0.02 248)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            cursor: 'pointer'
          }}>
            <span style={{fontSize: 13, fontWeight: 500}}>{p.name}</span>
            <span className="mono" style={{fontSize: 11, color:'var(--fg-faint)'}}>{p.meta}</span>
          </div>
        ))}
      </div>

      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto'}}>
        <div style={{fontSize: 11.5, color:'var(--fg-dim)', display:'flex', alignItems:'center', gap:6}}>
          <span className="dot ok" style={{width:5, height:5}} />
          3 new additions this week
        </div>
        <button className="btn-ghost btn" style={{color:'var(--accent)'}}>
          Browse all <Icon.ArrowRight size={10} />
        </button>
      </div>
    </div>
  );
}

function GroupCard() {
  // CUSTOMIZE: Replace with your actual project collaborators and initials.
  const members = [
    { initials: 'ME', hue: 25,  name: 'You', self: true },
    { initials: 'AI', hue: 155, name: 'Assistant' },
    { initials: 'PR', hue: 270, name: 'Project' },
  ];
  return (
    <div className="card" style={{padding: 22, display:'flex', flexDirection:'column', gap: 14, height:'100%'}}>
      <div style={{display:'flex', alignItems:'center', gap: 10}}>
        <Icon.Users size={14} />
        <div className="label">SHARED PROJECT</div>
      </div>
      {/* CUSTOMIZE: Change the group name */}
      <div style={{fontSize: 17, fontWeight: 600, letterSpacing:'-0.01em'}}>Learning Group · Delta</div>

      <div style={{display:'flex', alignItems:'center', gap: 0, marginTop: 2}}>
        {members.map((m, i) => (
          <div key={m.initials} title={m.name} style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `linear-gradient(135deg, oklch(0.55 0.14 ${m.hue}), oklch(0.38 0.10 ${m.hue + 20}))`,
            display:'grid', placeItems:'center',
            fontSize: 11.5, fontWeight: 600,
            marginLeft: i === 0 ? 0 : -8,
            border: '2px solid var(--bg-elev)',
            boxShadow: m.self ? '0 0 0 1.5px var(--accent)' : 'none'
          }}>{m.initials}</div>
        ))}
        <div style={{marginLeft: 10, fontSize: 12, color:'var(--fg-dim)'}}>
          <div style={{display:'flex', alignItems:'center', gap:6, color:'var(--fg-mute)'}}>
            <span className="dot ok" style={{width:5, height:5}} />
            <span style={{fontSize: 12.5}}>Active · 2h ago</span>
          </div>
        </div>
      </div>

      <div style={{
        padding: '12px 14px',
        background: 'oklch(0.16 0.02 248)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        fontSize: 12.5, lineHeight: 1.5, color: 'var(--fg-mute)'
      }}>
        <div style={{fontSize: 10.5, color:'var(--fg-faint)', marginBottom: 4, letterSpacing: '.04em'}}>RECENT</div>
        Weekly planning note generated from your goals
      </div>

      <button className="btn" style={{marginTop:'auto', alignSelf:'flex-start'}}>
        Open project context <Icon.ArrowRight size={11} />
      </button>
    </div>
  );
}

function Donut({ used, budget }) {
  const pct = Math.min(1, used / budget);
  const r = 36;
  const C = 2 * Math.PI * r;
  return (
    <div style={{position:'relative', width: 92, height: 92}}>
      <svg width={92} height={92} viewBox="0 0 92 92" style={{transform:'rotate(-90deg)'}}>
        <circle cx="46" cy="46" r={r} fill="none" stroke="oklch(0.26 0.02 248)" strokeWidth="8" />
        <circle
          cx="46" cy="46" r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${C * pct} ${C}`}
        />
      </svg>
      <div style={{position:'absolute', inset: 0, display:'grid', placeItems:'center'}}>
        <div style={{textAlign:'center', lineHeight:1.1}}>
          <div style={{fontSize: 17, fontWeight: 600}} className="mono">{Math.round(pct * 100)}<span style={{fontSize:11, color:'var(--fg-dim)'}}>%</span></div>
          <div style={{fontSize: 10, color:'var(--fg-dim)'}}>of budget</div>
        </div>
      </div>
    </div>
  );
}

function UsageCard({ tokens }) {
  const total = tokens?.total || 0;
  // CUSTOMIZE: Change 500000 to your monthly token budget
  const BUDGET = 500000;
  const used = Math.min(total, BUDGET);
  const weeklyTokens = tokens?.weeklyTokens || 14200;
  const cost = tokens?.estimatedCost || 0;
  const isSubscription = tokens?.mode === 'subscription' || cost === 0;

  const bars = tokens?.dailyBars || [18, 32, 22, 40, 28, 52, 44];

  return (
    <div className="card" style={{padding: 22, display:'flex', flexDirection:'column', gap: 14, height:'100%'}}>
      <div style={{display:'flex', alignItems:'center', gap: 10}}>
        <Icon.Chart size={14} />
        <div className="label">AI USAGE · THIS MONTH</div>
      </div>
      <div style={{fontSize: 17, fontWeight: 600, letterSpacing:'-0.01em'}}>
        {used / BUDGET < 0.8 ? 'Under budget' : 'Approaching limit'}
      </div>

      <div style={{display:'flex', alignItems:'center', gap: 18}}>
        <Donut used={used} budget={BUDGET} />
        <div style={{display:'flex', flexDirection:'column', gap: 10, flex: 1}}>
          <div>
            <div className="mono" style={{fontSize: 20, fontWeight: 600, letterSpacing:'-0.02em'}}>
              {weeklyTokens.toLocaleString()} <span style={{fontSize: 11, color:'var(--fg-dim)', fontWeight: 400}}>tokens / wk</span>
            </div>
            <div style={{fontSize: 11.5, color:'var(--fg-dim)', marginTop: 2}}>
              {isSubscription ? 'Claude Code · OAuth · Subscription' : 'Claude Code · API key'}
            </div>
          </div>
          <div style={{display:'flex', gap: 10, alignItems:'center', fontSize: 11.5, color:'var(--fg-mute)'}}>
            <span className="mono">{isSubscription ? '~$0 cost' : `$${cost.toFixed(2)}`}</span>
            <span style={{color:'var(--fg-faint)'}}>·</span>
            <div style={{display:'flex', alignItems:'center', gap: 6}}>
              <span className="dot ok" style={{width:5, height:5}} />
              Budget · Healthy
            </div>
          </div>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div style={{display:'flex', gap: 4, alignItems:'flex-end', height: 28, marginTop: 2}}>
        {bars.map((h, i) => (
          <div key={i} style={{
            flex: 1, height: `${h}%`,
            background: i === bars.length - 1 ? 'var(--accent)' : 'oklch(0.32 0.03 220)',
            borderRadius: 2, minHeight: 4
          }} />
        ))}
      </div>
      <div style={{display:'flex', justifyContent:'space-between', fontSize: 10, color:'var(--fg-faint)'}} className="mono">
        <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
      </div>
    </div>
  );
}

window.KnowledgeBaseCard = KnowledgeBaseCard;
window.GroupCard = GroupCard;
window.UsageCard = UsageCard;
