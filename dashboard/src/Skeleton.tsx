import type { ReactElement } from 'react';

export default function Skeleton(): ReactElement {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div><span className="eyebrow">PERSONAL FINANCE</span><h1>Moneytor Dashboard</h1></div>
      </header>
      <section className="metrics">
        {[1, 2, 3, 4].map((i) => (
          <article key={i} className="skeleton-card">
            <div className="skeleton-line w-24" />
            <div className="skeleton-line w-32 h-7 mt-2" />
          </article>
        ))}
      </section>
      <section className="content-grid">
        <article className="panel">
          <div className="skeleton-line w-40 h-5 mb-6" />
          <div className="bars">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bar-row"><div className="skeleton-line w-full h-9" /></div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="skeleton-line w-36 h-5 mb-6" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-line w-full h-10 mb-2" />
          ))}
        </article>
      </section>
    </main>
  );
}
