"use client";

import Image from "next/image";
import { useState } from "react";

export type Video =
  | { kind: "youtube"; id: string; title: string; short?: boolean }
  | { kind: "file"; src: string; poster: string; title: string };

/**
 * Click-to-play video. Until the visitor presses play, only a lazily loaded
 * poster image is on the page — no YouTube iframe or video bytes are fetched.
 */
export function LazyVideo({ video, sizes }: { video: Video; sizes: string }) {
  const [playing, setPlaying] = useState(false);
  const poster =
    video.kind === "youtube" ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : video.poster;

  if (playing) {
    return (
      <div className="video-frame">
        {video.kind === "youtube" ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={video.src} poster={video.poster} controls autoPlay playsInline />
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="video-frame video-facade"
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${video.title}`}
    >
      <Image src={poster} alt="" fill sizes={sizes} style={{ objectFit: "cover" }} />
      <span className="video-play" aria-hidden>
        ▶
      </span>
    </button>
  );
}
