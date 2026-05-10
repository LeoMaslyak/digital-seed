// Mobile view (390px) — rendered inside a phone frame when viewport=mobile.
// CUSTOMIZE: Same as desktop — edit chips, group members, and skill packs.

function MobileCockpit({ tasks, onQueue, tokens }) {
  const [agentText, setAgentText] = React.useState('');
  return (
    <div style={{
      background: 'var(--bg)',
      color: 'var(--fg)',
      padding: '54px 16px 32px',
      display: 'flex', flexDirection: 'column', gap: 14,
      minHeight: '100%'
    }}>
      {/* Top bar */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center', gap: 8}}>
          <div style={{
            width: 24, height: 24, borderRadius: 7,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display:'grid', placeItems:'center', color: 'oklch(0.15 0.02 250)'
          }}>
            <Icon.Bolt size={12} stroke={2.2}/>
          </div>
          <span style={{fontWeight: 700, fontSize: 14}}>DAI</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap: 8}}>
          <div style={{
            padding: '4px 9px',
            background: 'oklch(0.80 0.15 155 / 0.10)',
            border: '1px solid oklch(0.80 0.15 155 / 0.25)',
            borderRadius: 999, fontSize: 11, color:'oklch(0.90 0.10 155)',
            display:'flex', alignItems:'center', gap:6
          }}>
            <span className="dot ok" style={{width:5,height:5}}/> Ready
          </div>
          {/* CUSTOMIZE: Change initials */}
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, oklch(0.50 0.10 250), oklch(0.35 0.08 270))',
            display:'grid', placeItems:'center', fontSize: 10.5, fontWeight: 600
          }}>LM</div>
        </div>
      </div>

      {/* Greeting — CUSTOMIZE: your name */}
      <div>
        <div style={{fontSize: 22, fontWeight: 600, letterSpacing:'-0.02em', lineHeight: 1.2}}>
          Good morning, Leo.
        </div>
        <div style={{fontSize: 13, color:'var(--fg-dim)', marginTop: 4}}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · 3 items on deck today
        </div>
      </div>

      {/* Primary action — background agent */}
      <div className="card" style={{padding: 16, display:'flex', flexDirection:'column', gap: 10}}>
        <div style={{display:'flex', alignItems:'center', gap: 10}}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background:'oklch(0.82 0.14 195 / 0.10)',
            border:'1px solid oklch(0.82 0.14 195 / 0.22)',
            color:'var(--accent)', display:'grid', placeItems:'center'
          }}><Icon.Agent size={16}/></div>
          <div>
            <div className="label">AGENT</div>
            <div style={{fontSize: 15, fontWeight: 600}}>Run in Background</div>
          </div>
        </div>
        <textarea className="textarea" placeholder="Describe what to research…" value={agentText} onChange={e=>setAgentText(e.target.value)} />
        <button className="btn btn-primary" style={{justifyContent:'center'}}
          onClick={()=>{ if (agentText.trim()) { onQueue(agentText.trim()); setAgentText(''); } }}
        >Queue Task <Icon.ArrowRight size={11}/></button>
      </div>

      {/* Quick actions */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10}}>
        <div className="card" style={{padding:14, display:'flex', flexDirection:'column', gap:8}}>
          <div style={{color:'var(--accent)'}}><Icon.Slides size={18}/></div>
          <div style={{fontSize:13.5, fontWeight:600}}>Case Deck</div>
          <div style={{fontSize:11, color:'var(--fg-dim)'}}>→ Google Slides</div>
        </div>
        <div className="card" style={{padding:14, display:'flex', flexDirection:'column', gap:8}}>
          <div style={{color:'var(--accent)'}}><Icon.Sheet size={18}/></div>
          <div style={{fontSize:13.5, fontWeight:600}}>Excel Model</div>
          <div style={{fontSize:11, color:'var(--fg-dim)'}}>→ .xlsx export</div>
        </div>
      </div>

      {/* Active tasks */}
      <div className="card" style={{padding: 16, display:'flex', flexDirection:'column', gap: 10}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div className="label">RUNNING NOW</div>
          <span className="mono" style={{fontSize:10.5, color:'var(--fg-faint)'}}>{tasks.filter(t=>t.status==='running').length} active</span>
        </div>
        {tasks.length === 0 ? (
          <div style={{fontSize: 12.5, color: 'var(--fg-dim)', padding: '4px 0'}}>No tasks — queue one above</div>
        ) : tasks.slice(0, 2).map(t => (
          <div key={t.id} style={{display:'flex', alignItems:'center', gap: 10}}>
            {t.status === 'running' ? <span className="spinner"/> : (
              <span style={{width:14,height:14,borderRadius:'50%',background:'var(--ok)',display:'grid',placeItems:'center',color:'oklch(0.16 0.02 250)'}}>
                <Icon.Check size={9}/>
              </span>
            )}
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:12.5, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{t.title}</div>
              <div style={{height:2, background:'oklch(0.26 0.02 248)', borderRadius:2, marginTop:5}}>
                <div style={{height:'100%', width:`${t.progress}%`, background: t.status==='done'?'var(--ok)':'var(--accent)', borderRadius:2}}/>
              </div>
            </div>
            <span className="mono" style={{fontSize:10.5, color:'var(--fg-dim)'}}>{Math.round(t.progress)}%</span>
          </div>
        ))}
      </div>

      {/* Context mini */}
      <div className="card" style={{padding: 16, display:'flex', flexDirection:'column', gap: 8}}>
        <div className="label">CONTEXT</div>
        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
          <span className="chip chip-filled" style={{fontSize:11}}>professional @ your organization</span>
          <span className="chip chip-filled" style={{fontSize:11}}>Finance</span>
          <span className="chip chip-filled" style={{fontSize:11}}>PE career</span>
        </div>
        <div style={{fontSize: 12, color:'var(--fg-dim)'}}>Updated 3d ago</div>
      </div>

      {/* Integrations compact */}
      <div style={{display:'flex', flexDirection:'column', gap: 6, marginTop: 4}}>
        <div className="label" style={{marginBottom: 2}}>INTEGRATIONS</div>
        {[
          ['ok',   'Claude Code',   'Connected'],
          ['ok',   'Memory Server', 'Active'],
          ['ok',   'RAG Index',     '342 docs'],
          ['ok',   'Knowledge Base',  '6h ago'],
          ['mute', 'PAI Bridge',    'Not configured'],
        ].map(([s, n, d]) => (
          <div key={n} style={{display:'flex', alignItems:'center', gap: 10, padding: '6px 0', fontSize: 12.5, color: s==='mute' ? 'var(--fg-faint)':'var(--fg-mute)'}}>
            <span className={`dot ${s}`}/>
            <span style={{color: s==='mute'?'var(--fg-faint)':'var(--fg)', fontWeight: 500}}>{n}</span>
            <span style={{flex:1}}/>
            <span className="mono" style={{fontSize:11, color:'var(--fg-dim)'}}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneFrame({ children }) {
  return (
    <div style={{
      width: 390, height: 844,
      borderRadius: 44,
      background: 'oklch(0.10 0.01 250)',
      padding: 8,
      boxShadow: '0 40px 80px -20px oklch(0 0 0 / 0.6), 0 0 0 1.5px oklch(0.30 0.02 248) inset',
      border: '1px solid oklch(0.28 0.02 248)',
      flexShrink: 0
    }}>
      <div style={{
        width: '100%', height: '100%',
        borderRadius: 36, overflow: 'hidden',
        position: 'relative', background: 'var(--bg)'
      }}>
        {/* Dynamic island */}
        <div style={{
          position:'absolute', top: 10, left: '50%', transform:'translateX(-50%)',
          width: 110, height: 30, borderRadius: 20,
          background: 'oklch(0.08 0.01 250)', zIndex: 2
        }}/>
        {/* Status bar */}
        <div style={{
          position:'absolute', top: 14, left: 28, right: 28,
          display: 'flex', alignItems:'center', justifyContent:'space-between',
          fontSize: 13, fontWeight: 600, color: 'var(--fg)', zIndex: 3
        }}>
          <span className="mono" style={{fontSize: 12.5}}>
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
          <span style={{display:'flex', gap:5, alignItems:'center'}}>
            <svg width="15" height="10" viewBox="0 0 15 10" fill="currentColor"><rect x="0" y="7" width="2" height="3" rx="0.5"/><rect x="4" y="5" width="2" height="5" rx="0.5"/><rect x="8" y="2.5" width="2" height="7.5" rx="0.5"/><rect x="12" y="0" width="2" height="10" rx="0.5"/></svg>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><rect x="0.5" y="0.5" width="11" height="9" rx="2" stroke="currentColor"/><rect x="2" y="2" width="8" height="6" rx="1" fill="currentColor"/><rect x="12" y="3.5" width="1.5" height="3" rx="0.5" fill="currentColor"/></svg>
          </span>
        </div>
        <div style={{height:'100%', overflow:'auto'}}>{children}</div>
      </div>
    </div>
  );
}

window.MobileCockpit = MobileCockpit;
window.PhoneFrame = PhoneFrame;
