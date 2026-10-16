export const site = {
  name: "Breaking Hundred Circle",
  tagline: "Built to lead. Backed to rise.",
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
  { n: "01", name: "Believe", body: "Ready was never the question" },
  { n: "02", name: "Build", body: "Strengthen the skills and evidence to lead with impact." },
  { n: "03", name: "Belong", body: "Find peers, mentors and a network that sees you." },
  { n: "04", name: "Breakthrough", body: "Step towards the opportunities that matter to you." },
  { n: "05", name: "Become", body: "Grow your influence and open doors for others." },
];

/** Shown in the testimonial carousel. Separate paragraphs with a blank line. */
export const testimonials = [
  {
    name: "Temmy",
    quote:
      "The retreat was the best self reflection programme and should be a recurrent event. Every session was not only inspirational but very thought provoking, and with new insight/practical nuggets to reflect on after the sessions.",
  },
  {
    name: "Tola",
    quote:
      "I was really impressed by the level of delivery and execution of this leadership retreat. Congratulations to the convener, Funmi, and the planning team. I was also blown away by the gift box — thank you!",
  },
  {
    name: "Sharon",
    quote:
      "I just want to say how honoured I feel to have experienced the two-day conference. The value of the insights and inspiration I received far outweighed the cost — it was truly priceless.",
  },
  {
    name: "Rose",
    quote:
      "What an honour to be part of this incredible two-day conference. The insights, inspiration and connections I gained far exceeded the cost.\n\nIt was truly priceless. Thank you to the convener, speakers, planning team, and volunteers for creating such an empowering space. Your vision, dedication, and impact will not be forgotten.",
  },
  {
    name: "Ada",
    quote:
      "The value of the insights and inspiration I received at the retreat far outweighed the cost, it was truly priceless.\n\nA heartfelt thank you to Funmi Onamusi for stepping out boldly to create such a safe and empowering environment, one where we could all be vulnerable and show up as our authentic selves.",
  },
];
