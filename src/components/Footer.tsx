import Link from "next/link";
import { Brand } from "./Brand";
import { nav, site } from "@/lib/site";
import { Reveal, RevealGroup, RevealItem } from "./Reveal";

const icons: Record<string, React.ReactNode> = {
  Instagram: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  LinkedIn: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.83v1.54h.06c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.67 4.8 6.13V21h-4v-4.98c0-1.19-.02-2.72-1.66-2.72-1.66 0-1.92 1.3-1.92 2.64V21h-4V9.75Z" />
    </svg>
  ),
};

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <Reveal>
            <Brand tone="light" />
            <p className="small" style={{ marginTop: 18 }}>{site.tagline}</p>
            <div className="socials">
              {site.socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Breaking Hundred Circle on ${social.label}`}
                >
                  {icons[social.label]}
                </a>
              ))}
            </div>
          </Reveal>
          <RevealGroup as="nav" className="footer-nav" step={0.07}>
            {nav.slice(1).map((item) => (
              <RevealItem key={item.href} as="span">
                <Link href={item.href}>{item.label}</Link>
              </RevealItem>
            ))}
            <RevealItem as="span">
              <a href={`mailto:${site.email}`}>Contact us</a>
            </RevealItem>
          </RevealGroup>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Breaking Hundred Circle CIC</span>
          <span>
            <a href={site.privacy}>Privacy policy</a> · <a href={`mailto:${site.email}`}>{site.email}</a>
          </span>
          <span>
            Developed by{" "}
            <a href="https://www.circleofthreetech.com/" target="_blank" rel="noopener noreferrer">
              co3
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
