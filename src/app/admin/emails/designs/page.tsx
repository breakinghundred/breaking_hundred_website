import type { Metadata } from "next";
import Link from "next/link";
import { SAMPLE_VARS, TEMPLATE_INFO } from "@/lib/email/catalogue";
import { designChoices } from "@/lib/email/design-store";
import { DESIGNS, DESIGN_IDS } from "@/lib/email/designs";
import { listLogos, logoPath } from "@/lib/email/logos";
import { renderHtml } from "@/lib/email/render";
import { compile } from "@/lib/email/source";
import { getSource } from "@/lib/email/store";
import type { TemplateId } from "@/lib/email/templates";
import { requireAdminPage } from "@/lib/staff";
import { ActionForm } from "../../ActionForm";
import { MailHeader } from "../MailNav";
import { designAction } from "../mail-actions";
import { DesignsHelp } from "../../help";

export const metadata: Metadata = { title: "Email designs", robots: { index: false, follow: false } };

/** Emails to try the designs with: one with a details table, one with a list, one short. */
const SAMPLES: TemplateId[] = ["C04", "C07", "C09"];

export default async function DesignsPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  await requireAdminPage();
  const { email } = await searchParams;
  const sample = SAMPLES.find((s) => s === email) ?? SAMPLES[0];
  const [choices, source, logos] = await Promise.all([designChoices(), getSource(sample), listLogos().catch(() => [])]);
  const refs = logos.filter((l) => l.inAutomated).map((l) => ({ src: logoPath(l.id), width: l.width, alt: l.name }));
  const { subject, blocks } = compile(source, SAMPLE_VARS);

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <MailHeader
          active="designs"
          help={<DesignsHelp />}
          title="Designs"
          intro="Choose how your emails look. The wording stays the same in every design. The house design is used for all automated emails; any single email, and each of your own emails, can use a different one."
        />

        <div className="design-sample-switch small">
          <span className="muted">Preview with:</span>
          {SAMPLES.map((s) => (
            <Link key={s} href={`?email=${s}`} aria-current={s === sample ? "true" : undefined}>
              {TEMPLATE_INFO[s].name}
            </Link>
          ))}
        </div>

        <ul className="design-gallery">
          {DESIGN_IDS.map((id) => {
            const d = DESIGNS[id];
            const isHouse = choices.house === id;
            return (
              <li key={id} className={`design-card${isHouse ? " is-house" : ""}`}>
                <div className="design-card-head">
                  <h2>{d.name}</h2>
                  {isHouse && <span className="badge green">House design</span>}
                </div>
                <p className="small muted">{d.description}</p>
                <iframe
                  title={`${d.name}: preview of “${subject}”`}
                  className="design-frame"
                  srcDoc={renderHtml(blocks, refs, id)}
                  sandbox=""
                  loading="lazy"
                />
                {isHouse ? (
                  <p className="small design-card-note">Automated emails go out in this design.</p>
                ) : (
                  <ActionForm
                    action={designAction}
                    className="design-card-action"
                    confirm={{
                      title: `Use “${d.name}” for automated emails?`,
                      message: [
                        "Every automated email will go out in this design from now on, except any you've set to their own design.",
                        "Emails already sent don't change.",
                      ],
                      confirmLabel: "Use this design",
                    }}
                  >
                    <input type="hidden" name="design" value={id} />
                    <button className="button outline small" type="submit"><span>Use for automated emails</span></button>
                  </ActionForm>
                )}
              </li>
            );
          })}
        </ul>

      </div>
    </section>
  );
}
