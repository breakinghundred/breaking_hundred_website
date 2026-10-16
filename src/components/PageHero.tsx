"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AnimatedHeading } from "./AnimatedHeading";
import { Counter } from "./Counter";
import { EASE } from "./motion";
import { Price } from "./Price";

export type Stat = {
  value: string;
  label: string;
  to?: number;
  prefix?: string;
  suffix?: string;
  /** Full price to show struck through before the value. */
  was?: string;
};

export function PageHero({
  eyebrow,
  heading,
  intro,
  ghost = "100",
  tags,
  cta,
  stats,
}: {
  eyebrow: string;
  heading: string;
  intro: string;
  ghost?: string;
  tags?: ReactNode[];
  cta?: { label: string; href: string };
  stats?: Stat[];
}) {
  return (
    <section className="page-hero">
      <motion.span
        className="ghost"
        aria-hidden
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.6, ease: EASE }}
      >
        {ghost}
      </motion.span>

      <div className="wrap">
        <motion.span
          className="eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          {eyebrow}
        </motion.span>

        <AnimatedHeading as="h1" text={heading} delay={0.12} />

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.4 }}
        >
          {intro}
        </motion.p>

        {tags && (
          <motion.div
            style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 26 }}
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.5 } } }}
          >
            {tags.map((tag, i) => (
              <motion.span
                key={i}
                className="tag"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
                }}
              >
                {tag}
              </motion.span>
            ))}
          </motion.div>
        )}

        {cta && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.6 }}
          >
            <Link className="button" href={cta.href}>
              <span>{cta.label}</span>
              <span className="arrow" aria-hidden>↗</span>
            </Link>
          </motion.div>
        )}

        {stats && (
          <motion.div
            className="statline"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
                }}
              >
                <strong>
                  {stat.was ? <Price was={stat.was} now={statValue(stat)} /> : statValue(stat)}
                </strong>
                <span>{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

function statValue(stat: Stat) {
  return stat.to !== undefined ? (
    <Counter to={stat.to} prefix={stat.prefix} suffix={stat.suffix} />
  ) : (
    stat.value
  );
}
