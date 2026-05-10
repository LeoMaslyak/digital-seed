// Minimal custom line icons — drawn as simple strokes.
// To add a new icon: copy any entry below and adjust the SVG path.
const Icon = {
  Bolt: ({ size = 14, stroke = 1.6 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M9 1.5L3 9h4l-1 5.5L13 7H9l1-5.5z" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  ),
  Slides: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M12 17v3M8 20h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7 10.5l3 1.5 3-3 4 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Sheet: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M3.5 9H20.5M3.5 14.5H20.5M9 3.5V20.5M14.5 3.5V20.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  Agent: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="7" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="9.5" cy="13" r="1.1" fill="currentColor"/>
      <circle cx="14.5" cy="13" r="1.1" fill="currentColor"/>
      <path d="M12 4v3M8 19v2M16 19v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="12" cy="3.5" r="1" fill="currentColor"/>
    </svg>
  ),
  ArrowRight: ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Check: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5l3.2 3L13 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Download: ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M6 1.5v6.5M3 5.5l3 3 3-3M2 10.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Book: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 2.5h4a2 2 0 012 2V14a1.5 1.5 0 00-1.5-1.5H3V2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M13 2.5H9a2 2 0 00-2 2V14a1.5 1.5 0 011.5-1.5H13V2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  Users: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="11.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1.5 13.5c.5-2 2.3-3.5 4.5-3.5s4 1.5 4.5 3.5M11 10c1.8 0 3.2 1 3.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Chart: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 13V7M6 13V3M10 13v-5M14 13V5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  Search: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Command: ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M4 2a1.5 1.5 0 100 3h4a1.5 1.5 0 100-3 1.5 1.5 0 00-1.5 1.5v5A1.5 1.5 0 008 10a1.5 1.5 0 00-1.5-1.5h-5A1.5 1.5 0 002 10a1.5 1.5 0 001.5-1.5v-5A1.5 1.5 0 002 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  Settings: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Edit: ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M8.5 1.5l2 2-6 6-2.5.5.5-2.5 6-6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  Plus: ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
};

window.Icon = Icon;
