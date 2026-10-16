import type { ReactNode } from "react";
import { membershipPrice } from "@/lib/site";

/**
 * A price shown as the struck-through full price followed by the discounted one.
 * Defaults to the membership price. Screen readers skip strikethrough, so the
 * change is spelled out for them.
 */
export function Price({
  was = `£${membershipPrice.was}`,
  now = `£${membershipPrice.now}`,
}: {
  was?: string;
  now?: ReactNode;
}) {
  return (
    <span className="price-pair">
      <s aria-hidden>{was}</s>{" "}
      <span className="sr-only">was {was}, now </span>
      <span className="price-now">{now}</span>
    </span>
  );
}
