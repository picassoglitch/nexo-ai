// Suspense fallback for the engines hub while the server fetches the catalog +
// token balance. Mirrors the real layout (filter chips + card grid) so the page
// doesn't jump on load. Pure skeleton — no data, no client JS.

export default function EnginesLoading() {
  return (
    <>
      <div className="ws-chips" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ws-skeleton ws-skeleton-chip" />
        ))}
      </div>
      <div className="ws-grid ws-grid-3" style={{ marginTop: 24 }} aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="ws-skeleton ws-skeleton-card"
            style={{ animationDelay: `${i * 70}ms` }}
          />
        ))}
      </div>
    </>
  );
}
