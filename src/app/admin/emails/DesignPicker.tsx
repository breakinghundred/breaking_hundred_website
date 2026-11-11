"use client";

import Link from "next/link";
import { DESIGNS, DESIGN_IDS, isDesign, type Design, type DesignId } from "@/lib/email/designs";

/** A tiny sketch of a design: its page colour, card and accent. */
export function DesignSwatch({ d }: { d: Design }) {
  const accent = d.header.band?.bg ?? d.pageBg;
  const stripe = d.header.band ? d.header.band.border.split(" ").pop() : d.cardStyle.match(/border-top:[^;]*?(#[0-9a-f]{3,6})/i)?.[1];
  return (
    <span className="design-swatch" style={{ background: d.pageBg }} aria-hidden>
      <span
        className="design-swatch-card"
        style={{
          background: d.cardBg,
          borderRadius: /border-radius/.test(d.cardStyle) ? 5 : 1,
          borderTop: stripe ? `3px solid ${stripe}` : undefined,
          outline: d.pageBg === d.cardBg ? "1px solid #e4dde1" : undefined,
          fontFamily: d.font,
        }}
      >
        {d.header.band && <span className="design-swatch-band" style={{ background: accent }} />}
        <span className="design-swatch-title" style={{ color: d.heading, textAlign: d.header.align }}>Aa</span>
        <span className="design-swatch-line" />
        <span className="design-swatch-line short" />
        {d.footer?.bg && <span className="design-swatch-foot" style={{ background: d.footer.bg }} />}
      </span>
    </span>
  );
}

/**
 * Choose a design. `value` "" means the house design, shown first with its name.
 */
export function DesignPicker({ value, onChange, house }: { value: string; onChange: (v: string) => void; house: DesignId }) {
  const shown: DesignId = isDesign(value) ? value : house;
  const options: { value: string; id: DesignId; label: string; note?: string }[] = [
    { value: "", id: house, label: "House design", note: DESIGNS[house].name },
    ...DESIGN_IDS.map((id) => ({ value: id, id, label: DESIGNS[id].name })),
  ];
  return (
    <fieldset className="mail-box design-picker">
      <legend>Design</legend>
      <div className="design-options" role="radiogroup">
        {options.map((o) => (
          <label key={o.value || "house"} className={`design-option${value === o.value ? " is-chosen" : ""}`}>
            <input type="radio" name="design-choice" checked={value === o.value} onChange={() => onChange(o.value)} />
            <DesignSwatch d={DESIGNS[o.id]} />
            <span className="design-option-name">
              {o.label}
              {o.note && <span className="small muted"> · {o.note}</span>}
            </span>
          </label>
        ))}
      </div>
      <p className="small muted">
        {DESIGNS[shown].description} <Link href="/admin/emails/designs">Compare designs side by side</Link>
      </p>
    </fieldset>
  );
}
