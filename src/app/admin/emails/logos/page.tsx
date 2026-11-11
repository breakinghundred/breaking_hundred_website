/* eslint-disable @next/next/no-img-element -- previews of uploaded logos, shown at their email size */
import type { Metadata } from "next";
import { LOGO_MAX_WIDTH, LOGO_MIN_WIDTH, LOGO_TYPES, listLogos, logoPath } from "@/lib/email/logos";
import { requireAdminPage } from "@/lib/staff";
import { ActionForm } from "../../ActionForm";
import { MailHeader } from "../MailNav";
import { logoAction, uploadLogoAction } from "../mail-actions";

export const metadata: Metadata = { title: "Email logos", robots: { index: false, follow: false } };

export default async function LogosPage() {
  await requireAdminPage();
  const logos = await listLogos();
  const automated = logos.filter((l) => l.inAutomated);

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <MailHeader
          active="logos"
          title="Logos"
          intro="Logos appear side by side at the top of your emails. Tick “Automated emails” to show a logo on every automated email. For your own emails, you choose the logos on each one."
        />

        <div className="detail-card">
          <h2>How the automated emails start</h2>
          <div className="logo-header-preview">
            {automated.length === 0 ? (
              <p className="logo-wordmark">Breaking Hundred · The Circle</p>
            ) : (
              automated.map((l) => <img key={l.id} src={logoPath(l.id)} alt={l.name} style={{ width: l.width }} />)
            )}
          </div>
          <p className="small muted">
            {automated.length === 0
              ? "With no logos ticked, emails start with the words above."
              : `${automated.length} ${automated.length === 1 ? "logo" : "logos"}, in the order below.`}
          </p>
        </div>

        <div className="detail-card">
          <h2>Add a logo</h2>
          <ActionForm action={uploadLogoAction} className="logo-upload">
            <label className="email-field">
              Image
              <input name="file" type="file" accept={Object.keys(LOGO_TYPES).join(",")} required className="admin-input" />
            </label>
            <label className="email-field">
              Name <span className="small muted">(also read out to people who can&apos;t see images)</span>
              <input name="name" className="admin-input" maxLength={80} placeholder="e.g. Breaking Hundred" />
            </label>
            <label className="email-field">
              Width in emails (pixels)
              <input name="width" type="number" min={LOGO_MIN_WIDTH} max={LOGO_MAX_WIDTH} defaultValue={160} className="admin-input" />
            </label>
            <label className="check">
              <input name="inAutomated" type="checkbox" defaultChecked /> Show on the automated emails
            </label>
            <button className="button small"><span>Upload logo</span></button>
          </ActionForm>
          <p className="small muted">
            PNG, JPG or GIF, up to 2 MB. A PNG with a transparent background, about twice the width you show it at, looks
            sharpest. SVG isn&apos;t accepted because many email apps don&apos;t show it.
          </p>
        </div>

        {logos.length > 0 && (
          <ul className="logo-list">
            {logos.map((l, i) => (
              <li key={l.id} className="logo-card">
                <div className="logo-thumb">
                  <img src={logoPath(l.id)} alt={l.name} style={{ width: Math.min(l.width, 240) }} />
                </div>
                <ActionForm action={logoAction} className="logo-edit">
                  <input type="hidden" name="id" value={l.id} />
                  <label className="email-field">
                    Name
                    <input name="name" defaultValue={l.name} className="admin-input" maxLength={80} />
                  </label>
                  <label className="email-field">
                    Width (px)
                    <input name="width" type="number" min={LOGO_MIN_WIDTH} max={LOGO_MAX_WIDTH} defaultValue={l.width} className="admin-input" />
                  </label>
                  <label className="check">
                    <input name="inAutomated" type="checkbox" defaultChecked={l.inAutomated} /> Automated emails
                  </label>
                  <button className="button small outline" name="op" value="save"><span>Save</span></button>
                </ActionForm>
                <div className="logo-tools">
                  {logos.length > 1 && (
                    <ActionForm action={logoAction} className="inline">
                      <input type="hidden" name="id" value={l.id} />
                      <button className="link-btn" name="op" value="up" disabled={i === 0}>Move left</button>
                      <button className="link-btn" name="op" value="down" disabled={i === logos.length - 1}>Move right</button>
                    </ActionForm>
                  )}
                  <ActionForm
                    action={logoAction}
                    className="inline"
                    confirm={{
                      title: `Remove “${l.name}”?`,
                      message: "It won't be added to any more emails. Emails already sent keep showing it.",
                      confirmLabel: "Remove logo",
                      danger: true,
                    }}
                  >
                    <input type="hidden" name="id" value={l.id} />
                    <button className="link-btn danger" name="op" value="remove">Remove</button>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
