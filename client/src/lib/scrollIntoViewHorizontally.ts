/** Reveal a selection without scrolling the page that contains its rail. */
export function scrollIntoViewHorizontally(
  track: HTMLElement,
  item: HTMLElement,
  behavior: ScrollBehavior,
): void {
  const start = track.getBoundingClientRect().left + track.clientLeft;
  const end = start + track.clientWidth;
  const bounds = item.getBoundingClientRect();
  const delta = bounds.left < start
    ? bounds.left - start
    : bounds.right > end
      ? bounds.right - end
      : 0;
  if (Math.abs(delta) > 1) track.scrollBy({ left: delta, behavior });
}
