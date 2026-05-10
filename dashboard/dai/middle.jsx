// Middle row: Context card (left) + Active Tasks card (right).
// Tasks are loaded live from /api/tasks.
// CUSTOMIZE: Edit the chips and quote in ContextCard to reflect your profile.
const { useState: useStateM, useEffect: useEffectM } = React;

function ContextCard() {
  // CUSTOMIZE: Replace these chips and the italic quote with your own profile.
  // To pull this from USER.md dynamically, add a GET /api/user endpoint to server.ts.
  return (
    <div className="card" style={{padding: 22, display:'flex', flexDirection:'column', gap: 14, height: '100%'}}>
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
        <div>
          <div className="label" style={{marginBottom: 4}}>YOUR CONTEXT</div>
          <div style={{fontSize: 18, fontWeight: 600, letterSpacing:'-0.01em'}}>How your AI knows you</div>
        </div>
        <div className="mono" style={{fontSize: 10.5, color:'var(--fg-faint)'}}>
          USER.md · updated 3d ago
        </div>
      </div>

      {/* CUSTOMIZE: Your identity chips */}
      <div style={{display:'flex', gap: 7, flexWrap:'wrap'}}>
        <span className="chip chip-filled">your context</span>
        <span className="chip chip-filled">Background · Finance</span>
        <span className="chip chip-filled">Goal · PE career</span>
        <span className="chip">Madrid · EN/ES</span>
        <span className="chip">Cohort '27</span>
      </div>

      {/* CUSTOMIZE: This quote comes from your USER.md summary */}
      <div style={{
        padding: '16px 18px',
        background: 'oklch(0.16 0.02 248)',
        border: '1px solid var(--border)',
        borderLeft: '2px solid var(--accent)',
        borderRadius: 10,
        fontSize: 13.5,
        lineHeight: 1.65,
        color: 'var(--fg-mute)',
      }}>
        <span className="serif" style={{fontStyle:'italic', fontSize: 16.5, color: 'var(--fg)'}}>
          "Second-year professional with a four-year investment banking background at a bulge-bracket in London.
          Targeting mid-market European PE. Prefers dense, numbers-first analysis — light on theory,
          heavy on precedent transactions."
        </span>
      </div>

      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto'}}>
        <div style={{display:'flex', gap: 16, fontSize: 11.5, color:'var(--fg-dim)'}}>
          <span>12 memory entries</span>
          <span>·</span>
          <span>4 recurring prompts</span>
        </div>
        <button className="btn">
          <Icon.Edit size={11} /> Edit my profile
        </button>
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: task.status === 'done' ? 'oklch(0.80 0.15 155 / 0.06)' : 'oklch(0.16 0.02 248)',
      border: `1px solid ${task.status === 'done' ? 'oklch(0.80 0.15 155 / 0.20)' : 'var(--border)'}`,
      borderRadius: 10,
      display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{display:'flex', alignItems:'center', gap: 10}}>
        {task.status === 'running' && <span className="spinner" />}
        {task.status === 'done' && (
          <span style={{
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--ok)',
            display:'grid', placeItems:'center',
            color: 'oklch(0.16 0.02 250)'
          }}>
            <Icon.Check size={10} />
          </span>
        )}
        <div style={{flex: 1, fontSize: 13.5, fontWeight: 500, letterSpacing:'-0.005em'}}>
          {task.title}
        </div>
        {task.status === 'done' && (
          <button className="btn" style={{padding:'5px 10px', fontSize: 12}}>
            <Icon.Download size={11} /> Download
          </button>
        )}
      </div>
      <div style={{display:'flex', alignItems:'center', gap: 10}}>
        <div style={{
          flex: 1, height: 3,
          background: 'oklch(0.26 0.02 248)',
          borderRadius: 2, overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${task.progress}%`,
            background: task.status === 'done' ? 'var(--ok)' : 'var(--accent)',
            borderRadius: 2,
            transition: 'width .4s ease'
          }} />
        </div>
        <div className="mono" style={{fontSize: 11, color:'var(--fg-dim)', minWidth: 92, textAlign:'right'}}>
          {task.status === 'done' ? `Done · ${task.duration}` : `${Math.round(task.progress)}% · ${task.duration}`}
        </div>
      </div>
    </div>
  );
}

function TasksCard({ tasks }) {
  return (
    <div className="card" style={{padding: 22, display:'flex', flexDirection:'column', gap: 14, height: '100%'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div>
          <div className="label" style={{marginBottom: 4}}>RUNNING NOW</div>
          <div style={{fontSize: 18, fontWeight: 600, letterSpacing:'-0.01em'}}>Active Tasks</div>
        </div>
        <span className="mono" style={{fontSize: 11, color:'var(--fg-dim)'}}>
          {tasks.filter(t => t.status === 'running').length} active
        </span>
      </div>

      {tasks.length === 0 ? (
        <div style={{
          flex: 1,
          display:'grid', placeItems:'center',
          border: '1px dashed var(--border-2)',
          borderRadius: 10,
          padding: 24,
          color: 'var(--fg-dim)',
          fontSize: 13
        }}>
          No tasks running — queue one above
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap: 8, overflow:'auto'}}>
          {tasks.map(t => <TaskRow key={t.id} task={t} />)}
        </div>
      )}
    </div>
  );
}

window.ContextCard = ContextCard;
window.TasksCard = TasksCard;
