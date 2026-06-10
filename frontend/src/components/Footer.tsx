import Link from 'next/link';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="ns-footer">
      <div className="ns-container">
        <div className="grid grid-cols-3 gap-7 pb-7 max-sm:grid-cols-1 max-sm:gap-5">
          {[
            { heading: 'PLATFORM', links: [{ label: 'Feed', href: '/' }, { label: 'Search', href: '/search' }, { label: 'Briefing', href: '/briefing' }, { label: 'Pricing', href: '/pricing' }] },
            { heading: 'PRODUCT', links: [{ label: 'Stories', href: '/search' }, { label: 'Fracture Briefing', href: '/briefing' }] },
            { heading: 'CONTACT', links: [{ label: 'Email Fracture', href: 'mailto:hello@fracture.news' }] },
          ].map((col) => (
            <div key={col.heading}>
              <h4
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  margin: '0 0 10px',
                }}
              >
                {col.heading}
              </h4>
              {col.links.map((l) => (
                l.href.startsWith('mailto:') ? (
                  <a
                    key={l.label}
                    href={l.href}
                    className="block mb-1.5 no-underline"
                    style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-secondary)' }}
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="block mb-1.5 no-underline"
                    style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-secondary)' }}
                  >
                    {l.label}
                  </Link>
                )
              ))}
            </div>
          ))}
        </div>
        <div
          className="flex items-center justify-between py-3.5 max-sm:flex-col max-sm:gap-3"
          style={{ borderTop: '1px solid var(--color-divider)' }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-muted)',
              letterSpacing: '0.04em',
            }}
          >
            &copy; {year} Fracture&nbsp;&nbsp;&middot;&nbsp;&nbsp;See The Full Story
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)' }}>
            Narrative intelligence across the media spectrum
          </span>
        </div>
      </div>
    </footer>
  );
}
