// Root app — fetches live data from the DAI server APIs.
// Data sources:
//   GET /api/tasks  → active tasks (data/tasks.json)
//   GET /api/tokens → token usage (data/token-usage.json)
//   GET /api/health → integration health
//
// CUSTOMIZE: Edit the greeting name and daily schedule below.

const { useState, useEffect } = React;

// Demo tasks shown when no real tasks exist yet
const DEMO_TASKS = [
  { id: 1, title: 'Research Inditex supply-chain resilience',       status: 'running', progress: 64, duration: '4 min' },
  { id: 2, title: 'DCF model · Nestlé 5-year projection',          status: 'running', progress: 22, duration: '1 min' },
  { id: 3, title: 'Porter’s 5F deck · Spanish telecom sector', status: 'done',    progress: 100, duration: '7 min' },
];

function useApiTasks() {
  const [tasks, setTasks] = useState(DEMO_TASKS);

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) return;
        const mapped = data.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status === 'done' || t.status === 'completed' ? 'done' : 'running',
          progress: t.status === 'done' || t.status === 'completed' ? 100 : 50,
          duration: t.created
            ? `${Math.max(0, Math.round((Date.now() - new Date(t.created).getTime()) / 60000))} min`
            : '—',
        }));
        setTasks(mapped);
      })
      .catch(() => {}); // keep demo data on error
  }, []);

  // Slowly tick progress on running tasks (visual polish)
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prev => prev.map(t => {
        if (t.status !== 'running') return t;
        return { ...t, progress: Math.min(99, t.progress + Math.random() * 1.5) };
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const addTask = (title) => {
    setTasks(prev => [
      { id: Date.now(), title, status: 'running', progress: 4, duration: '0 min' },
      ...prev
    ]);
  };

  return [tasks, addTask];
}

function useApiTokens() {
  const [tokens, setTokens] = useState(null);

  useEffect(() => {
    fetch('/api/tokens')
      .then(r => r.json())
      .then(data => setTokens({
        total:        data.total || 0,
        estimatedCost: data.estimatedCost || 0,
        weeklyTokens: data.weeklyTokens || Math.round((data.total || 0) / 4),
        mode:         data.estimatedCost === 0 ? 'subscription' : 'api',
        dailyBars:    data.dailyBars || [18, 32, 22, 40, 28, 52, 44],
      }))
      .catch(() => {});
  }, []);

  return tokens;
}

function App() {
  const [vp, setVp] = useState(document.body.getAttribute('data-vp') || 'desktop');
  const [tasks, addTask] = useApiTasks();
  const tokens = useApiTokens();

  useEffect(() => {
    const obs = new MutationObserver(() => setVp(document.body.getAttribute('data-vp') || 'desktop'));
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-vp'] });
    return () => obs.disconnect();
  }, []);

  if (vp === 'mobile') {
    return (
      <div style={{minHeight:'100vh', display:'grid', placeItems:'center', padding: 24}}>
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 16}}>
          <PhoneFrame>
            <MobileCockpit tasks={tasks} onQueue={addTask} tokens={tokens} />
          </PhoneFrame>
          <div className="mono" style={{fontSize: 11, color:'var(--fg-faint)'}}>390 × 844 · iPhone 15</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{position: 'relative', zIndex: 1}}>
      <TopBar />
      <main style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: '28px 28px 40px',
        display: 'flex', flexDirection: 'column', gap: 20
      }}>
        {/* Greeting strip — CUSTOMIZE: your name and daily schedule */}
        <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding: '4px 2px 8px'}}>
          <div>
            <div style={{fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em'}}>
              {greeting()}, Leo.
            </div>
            <div style={{fontSize: 14, color:'var(--fg-dim)', marginTop: 4}}>
              {tasks.filter(t => t.status === 'running').length} tasks running · Strategy 101 at 10:30 · Group sync at 14:00
            </div>
          </div>
          <div style={{display:'flex', gap: 8}}>
            <button className="btn"><Icon.Plus size={11} /> New task</button>
            <button className="btn"><Icon.Command size={11} /> Commands</button>
          </div>
        </div>

        <HeroRow onQueue={addTask} />

        {/* Middle: context (wide) + tasks */}
        <div style={{display:'grid', gridTemplateColumns: '1.45fr 1fr', gap: 20}}>
          <ContextCard />
          <TasksCard tasks={tasks} />
        </div>

        {/* Lower: knowledge base + group + usage */}
        <div style={{display:'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20}}>
          <Knowledge BaseCard />
          <GroupCard />
          <UsageCard tokens={tokens} />
        </div>

        <IntegrationRow />
      </main>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Hero card hover polish (CSS injected once)
const heroHoverCss = document.createElement('style');
heroHoverCss.textContent = `
  body[data-hero-hover="on"] .hero-card:nth-of-type(1) {
    border-color: oklch(0.82 0.14 195 / 0.45);
    box-shadow: 0 0 0 1px oklch(0.82 0.14 195 / 0.22) inset, 0 18px 40px -20px oklch(0.82 0.14 195 / 0.4);
    transform: translateY(-2px);
  }
  .hero-card { transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
  .hero-card:hover {
    border-color: oklch(0.82 0.14 195 / 0.32);
    box-shadow: 0 10px 30px -18px oklch(0 0 0 / 0.5);
  }
  body[data-density="tight"] main { gap: 14px !important; }
  body[data-density="tight"] .card { padding: 16px !important; }
`;
document.head.appendChild(heroHoverCss);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
