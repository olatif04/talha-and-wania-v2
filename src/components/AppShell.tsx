import type { PropsWithChildren } from 'react';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="page-shell">
      <div className="page-bg" />
      <main className="page-content">{children}</main>
    </div>
  );
}
