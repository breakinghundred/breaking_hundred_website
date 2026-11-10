import type { Metadata } from "next";
import { db } from "@/lib/db";
import { readToken } from "@/lib/token";
import { ContributeForm } from "./ContributeForm";

export const metadata: Metadata = { title: "Give back through The Circle", robots: { index: false } };

export default async function ContributePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const id = readToken(t, "contribute");
  const member = id ? await db().member.findUnique({ where: { id } }) : null;
  return (
    <section className="section flow-page">
      <div className="wrap join">
        <span className="eyebrow" style={{ color: "var(--wine)" }}>Become</span>
        <h1 className="flow-title">{member ? `Give back, ${member.firstName}.` : "This link is not valid."}</h1>
        {member && t ? (
          <>
            <p className="muted">There are several ways to contribute, whatever time you have. Tell us where you would like to help.</p>
            <ContributeForm token={t} current={member.contributorTrack?.split(", ") ?? []} />
          </>
        ) : (
          <p className="muted">Please use the personal link from your Circle email.</p>
        )}
      </div>
    </section>
  );
}
