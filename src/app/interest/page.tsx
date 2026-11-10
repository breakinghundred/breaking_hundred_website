import type { Metadata } from "next";
import { JoinForm } from "@/components/JoinForm";

export const metadata: Metadata = {
  title: "Register your interest",
  description: "Register your interest in The Circle. Your personal payment link arrives by 21 November.",
};

export default function InterestPage() {
  return (
    <section className="section flow-page">
      <div className="wrap join">
        <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle</span>
        <h1 className="flow-title">Register your interest.</h1>
        <p className="muted">
          Membership is £299 for 12 months. Register now and we will email your personal payment link by
          21 November, followed by an onboarding call in December.
        </p>
        <JoinForm startOpen />
      </div>
    </section>
  );
}
