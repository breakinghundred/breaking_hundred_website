import Link from "next/link";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { OfferCards } from "@/components/OfferCards";
import { Method } from "@/components/Method";
import { Closing } from "@/components/Closing";
import { AnimatedHeading } from "@/components/AnimatedHeading";
import { Reveal } from "@/components/Reveal";
import { Testimonials } from "@/components/Testimonials";
import { scaleIn } from "@/components/motion";
import { site } from "@/lib/site";

export default function HomePage() {
  return (
    <>
      <Hero />

      <div className="intro-strip">
        <div className="wrap">
          <Reveal as="p">
            Exceptional women deserve more than a seat at the table. They
            deserve a community that helps them shape what happens next.
          </Reveal>
        </div>
      </div>

      <Marquee items={site.pillars} />

      <section className="section alt" id="offerings">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">
              Find your place
            </Reveal>
            <AnimatedHeading text="One mission. Different ways to be part of it." />
            <Reveal as="p" delay={0.15}>
              Whether you are ready for ongoing support, a deeper programme or a
              room full of people who share your ambition, there is a place for
              you here.
            </Reveal>
          </div>
          <OfferCards />
        </div>
      </section>

      <section className="section dark">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">
              Our approach
            </Reveal>
            <AnimatedHeading text="Belief comes before breakthrough." />
            <Reveal as="p" delay={0.15}>
              Our five-part method gives women space to see what is possible,
              develop their leadership and create a path for others.
            </Reveal>
          </div>
          <Method />
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div>
            <Reveal
              as="span"
              className="eyebrow"
              style={{ color: "var(--wine)" }}
            >
              Why we exist
            </Reveal>
            <AnimatedHeading text="Talent is everywhere. Opportunity is not." />
            <Reveal as="p" delay={0.1}>
              Breaking Hundred Circle was founded by{" "}
              <a target="_blank" href="https://www.funmionamusi.com">Funmi Onamusi</a> to make
              leadership development, connection and visibility more accessible
              to women from minority ethnic backgrounds.
            </Reveal>
            <Reveal as="p" delay={0.18}>
              We bring people together to learn, challenge barriers and build
              legacies that reach beyond any one career.
            </Reveal>
            <Reveal delay={0.26}>
              <Link className="text-link" href="/membership">
                Find your community <span aria-hidden>↗</span>
              </Link>
            </Reveal>
          </div>

          <Reveal className="quote-block" variants={scaleIn}>
            <span className="eyebrow">What we believe</span>
            <blockquote>
              When one woman breaks through, she can hold the door open for many
              more.
            </blockquote>
            <span>Breaking Hundred Circle</span>
          </Reveal>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <div className="section-heading">
            <Reveal as="span" className="eyebrow">
              In their own words
            </Reveal>
            <AnimatedHeading text="What women carry home from the Circle." />
          </div>
          <Reveal variants={scaleIn}>
            <Testimonials />
          </Reveal>
        </div>
      </section>

      <Closing />
    </>
  );
}
