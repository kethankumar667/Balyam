export default function InstructionsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-bold">How to play Ludo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        <Section title="🎯 Goal">
          Move all 4 of your tokens from your yard, around the board, and into the center home.
          First player to get all 4 tokens home wins.
        </Section>

        <Section title="🎲 Turn flow">
          <ul className="list-disc pl-5 space-y-1">
            <li>On your turn, click <b>Roll</b>. The dice will tumble and land on 1–6.</li>
            <li>If any of your tokens can move with that roll, they will glow and bob — click one to move it.</li>
            <li>You can only bring a token <b>out of the yard</b> by rolling a <b>6</b>.</li>
            <li>If no token can move, your turn passes automatically.</li>
          </ul>
        </Section>

        <Section title="✨ Rolling a 6">
          <ul className="list-disc pl-5 space-y-1">
            <li>Rolling a 6 grants you a <b>bonus turn</b> — roll again after moving.</li>
            <li>Rolling <b>three 6s in a row</b> forfeits the turn entirely.</li>
          </ul>
        </Section>

        <Section title="💥 Capturing">
          <ul className="list-disc pl-5 space-y-1">
            <li>Land on an opponent's token on a <b>regular square</b> — their token returns to their yard.</li>
            <li><b>Safe squares</b> (marked with ★) protect tokens: the 4 starting squares plus 4 mid-track stars.</li>
            <li>Capturing also grants you a <b>bonus turn</b> — roll again right after.</li>
          </ul>
        </Section>

        <Section title="🔒 Mandatory Capture rule">
          <p className="mb-2">
            <b>Until you capture at least one opponent token, your home column stays locked.</b>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>If a token reaches your colored home entrance without you having captured anyone, it <b>cannot turn in</b>.</li>
            <li>It must bypass the entrance and run another full lap around the board.</li>
            <li>Once you make your first capture, the home path <b>unlocks for all four of your tokens</b> for the rest of the match.</li>
            <li>Your player card shows a 🔒 (locked) or 🔓 (unlocked) badge so you always know.</li>
          </ul>
        </Section>

        <Section title="🏠 Reaching home">
          <ul className="list-disc pl-5 space-y-1">
            <li>After 51 track squares, your token enters its colored home stretch (6 cells).</li>
            <li>You need the <b>exact roll</b> to reach the final home cell — overshooting isn't allowed.</li>
            <li>Each token in home earns a 🏠 on your player card.</li>
            <li>Getting a token all the way home also grants you a <b>bonus turn</b>.</li>
          </ul>
        </Section>

        <Section title="💬 During the game">
          Use the chat panel and 🎙 Connect mic on the right to chat or talk with your friends while playing.
        </Section>

        <div className="flex justify-end pt-2 border-t border-slate-700">
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 rounded px-5 py-2 font-semibold"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-slate-900/60 rounded-lg p-3">
      <h3 className="font-semibold text-amber-300 mb-1">{title}</h3>
      <div className="text-sm text-slate-200">{children}</div>
    </section>
  );
}
