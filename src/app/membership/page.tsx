import type { Metadata } from "next";
import { Fragment } from "react";
import { PageHero } from "@/components/PageHero";
import { AnimatedHeading } from "@/components/AnimatedHeading";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { JoinForm } from "@/components/JoinForm";
import { Faq } from "@/components/Faq";
import { Closing } from "@/components/Closing";
import { Photo } from "@/components/Photo";
import { LazyVideo, type Video } from "@/components/LazyVideo";
import { scaleIn } from "@/components/motion";
import { Price } from "@/components/Price";
import { method } from "@/lib/site";

export const metadata: Metadata = {
  title: "Membership",
  description:
    "The Membership Circle: year-round leadership development, peer connection and visibility for women from minority ethnic backgrounds.",
};

const included = [
  {
    tag: "LEARN",
    title: "Monthly masterclasses",
    body: "Live sessions on influence, negotiation, board readiness and visibility, recorded so you can catch up in your own time.",
  },
  {
    tag: "CONNECT",
    title: "Circle conversations",
    body: "Small-group sessions where members work through real situations with peers who understand the context.",
  },
  {
    tag: "GROW",
    title: "Mentor introductions",
    body: "Curated introductions to senior leaders and alumni who have been where you are heading.",
  },
  {
    tag: "BE SEEN",
    title: "Visibility opportunities",
    body: "Speaking slots, panels and features that put your expertise in front of the rooms that matter.",
  },
  {
    tag: "RESOURCES",
    title: "The members' library",
    body: "Frameworks, templates and session recordings covering the five stages of our method.",
  },
  {
    tag: "GATHER",
    title: "Priority event access",
    body: "Early booking and member pricing for the annual retreat or conference.",
  },
];

const promo: Video = {
  kind: "file",
  src: "/videos/promo.mp4",
  poster: "/videos/promo-poster.jpg",
  title: "Believe: inside the Breaking Hundred Circle membership",
};

const [believe] = method;

const faqs = [
  {
    q: "Who is membership for?",
    a: "Women from minority ethnic backgrounds who are building a leadership career — whether you are stepping into your first management role or preparing for an executive or board seat.",
  },
  {
    q: "How much time does it take?",
    a: "Most members spend two to three hours a month across a masterclass and a Circle conversation. Everything is recorded, so you can stay involved during busier months.",
  },
  {
    q: "Is membership the same as the Fellowship?",
    a: "No. Membership is ongoing, flexible and open now. The Fellowship is a selective 12-month programme with a cohort, a capstone project and a formal application process.",
  },
  {
    q: "Can my employer pay?",
    a: "Yes. Many members are sponsored through a learning and development budget. Request joining details and we will send an invoice addressed to your organisation.",
  },
  {
    q: "How long does the discounted rate last?",
    a: (
      <>
        Only until the end of October. Register your interest by 31 October and you pay{" "}
        <Price /> for your first year. From 1 November, annual membership is £499.
      </>
    ),
  },
  {
    q: "How do I pay?",
    a: "Request the joining details below and the team will send payment instructions along with your welcome pack.",
  },
];

export default function MembershipPage() {
  return (
    <>
      <PageHero
        eyebrow="The community"
        heading="Membership Circle"
        intro="Year-round leadership development, peer connection and visibility — built to help you grow into the leader you’re becoming."
        tags={[
          "Online and in person",
          <Fragment key="price">
            <Price /> if you register by 31 October
          </Fragment>,
        ]}
        cta={{ label: "Join the Circle", href: "#join" }}
        stats={[
          { value: "12", label: "Self-led learning modules a year", to: 12 },
          { value: "299", label: "Per year if you register by 31 October", to: 299, prefix: "£", was: "£499" },
          { value: "5", label: "Stages of the Circle method", to: 5 },
        ]}
      />

      <section className="section">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">
              Stage {believe.n} · {believe.name}
            </Reveal>
            <AnimatedHeading text={believe.body} />
            <Reveal as="p" delay={0.12}>
              Every member starts here. Watch two minutes inside the Circle — from believing in
              the leader you are becoming to the breakthrough that follows.
            </Reveal>
          </div>
          <Reveal variants={scaleIn}>
            <LazyVideo video={promo} sizes="(max-width: 1288px) 100vw, 1240px" />
          </Reveal>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">What is included</Reveal>
            <AnimatedHeading text="Everything you need to keep moving forward." />
            <Reveal as="p" delay={0.12}>
              Membership is designed to fit around a demanding career, without losing momentum
              between formal programmes.
            </Reveal>
          </div>
          <RevealGroup className="included" step={0.09}>
            {included.map((item) => (
              <RevealItem as="article" key={item.title}>
                <span>{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div>
            <Reveal as="span" className="eyebrow" style={{ color: "var(--wine)" }}>
              A room that understands
            </Reveal>
            <AnimatedHeading text="You will not have to explain yourself first." />
            <Reveal as="p" delay={0.1}>
              The hardest part of leadership is rarely the work. It is being the only one in the
              room, carrying the extra weight of having to prove you belong there.
            </Reveal>
            <Reveal as="p" delay={0.18}>
              In the Circle, that part is already understood. Members arrive and get straight to
              the question that actually matters: what comes next, and how do we get there.
            </Reveal>
            <RevealGroup className="feature-list" step={0.08}>
              {["Peer accountability groups", "Senior mentor network", "Member-only library", "Annual event priority"].map((f) => (
                <RevealItem key={f}>{f}</RevealItem>
              ))}
            </RevealGroup>
          </div>
          <Reveal variants={scaleIn}>
            <Photo
              src="/images/membership-conversation.jpg"
              alt="Members seated in a circle, deep in conversation"
              sizes="(max-width: 700px) 100vw, 564px"
              style={{ minHeight: 440 }}
              
            />
          </Reveal>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <Reveal className="price-panel" variants={scaleIn}>
            <div>
              <span className="eyebrow" style={{ color: "var(--gold)" }}>Early-interest rate</span>
              <div className="price" style={{ marginTop: 14 }}>
                <Price /> <small>/ year</small>
              </div>
              <p className="price-was">Ends 31 October</p>
            </div>
            <div style={{ maxWidth: 420, color: "#e9dce4" }}>
              <p style={{ margin: 0 }}>
                <strong style={{ color: "#fff" }}>This discount only lasts until the end of this month.</strong>{" "}
                Register your interest by 31 October to pay <Price />. From 1 November, annual
                membership is £499.
              </p>
              <p style={{ margin: "14px 0 0" }}>
                One fee, everything included. No joining fee, and you can cancel before renewal at
                any point in the year.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="join">
        <div className="wrap join">
          <Reveal as="span" className="eyebrow" style={{ color: "var(--wine)" }}>
            Join the Circle
          </Reveal>
          <AnimatedHeading text="Request your joining details." />
          <Reveal as="p" delay={0.1} className="muted">
            Tell us who you are and we will send the joining and payment details, plus what to
            expect in your first month. Register before 31 October to lock in <Price />.
          </Reveal>
          <JoinForm />
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">Questions</Reveal>
            <AnimatedHeading text="Before you join." />
          </div>
          <Faq items={faqs} />
        </div>
      </section>

      <Closing
        eyebrow="Membership is now open"
        heading="The Circle is stronger with you in it."
        ctaLabel="Join the Circle"
        ctaHref="#join"
      />
    </>
  );
}
