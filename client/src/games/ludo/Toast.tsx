export default function Toast({
  text,
  emoji,
  color,
}: {
  text: string;
  emoji: string;
  color?: string;
}) {
  return (
    <div
      className="fixed top-6 left-1/2 toast-in z-40 bg-slate-900/95 border border-slate-700 rounded-full px-4 py-2 shadow-2xl flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
      style={{
        transform: "translate(-50%, 0)",
        outline: color ? `2px solid ${color}` : "none",
      }}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <span>{text}</span>
    </div>
  );
}
