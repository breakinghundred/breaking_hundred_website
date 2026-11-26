import type { Prisma } from "@/generated/prisma/client";

/** Members shown per page on the dashboard. */
export const PAGE_SIZE = 25;

/** Sort choices for the dashboard's members list. `id` last keeps the order stable across pages. */
export const MEMBER_SORTS = {
  recent: { label: "Recently updated", orderBy: [{ updatedAt: "desc" }, { id: "asc" }] },
  name: { label: "Name (A to Z)", orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { email: "asc" }, { id: "asc" }] },
  name_desc: { label: "Name (Z to A)", orderBy: [{ firstName: "desc" }, { lastName: "desc" }, { email: "desc" }, { id: "asc" }] },
  newest: { label: "Newest sign-ups", orderBy: [{ createdAt: "desc" }, { id: "asc" }] },
  oldest: { label: "Oldest sign-ups", orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} satisfies Record<string, { label: string; orderBy: Prisma.MemberOrderByWithRelationInput[] }>;

export type MemberSort = keyof typeof MEMBER_SORTS;

export const isMemberSort = (s: string | undefined): s is MemberSort => !!s && s in MEMBER_SORTS;
