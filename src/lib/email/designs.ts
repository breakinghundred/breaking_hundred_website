/**
 * The looks an email can be sent in. Pure data, shared by the server and the admin
 * previews. Every design renders the same wording; only the styling changes. All
 * styles end up inline, because most email apps ignore <style> blocks.
 */

export type Design = {
  name: string;
  description: string;
  font: string;
  pageBg: string;
  cardBg: string;
  /** Extra CSS on the card (borders, rounded corners). */
  cardStyle: string;
  /** Space around the card. */
  outerPad: string;
  cardPad: string;
  width: number;
  text: string;
  muted: string;
  link: string;
  heading: string;
  /** Extra CSS on headings. */
  headingStyle: string;
  header: {
    align: "left" | "center";
    /** A coloured band across the top, instead of the header sitting in the text. */
    band?: { bg: string; pad: string; border: string };
    /** A line under the header when there is no band. */
    rule?: string;
    wordmark: string;
  };
  footer?: { color: string; bg?: string; border?: string; outside?: boolean };
};

const WINE = "#7c354f";

export const DESIGNS = {
  classic: {
    name: "Classic",
    description: "Warm cream background, the name or logos at the top left. The original look.",
    font: "Helvetica,Arial,sans-serif",
    pageBg: "#f8f4f1",
    cardBg: "#fffdfb",
    cardStyle: "",
    outerPad: "0",
    cardPad: "32px 24px",
    width: 600,
    text: "#251423",
    muted: "#6f626c",
    link: WINE,
    heading: "#32142b",
    headingStyle: "font-size:17px;font-weight:700",
    header: { align: "left", wordmark: WINE },
  },
  banner: {
    name: "Banner",
    description: "A soft pink band with the logos centred, and a wine-coloured footer. Feels like an announcement.",
    font: "Helvetica,Arial,sans-serif",
    pageBg: "#f3ecef",
    cardBg: "#ffffff",
    cardStyle: "",
    outerPad: "24px 12px",
    cardPad: "36px 32px 28px",
    width: 600,
    text: "#251423",
    muted: "#6f626c",
    link: WINE,
    heading: WINE,
    headingStyle: "font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase",
    header: { align: "center", band: { bg: "#f1e3ea", pad: "26px 24px", border: `4px solid ${WINE}` }, wordmark: WINE },
    footer: { color: "#ffffff", bg: WINE },
  },
  letter: {
    name: "Simple letter",
    description: "Plain white, like a personal email. Nothing in the way of the words.",
    font: "Helvetica,Arial,sans-serif",
    pageBg: "#ffffff",
    cardBg: "#ffffff",
    cardStyle: "",
    outerPad: "0",
    cardPad: "28px 20px",
    width: 560,
    text: "#1f1a1d",
    muted: "#6b6368",
    link: WINE,
    heading: "#1f1a1d",
    headingStyle: "font-size:16px;font-weight:700",
    header: { align: "left", rule: "1px solid #ebe5e8", wordmark: "#1f1a1d" },
  },
  elegant: {
    name: "Elegant",
    description: "A serif typeface, centred header and gold details. Suits welcomes and milestones.",
    font: "Georgia,'Times New Roman',serif",
    pageBg: "#fbf8f3",
    cardBg: "#ffffff",
    cardStyle: "border:1px solid #e9e0d2",
    outerPad: "28px 12px",
    cardPad: "40px 36px",
    width: 600,
    text: "#2b2226",
    muted: "#7a6e72",
    link: "#8a5a2b",
    heading: "#32142b",
    headingStyle: "font-size:19px;font-weight:400;font-style:italic",
    header: { align: "center", rule: "1px solid #b08d57", wordmark: "#8a6a3a" },
    footer: { color: "#9a8460", border: "1px solid #e9e0d2" },
  },
  card: {
    name: "Rounded card",
    description: "A white rounded card with a wine stripe on top, on a soft grey background. Modern and tidy.",
    font: "Helvetica,Arial,sans-serif",
    pageBg: "#ece6ea",
    cardBg: "#ffffff",
    cardStyle: `border-radius:16px;border-top:6px solid ${WINE}`,
    outerPad: "32px 12px",
    cardPad: "36px 32px",
    width: 580,
    text: "#251423",
    muted: "#6f626c",
    link: WINE,
    heading: WINE,
    headingStyle: "font-size:18px;font-weight:700",
    header: { align: "center", wordmark: WINE },
    footer: { color: "#7d6f78", outside: true },
  },
} satisfies Record<string, Design>;

export type DesignId = keyof typeof DESIGNS;
export const DESIGN_IDS = Object.keys(DESIGNS) as DesignId[];
export const DEFAULT_DESIGN: DesignId = "classic";

export const isDesign = (v: unknown): v is DesignId => typeof v === "string" && v in DESIGNS;

/** A stored choice, or the fallback when it's empty or no longer exists. */
export const designOr = (v: unknown, fallback: DesignId = DEFAULT_DESIGN): DesignId => (isDesign(v) ? v : fallback);
