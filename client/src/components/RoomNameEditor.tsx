import { useState } from "react";
import { Pencil } from "lucide-react";
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
        id="room-name-input"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder="Name this table…"
        aria-label="Room name"
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
        aria-label="Name this table"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[#8A6D4B] dark:text-slate-400 hover:text-[#EA5A1F] dark:hover:text-amber-400 transition underline underline-offset-4 decoration-dashed decoration-[#C9A876] cursor-pointer"
      >
        <Pencil size={14} aria-hidden />
        Name this table
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={isHost ? startEdit : undefined}
      disabled={!isHost}
      title={isHost ? "Click to rename" : undefined}
      aria-label={isHost ? `Rename table: ${name}` : `Table name: ${name}`}
      className={`font-script text-xl text-[#2B3550] dark:text-amber-300 ${
        isHost ? "hover:text-[#EA5A1F] cursor-text" : "cursor-default"
      }`}
    >
      ✏️ {name}
    </button>
  );
}

