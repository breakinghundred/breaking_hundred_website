"use client";

import { MEMBER_SORTS, type MemberSort } from "./member-list";

/** "Sort by" for the members list. Lives inside the search form and reloads the list as soon as it changes. */
export function SortSelect({ value }: { value: MemberSort }) {
  return (
    <label className="small sort-select">
      Sort by{" "}
      <select name="sort" className="admin-input" defaultValue={value} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        {Object.entries(MEMBER_SORTS).map(([key, s]) => (
          <option key={key} value={key}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
