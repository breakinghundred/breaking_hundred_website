"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { EASE } from "./motion";
import { testimonials } from "@/lib/site";

const AUTOPLAY_MS = 8000;
const SWIPE_PX = 60;

const figure: Variants = {
  enter: (d: number) => ({ opacity: 0, x: d * 48 }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: EASE, staggerChildren: 0.012 },
  },
  exit: (d: number) => ({
    opacity: 0,
    x: d * -32,
    filter: "blur(6px)",
    transition: { duration: 0.45, ease: EASE },
  }),
};

const word: Variants = {
  enter: { opacity: 0, y: "0.5em", filter: "blur(8px)" },
  center: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: EASE } },
};

const caption: Variants = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay: 0.35 } },
};

function Quote({ text }: { text: string }) {
  return text.split("\n\n").map((para, p) => (
    <p key={p}>
      {para.split(" ").map((w, i) => (
        <motion.span key={i} className="testimonials-word" variants={word}>
          {w}{" "}
        </motion.span>
      ))}
    </p>
  ));
}

/**
 * Testimonial carousel. Name tabs double as autoplay progress bars; arrows,
 * swipe and the keyboard arrows also move between quotes. Every quote is laid
 * out invisibly in the same cell so the panel holds the height of the longest
 * one and the page never jumps.
 */
export function Testimonials({ label = "What attendees say" }: { label?: string }) {
  const [[index, direction], setState] = useState<[number, number]>([0, 1]);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const count = testimonials.length;

  const go = useCallback(
    (step: number) => setState(([i]) => [(i + step + count) % count, step]),
    [count],
  );
  const jump = (to: number) => setState(([i]) => [to, to >= i ? 1 : -1]);

  const t = testimonials[index];

  return (
    <div
      className="testimonials"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <motion.div
        className="testimonials-glow"
        aria-hidden
        animate={{ x: `${(index / (count - 1)) * 60 - 30}%`, rotate: index * 24 }}
        transition={{ duration: 1.6, ease: EASE }}
      />

      <motion.span
        key={`mark-${index}`}
        className="testimonials-mark"
        aria-hidden
        initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        &ldquo;
      </motion.span>

      <div className="testimonials-stage" aria-live={paused ? "polite" : "off"}>
        {testimonials.map((s) => (
          <div key={s.name} className="testimonials-sizer" aria-hidden>
            <blockquote>
              {s.quote.split("\n\n").map((para, p) => (
                <p key={p}>{para}</p>
              ))}
            </blockquote>
            <div className="testimonials-author"><span>{s.name}</span></div>
          </div>
        ))}

        <AnimatePresence initial={false} custom={direction}>
          <motion.figure
            key={t.name}
            className="testimonials-figure"
            custom={direction}
            variants={figure}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragStart={() => setPaused(true)}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_PX) go(1);
              else if (info.offset.x > SWIPE_PX) go(-1);
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
          >
            <blockquote>
              <Quote text={t.quote} />
            </blockquote>
            <motion.figcaption className="testimonials-author" variants={caption}>
              <span className="testimonials-initial" aria-hidden>{t.name[0]}</span>
              <span>{t.name}</span>
            </motion.figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      <div className="testimonials-controls">
        <div className="testimonials-tabs">
          {testimonials.map((s, i) => (
            <button
              key={s.name}
              type="button"
              aria-label={`Show testimonial from ${s.name}`}
              aria-current={i === index}
              onClick={() => jump(i)}
            >
              <span>{s.name}</span>
              <i className="testimonials-track">
                {i === index && (
                  <i
                    key={index}
                    className="testimonials-progress"
                    data-static={reduced || undefined}
                    style={{
                      animationDuration: `${AUTOPLAY_MS}ms`,
                      animationPlayState: paused ? "paused" : "running",
                    }}
                    onAnimationEnd={() => {
                      if (!reduced) go(1);
                    }}
                  />
                )}
              </i>
            </button>
          ))}
        </div>

        <div className="testimonials-arrows">
          <button type="button" onClick={() => go(-1)} aria-label="Previous testimonial">
            ←
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next testimonial">
            →
          </button>
        </div>
      </div>
    </div>
  );
}
