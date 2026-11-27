/**
 * "Sunday, 20 Sep" — the handwritten caption that opens each day of a
 * conversation, held to the page with a strip of tape. Ornament #4.
 *
 * It is a real heading for screen readers, so a person can jump day to day.
 */
export function DayCaption({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-3" role="presentation">
      <h3 className="album-day m-0 font-normal">{label}</h3>
    </div>
  );
}
