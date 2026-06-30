import { useState } from "react";
import { getSocket } from "../lib/socket";

/**
 * Inline "name this table" affordance for the room header — "Friday
 * Rummy Nights" chosen once, used forever (nostalgia-brief.md "Memory"
 * pillar — per-room name persists for the room's lifetime). Host can
 * set/rename by clicking it; everyone else sees it read-only. Renders
 * nothing when unset and the viewer isn't the host, so joiners don't see
 * empty-state clutter in the header.
 *
 * Not Rummy-specific — `Room.name` lives on every room regardless of
 * game, same as the room code — but this is where the nostalgia brief's
 * naming idea actually surfaces in the UI.
 */
export default function RoomNameEditor({
  name,
  isHost,
}: {
  name: string | null;
  isHost: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");

  function startEdit() {
    setDraft(name ?? "");
    setEditing(true);
  }

  function save() {
    getSocket().emit("room:setName", draft.trim().slice(0, 40));
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder="Name this table…"
        maxLength={40}
        className="font-script text-lg bg-transparent border-b border-dashed border-[#C9A876]
                   text-[#2B3550] focus:outline-none px-1 min-w-[10ch]"
      />
    );
  }

  if (!name) {
    if (!isHost) return null;
    return (
      <button
        type="button"
        onClick={startEdit}
        className="text-sm text-[#A3886E] hover:text-[#786350] italic underline-offset-2 hover:underline"
      >
        + Name this table
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={isHost ? startEdit : undefined}
      disabled={!isHost}
      title={isHost ? "Click to rename" : undefined}
      className={`font-script text-lg text-[#2B3550] ${
        isHost ? "hover:text-[#EA5A1F] cursor-text" : "cursor-default"
      }`}
    >
      {name}
    </button>
  );
}
