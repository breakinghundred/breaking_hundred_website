import Link from "next/link";

const TABS = [
  { href: "/admin/emails/drafts", key: "drafts", label: "Your emails" },
  { href: "/admin/emails/contacts", key: "contacts", label: "Contacts" },
  { href: "/admin/emails", key: "automated", label: "Automated emails" },
  { href: "/admin/emails/logos", key: "logos", label: "Logos" },
] as const;

export type MailTab = (typeof TABS)[number]["key"];

/** Header and section menu shared by every page under /admin/emails. */
export function MailHeader({ active, title, intro }: { active: MailTab; title: string; intro?: React.ReactNode }) {
  return (
    <>
      <p className="small"><Link href="/admin">← Member admin</Link></p>
      <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle · Emails</span>
      <h1 className="flow-title">{title}</h1>
      <nav className="mail-nav" aria-label="Email sections">
        {TABS.map((t) => (
          <Link key={t.key} href={t.href} aria-current={t.key === active ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      {intro && <p className="muted mail-intro">{intro}</p>}
    </>
  );
}
