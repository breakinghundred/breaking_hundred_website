/** Choices for "Which best describes you?" on the interest form. The code is stored on `Member.describesYou`. */
export const DESCRIBES_YOU = [
  { code: "early_career", label: "Early-career professional" },
  { code: "mid_career", label: "Mid-career professional or manager" },
  { code: "senior_leader", label: "Senior leader or executive" },
  { code: "founder", label: "Business owner or founder" },
  { code: "career_change", label: "Changing or returning to my career" },
  { code: "student", label: "Student or graduate" },
  { code: "other", label: "Other" },
] as const;

export const DESCRIBES_YOU_CODES: ReadonlySet<string> = new Set(DESCRIBES_YOU.map((d) => d.code));

export function describesYouLabel(code: string | null | undefined): string {
  return DESCRIBES_YOU.find((d) => d.code === code)?.label ?? code ?? "";
}
