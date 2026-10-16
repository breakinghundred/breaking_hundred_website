"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Photo } from "./Photo";
import { EASE } from "./motion";
import { site } from "@/lib/site";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.06, 1.16]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section className="hero home" ref={ref}>
      <motion.div
        aria-hidden
        style={{ position: "absolute", inset: "-10% 0", y: photoY, scale: photoScale, zIndex: 0 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.83 }}
        transition={{ duration: 1.4, ease: EASE }}
      >
        <Photo
          src="/images/hero-gathering.jpg"
          // decorative backdrop: the headline beside it carries the meaning,
          // and the wrapper is already aria-hidden
          alt=""
          sizes="100vw"
          preload
          style={{ height: "100%" }}
        />
      </motion.div>
      <div className="hero-scrim" aria-hidden />

      <div className="wrap" style={{ position: "relative", zIndex: 2 }}>
        <motion.div className="hero-content" style={{ y: contentY, opacity: contentOpacity }}>
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
          >
            Breaking Hundred Circle
          </motion.span>

          <h1>
            <motion.span
              style={{ display: "inline" }}
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } } }}
            >
              {site.tagline.split(" ").map((word, i) => (
                <span
                  key={i}
                  style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.06em" }}
                >
                  <motion.span
                    style={{ display: "inline-block" }}
                    variants={{
                      hidden: { y: "110%", opacity: 0 },
                      show: { y: "0%", opacity: 1, transition: { duration: 1.1, ease: EASE } },
                    }}
                  >
                    {word}&nbsp;
                  </motion.span>
                </span>
              ))}
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.55 }}
          >
            A leadership community for women from minority ethnic backgrounds to grow in
            confidence, build influence and open doors for those coming behind.
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
          >
            <Link className="button light" href="/membership">
              <span>Explore membership</span>
              <span className="arrow" aria-hidden>↗</span>
            </Link>
            <Link className="button outline" href="/fellowship">
              <span>Discover the Fellowship</span>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="scroll-cue"
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.8 }}
      >
        <span>Scroll</span>
        <motion.i
          animate={{ scaleY: [0.2, 1, 0.2], originY: 0 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}
