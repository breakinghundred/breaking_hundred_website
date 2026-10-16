import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { AnimatedHeading } from "@/components/AnimatedHeading";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { Faq } from "@/components/Faq";
import { Closing } from "@/components/Closing";
import { Method } from "@/components/Method";
import { Photo } from "@/components/Photo";
import { scaleIn } from "@/components/motion";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Fellowship",
  description:
    "The Fellowship: a selective 12-month leadership journey with learning, connection and a real-world capstone. Cohort 3 returns in 2028.",
};

const steps = [
  {
    title: "Apply",
    body: "A short written application and a conversation with the programme team. We are looking for ambition and generosity, not a perfect CV.",
  },
  {
    title: "Journey",
    body: "Twelve months of learning labs, coaching and peer accountability, structured around the five stages of the Circle method.",
  },
  {
    title: "Capstone",
    body: "A real-world project in your own organisation or community, presented to the cohort and our network at the closing showcase.",
  },
];

type Included = {
  tag: string;
  title: string;
  body: string;
  points?: { title: string; body: string }[];
};

const included: Included[] = [
  {
    tag: "COHORT",
    title: "Cohort size: 10 only",
    body: "This isn’t mass training. It’s strategic development inside a small, trusted circle where accountability is high, bonds run deep, and transformation is personal.",
  },
  {
    tag: "MASTERCLASSES",
    title: "Live monthly masterclasses",
    body: "2.5-hour online masterclasses with world-class facilitators. Each includes expert insight on mission-critical leadership topics and real-time application, so you’re not just learning, you’re leading.",
  },
  {
    tag: "MENTORING",
    title: "Quarterly 1:1 executive mentoring",
    body: "You’ll be paired with a seasoned C-suite leader who’ll stretch your thinking, challenge your blind spots, and help you refine your strategy to accelerate real-world outcomes.",
  },
  {
    tag: "CAPSTONE",
    title: "Capstone leadership project",
    body: "You will design and deliver a high-impact project within your organisation, business, or community. This is not a theoretical exercise — it’s leadership in action, with visible results.",
  },
  {
    tag: "IN PERSON",
    title: "Three game-changing in-person intensives",
    body: "Three days together in the room, marking the start, the midpoint and the finish of your year.",
    points: [
      {
        title: "Launch Day",
        body: "Networking, a guest speaker, leadership assessment, personality profiling and leadership goal setting.",
      },
      {
        title: "Executive Presence Day",
        body: "Gravitas, visibility and communication mastery.",
      },
      {
        title: "Graduation Showcase",
        body: "Present your capstone to a curated audience of sponsors, mentors and stakeholders.",
      },
    ],
  },
  {
    tag: "ACCOUNTABILITY",
    title: "Accountability partner",
    body: "You’ll be matched with a peer from your cohort for shared motivation, regular check-ins, and honest conversations that drive follow-through.",
  },
  {
    tag: "COMMUNITY",
    title: "Lifetime community access",
    body: "After the programme, you’ll gain exclusive access to the Breaking Hundred Community — a growing network of senior leaders committed to equity, excellence, and elevation.",
  },
];

const faqs = [
  {
    q: "When does the next cohort start?",
    a: "Cohort 3 returns in 2028. Applications open the year before — join the Membership Circle or email us to be told first.",
  },
  {
    q: "How is the Fellowship different from membership?",
    a: "The Fellowship is selective, time-bound and intensive: a fixed cohort, one-to-one coaching and a capstone project. Membership is open now and flexible around your schedule.",
  },
  {
    q: "What is the time commitment?",
    a: "Expect one full learning-lab day a month, a coaching session every other month, and time for your capstone project across the second half of the year.",
  },
  {
    q: "Can I do both?",
    a: "Yes. Many Fellows are members first, and most stay in the Membership Circle after the programme ends.",
  },
  {
    q: "Is funding available?",
    a: "Some places are supported by partner organisations. Tell us about your circumstances when you apply and we will be straight with you about what is possible.",
  },
];

export default function FellowshipPage() {
  const registerInterest = `mailto:${site.email}?subject=Fellowship%20Cohort%203%20interest`;
  return (
    <>
      <PageHero
        eyebrow="The deep dive"
        heading="The Fellowship"
        intro="A focused, 12-month leadership journey with learning, connection and a real-world capstone. Cohort 3 returns in 2028."
        ghost="12"
        tags={["12 months", "Selective cohort", "Cohort 3 · 2028"]}
        cta={{ label: "Register your interest", href: registerInterest }}
        stats={[
          { value: "12", label: "Months, start to showcase", to: 12 },
          // { value: "6", label: "One-to-one coaching sessions", to: 6 },
          { value: "2028", label: "Cohort 3 begins" },
        ]}
      />

      <section className="section">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">How it runs</Reveal>
            <AnimatedHeading text="Three stages across one year." />
            <Reveal as="p" delay={0.12}>
              The Fellowship is deliberately long. Leadership growth that lasts needs time to be
              tested in the real work.
            </Reveal>
          </div>
          <RevealGroup className="steps" step={0.12}>
            {steps.map((step, i) => (
              <RevealItem as="article" key={step.title}>
                <span className="step-num">0{i + 1}</span>
                <h3>{step.title}</h3>
                <p className="muted" style={{ marginTop: 12 }}>{step.body}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="section dark">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">The method</Reveal>
            <AnimatedHeading text="Five stages, one year, measurable change." />
            <Reveal as="p" delay={0.12}>
              Every lab, coaching session and capstone milestone maps to a stage of the Circle
              method.
            </Reveal>
          </div>
          <Method />
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">What is included</Reveal>
            <AnimatedHeading text="Everything a Fellow gets." />
          </div>
          <RevealGroup className="included" step={0.09}>
            {included.map((item) => (
              <RevealItem as="article" key={item.title} className={item.points ? "wide" : undefined}>
                <span>{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                {item.points && (
                  <ol className="included-points">
                    {item.points.map((point) => (
                      <li key={point.title}>
                        <strong>{point.title}</strong>
                        <p>{point.body}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <Reveal variants={scaleIn}>
            <Photo
              src="/images/fellowship-learning-lab.jpg"
              alt="Fellows working through a problem at a learning lab"
              sizes="(max-width: 700px) 100vw, 564px"
              style={{ minHeight: 460 }}
            />
          </Reveal>
          <div>
            <Reveal as="span" className="eyebrow" style={{ color: "var(--wine)" }}>
              Cohort 3
            </Reveal>
            <AnimatedHeading text="Applications open the year before." />
            <Reveal as="p" delay={0.1}>
              Cohort 3 begins in 2028. Places are limited and the application process is a
              conversation rather than a filter — we want to understand where you are heading.
            </Reveal>
            <Reveal as="p" delay={0.18} id="interest">
              Members of the Membership Circle hear about applications first, and can use the
              year in between to prepare.
            </Reveal>
            <Reveal delay={0.26} style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
              <a className="button" href={registerInterest}>
                <span>Register your interest</span>
                <span className="arrow" aria-hidden>↗</span>
              </a>
              <Link className="button outline" href="/membership" style={{ color: "var(--ink)" }}>
                <span>Join the Circle meanwhile</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">Questions</Reveal>
            <AnimatedHeading text="About the Fellowship." />
          </div>
          <Faq items={faqs} />
        </div>
      </section>

      <Closing
        eyebrow="Cohort 3 · 2028"
        heading="Twelve months that change what you believe is possible."
        ctaLabel="Register your interest"
        ctaHref={registerInterest}
      />
    </>
  );
}
