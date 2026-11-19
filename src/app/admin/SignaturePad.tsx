"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A box to sign in with a mouse, finger or pen. The drawing is sent as a PNG data URL
 * in a hidden input called `name`, and is empty until something has been drawn.
 */
export function SignaturePad({ name, label }: { name: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [value, setValue] = useState("");

  // Size the drawing surface to the box on screen (sharp on high-density displays), on a white background.
  const reset = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a";
    setValue("");
  };

  useEffect(reset, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = e.currentTarget.getContext("2d");
    if (ctx) {
      const p = last.current;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = "#1a1a1a";
      ctx.fill();
    }
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    setValue(e.currentTarget.toDataURL("image/png"));
  };

  return (
    <div className="sig-pad">
      <span>{label}</span>
      <canvas
        ref={canvasRef}
        className="sig-canvas"
        role="img"
        aria-label={value ? `${label}: signed` : `${label}: empty. Draw your signature here.`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      <input type="hidden" name={name} value={value} />
      <div className="sig-row">
        <span className="small muted">{value ? "Signed." : "Sign above with your mouse or finger."}</span>
        <button type="button" className="button outline small" onClick={reset} disabled={!value}>
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
}
