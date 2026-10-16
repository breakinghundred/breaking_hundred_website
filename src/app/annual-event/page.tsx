import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { AnimatedHeading } from "@/components/AnimatedHeading";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { Faq } from "@/components/Faq";
import { Closing } from "@/components/Closing";
import { Carousel, type Slide } from "@/components/Carousel";
import { Marquee } from "@/components/Marquee";
import { LazyVideo, type Video } from "@/components/LazyVideo";
import { scaleIn } from "@/components/motion";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Annual event",
  description:
    "Each year the Breaking Hundred Circle comes together to learn, celebrate and build relationships — as a retreat or a conference.",
};

const programme = [
  {
    tag: "MORNING",
    title: "Keynotes and provocations",
    body: "Leaders who have grown into senior roles in their own sector, speaking candidly about how they did it.",
  },
  {
    tag: "MIDDAY",
    title: "Workshops",
    body: "Practical sessions in small groups: negotiation, board readiness, visibility and leading through resistance.",
  },
  {
    tag: "AFTERNOON",
    title: "Circles and connection",
    body: "Structured conversations that leave you with relationships, not just a pocket of business cards.",
  },
  {
    tag: "EVENING",
    title: "Celebration",
    body: "Dinner, recognition for the year's Fellows, and the part of the day everyone remembers.",
  },
];

/**
 * Every image in public/annual_events appears in the carousel, in filename
 * order. Add or remove photos there; no code change is needed.
 */
const EVENTS_DIR = "annual_events";
const IMAGE_EXT = /\.(jpe?g|png|webp|avif)$/i;

function eventPhotos(): Slide[] {
  const dir = path.join(process.cwd(), "public", EVENTS_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => IMAGE_EXT.test(file))
    .sort()
    .map((file, i) => ({
      src: `/${EVENTS_DIR}/${encodeURIComponent(file)}`,
      alt: `Breaking Hundred Circle annual event, photo ${i + 1}`,
    }));
}

/**
 * YouTube IDs are the part after `v=` in a watch URL, or after `youtu.be/` or
 * `/shorts/`. Set `short: true` for Shorts so they get a portrait frame.
 */
const videos: Video[] = [
  { kind: "youtube", id: "er7WDeWMfkg", title: "Annual event highlights", short: true },
  { kind: "youtube", id: "rveDM2lNG5I", title: "BHC EEEC 2026 highlights" },
];

const testimonial: Video = {
  kind: "file",
  src: "/videos/testimonial.mp4",
  poster: "/videos/testimonial-poster.jpg",
  title: "Testimonial from an annual event attendee",
};

const faqs = [
  {
    q: "Is it a retreat or a conference?",
    a: "It alternates. Some years call for a residential retreat with time and space; others call for a bigger conference that brings more people into the room. We confirm the format each year.",
  },
  {
    q: "Do I need to be a member to attend?",
    a: "No, the event is open beyond the Circle. Members get early booking and member pricing.",
  },
  {
    q: "Where is it held?",
    a: "In the UK, with the venue confirmed alongside the format. Travel and accommodation guidance goes out with booking.",
  },
  {
    q: "Can my organisation sponsor or send a group?",
    a: "Yes. Group rates and sponsorship packages are available — email us and we will send the current pack.",
  },
];

export default function AnnualEventPage() {
  const photos = eventPhotos();
  return (
    <>
      <PageHero
        eyebrow="The gathering"
        heading="Annual event"
        intro="Each year we come together to learn, celebrate and build relationships. The format may be a retreat or a conference."
        ghost="01"
        tags={["Once a year", "United Kingdom", "Retreat or conference"]}
        cta={{ label: "Get the date first", href: `mailto:${site.email}?subject=Annual%20event%20updates` }}
        stats={[
          { value: "1", label: "Gathering a year, in full", to: 1 },
          { value: "4", label: "Parts to the day", to: 4 },
          { value: "100", label: "The number we exist to break", to: 100 },
        ]}
      />

      <section className="section">
        <div className="wrap split">
          <div>
            <Reveal as="span" className="eyebrow" style={{ color: "var(--wine)" }}>
              Why we gather
            </Reveal>
            <AnimatedHeading text="A year of work, in one room." />
            <Reveal as="p" delay={0.1}>
              Most of the Circle&rsquo;s work happens quietly — in masterclasses, coaching calls and
              conversations between two people who needed each other that week.
            </Reveal>
            <Reveal as="p" delay={0.18}>
              Once a year we put all of it in one place: members, Fellows, mentors, alumni and
              the people who are about to join.
            </Reveal>
            <Reveal delay={0.26}>
              <Link className="text-link" href="/membership">
                Members book first <span aria-hidden>↗</span>
              </Link>
            </Reveal>
          </div>

          <Reveal className="event-visual" variants={scaleIn}>
            <span>Next gathering</span>
            <strong>The format is confirmed each year.</strong>
            <span>Retreat · Conference · Celebration</span>
          </Reveal>
        </div>
      </section>

      <Marquee items={site.pillars} speed={30} />

      <section className="section alt">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">The shape of the day</Reveal>
            <AnimatedHeading text="Learn in the morning. Celebrate by evening." />
            <Reveal as="p" delay={0.12}>
              A conference year runs to roughly this shape. A retreat year stretches the same
              elements across two slower days.
            </Reveal>
          </div>
          <RevealGroup className="included" step={0.09}>
            {programme.map((item) => (
              <RevealItem as="article" key={item.title}>
                <span>{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {photos.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="section-heading">
              <Reveal as="span" className="eyebrow">From last year</Reveal>
              <AnimatedHeading text="What the room looks like." />
            </div>
            <Reveal variants={scaleIn}>
              <Carousel slides={photos} label="Photos from the annual event" />
            </Reveal>
          </div>
        </section>
      )}

      <section className="section alt">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">Watch</Reveal>
            <AnimatedHeading text="See the day for yourself." />
          </div>
          <RevealGroup className="video-grid" step={0.09}>
            {videos.map((video) => (
              <RevealItem
                key={video.kind === "youtube" ? video.id : video.src}
                className={video.kind === "youtube" && video.short ? "is-short" : undefined}
              >
                <LazyVideo video={video} sizes="(max-width: 700px) 100vw, 640px" />
              </RevealItem>
            ))}
          </RevealGroup>

          <div className="testimonial-video">
            <Reveal variants={scaleIn}>
              <LazyVideo video={testimonial} sizes="340px" />
            </Reveal>
            <div>
              <Reveal as="span" className="eyebrow" style={{ color: "var(--wine)" }}>
                Testimonial
              </Reveal>
              <AnimatedHeading text="In their own words." />
              <Reveal as="p" delay={0.1}>
                Hear from someone who was in the room.
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">Questions</Reveal>
            <AnimatedHeading text="Attending the gathering." />
          </div>
          <Faq items={faqs} />
        </div>
      </section>

      <Closing
        eyebrow="Be in the room"
        heading="Hear the date before anyone else."
        ctaLabel="Join the Circle"
        ctaHref="/membership#join"
      />
    </>
  );
}
