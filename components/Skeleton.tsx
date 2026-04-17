// Skeleton loading components — shown while Supabase data loads
// Eliminates the "blank flash" between page render and data arrival

export function SkeletonBox({ w = '100%', h = '20px', radius = '8px', mb = '0' }: { w?: string; h?: string; radius?: string; mb?: string }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, marginBottom: mb,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

export function SkeletonKPI() {
  return (
    <div className="glass" style={{ padding: '1.25rem' }}>
      <SkeletonBox h="11px" w="60%" mb="12px" />
      <SkeletonBox h="28px" w="50%" mb="8px" />
      <SkeletonBox h="11px" w="40%" />
    </div>
  );
}

export function SkeletonCard({ lines = 3, height = '120px' }: { lines?: number; height?: string }) {
  return (
    <div className="glass" style={{ padding: '1.5rem', minHeight: height }}>
      <SkeletonBox h="14px" w="40%" mb="16px" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox key={i} h="12px" w={i === lines - 1 ? '60%' : '100%'} mb="10px" />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <SkeletonBox w="32px" h="32px" radius="8px" />
      <div style={{ flex: 1 }}>
        <SkeletonBox h="12px" w="60%" mb="6px" />
        <SkeletonBox h="10px" w="30%" />
      </div>
      <SkeletonBox h="14px" w="60px" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div>
      <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
      {/* Health score */}
      <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <div style={{ flexShrink: 0 }}>
          <SkeletonBox h="11px" w="120px" mb="10px" />
          <SkeletonBox h="48px" w="80px" mb="8px" />
          <SkeletonBox h="22px" w="100px" radius="20px" />
        </div>
        <div style={{ flex: 1 }}>
          <SkeletonBox h="8px" w="100%" mb="12px" radius="100px" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' }}>
            {[1,2,3,4].map(i => <div key={i}><SkeletonBox h="10px" mb="4px" /><SkeletonBox h="14px" w="60%" /></div>)}
          </div>
        </div>
      </div>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[1,2,3,4].map(i => <SkeletonKPI key={i} />)}
      </div>
      {/* Chart + side */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <SkeletonCard height="220px" lines={4} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SkeletonCard height="100px" lines={2} />
          <SkeletonCard height="100px" lines={3} />
        </div>
      </div>
    </div>
  );
}
