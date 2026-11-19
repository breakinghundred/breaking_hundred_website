import { ActionForm } from "./ActionForm";
import { memberAction } from "./actions";

/** "Joined the platform" tick, for paid members the site hasn't seen join Mighty Networks. */
export function JoinedButton({ id, name, link = false }: { id: string; name: string; link?: boolean }) {
  return (
    <ActionForm
      action={memberAction}
      confirm={{
        title: `Mark ${name} as joined the platform?`,
        message: [
          "Only do this once you can see her in Start Here on Mighty Networks.",
          "Next you add her to the five private spaces, then press Spaces added. That sends her welcome email.",
        ],
        confirmLabel: "Yes, she has joined",
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button name="op" value="mark-joined" className={link ? "link-btn" : "button small outline"}>
        {link ? "Tick: joined the platform" : <span>✓ She has joined the platform</span>}
      </button>
    </ActionForm>
  );
}
