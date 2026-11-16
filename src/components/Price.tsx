import type { ReactNode } from "react";
/**
 * A price shown as the struck-through full price followed by the discounted one.
 * (The membership price itself is set in /admin/settings.) Screen readers skip strikethrough, so the
 * change is spelled out for them.
 */
export function Price({ was, now }: { was: string; now: ReactNode }) {
  return (
    <span className="price-pair">
      <s aria-hidden>{was}</s>{" "}
      <span className="sr-only">was {was}, now </span>
      <span className="price-now">{now}</span>
    </span>
  );
}

/** The membership price as members read it: struck-through main price first while a discount applies. */
export function MembershipPriceText({ price }: { price: { label: string; full: { label: string } | null } }) {
  return price.full ? <Price was={price.full.label} now={price.label} /> : <>{price.label}</>;
}
