export const site = {
  name: "Breaking Hundred Circle",
  tagline: "Grow into the leader you’re becoming.",
  email: "admin@breakinghundred.org",
  privacy: "https://breakinghundred.org/privacy-policy/",
  joinForm: "https://forms.gle/14QYD3aBrbsSgJx67",
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/breakinghundredcircle/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/breakinghundredcircle/" },
  ],
  pillars: ["Believe", "Build", "Belong", "Breakthrough", "Become"],
};

/** Annual membership price, discounted until the deadline. */
export const membershipPrice = { was: 499, now: 299, deadline: "31 October" };

export const nav = [
  { href: "/", label: "Our story" },
  { href: "/membership", label: "Membership" },
  { href: "/fellowship", label: "Fellowship" },
  { href: "/annual-event", label: "Annual event" },
] as const;

export const offerings = [
  {
    num: "01 / THE COMMUNITY",
    title: "Membership Circle",
    body: "Learn at your own pace, connect with women who understand the journey and keep moving forward throughout the year.",
    href: "/membership",
    cta: "Explore membership",
    accent: "var(--wine)",
  },
  {
    num: "02 / THE DEEP DIVE",
    title: "The Fellowship",
    body: "A focused, 12-month leadership journey with learning, connection and a real-world capstone. Cohort 3 returns in 2028.",
    href: "/fellowship",
    cta: "Explore the Fellowship",
    accent: "var(--rose)",
  },
  {
    num: "03 / THE GATHERING",
    title: "Annual event",
    body: "Each year we come together to learn, celebrate and build relationships. The format may be a retreat or a conference.",
    href: "/annual-event",
    cta: "Explore the annual event",
    accent: "var(--gold)",
  },
];

export const method = [
  { n: "01", name: "Believe", body: "See yourself as the leader you are becoming." },
  { n: "02", name: "Build", body: "Strengthen the skills and evidence to lead with impact." },
  { n: "03", name: "Belong", body: "Find peers, mentors and a network that sees you." },
  { n: "04", name: "Breakthrough", body: "Step towards the opportunities that matter to you." },
  { n: "05", name: "Become", body: "Grow your influence and open doors for others." },
];
