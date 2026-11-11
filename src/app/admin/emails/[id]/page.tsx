import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/staff";
import { TEMPLATE_IDS, TEMPLATE_INFO } from "@/lib/email/catalogue";
import { designChoices } from "@/lib/email/design-store";
import { listLogos, logoPath } from "@/lib/email/logos";
import { getSource } from "@/lib/email/store";
import type { TemplateId } from "@/lib/email/templates";
import { Editor } from "./Editor";

export const metadata: Metadata = { title: "Edit email", robots: { index: false, follow: false } };

export default async function EditEmailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id: raw } = await params;
  const id = raw.toUpperCase() as TemplateId;
  if (!TEMPLATE_IDS.includes(id)) notFound();
  const [source, designs] = await Promise.all([getSource(id), designChoices()]);
  // The same logos the automated emails carry. If they can't be loaded, show none (sending does the same).
  const logos = (await listLogos().catch(() => []))
    .filter((l) => l.inAutomated)
    .map((l) => ({ src: logoPath(l.id), width: l.width, alt: l.name }));
  const info = TEMPLATE_INFO[id];

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <p className="small"><Link href="/admin/emails">← Automated emails</Link></p>
        <span className="eyebrow" style={{ color: "var(--wine)" }}>{id} · {info.trigger}</span>
        <h1 className="flow-title">{info.name}</h1>
        <p className="muted small">
          {source.edited ? `Edited wording, last saved ${source.updatedAt!.toLocaleString("en-GB")}.` : "Original wording."}
        </p>
        <Editor id={id} subject={source.subject} body={source.body} edited={source.edited} logos={logos} design={designs.templates[id] ?? ""} house={designs.house} />
      </div>
    </section>
  );
}
