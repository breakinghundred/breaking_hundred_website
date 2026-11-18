import Link from "next/link";
import { site } from "@/lib/site";

/** Shared layout for the terms and privacy pages. */
export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section flow-page">
      <div className="wrap join legal">
        <span className="eyebrow" style={{ color: "var(--wine)" }}>{eyebrow}</span>
        <h1 className="flow-title">{title}</h1>
        <p className="muted">Last updated {updated}</p>
        {children}
        <p className="notice legal-foot">
          Questions? Email <a href={`mailto:${site.email}`}>{site.email}</a>. See also our{" "}
          <Link href={site.terms}>terms and conditions</Link> and <Link href={site.privacy}>privacy policy</Link>.
        </p>
      </div>
    </section>
  );
}
