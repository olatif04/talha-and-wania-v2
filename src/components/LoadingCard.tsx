export function LoadingCard({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="card centered-card muted-text">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}
