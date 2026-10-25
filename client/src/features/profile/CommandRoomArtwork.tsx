import { useId } from "react";

/** Original game-room props stay below the content, leaving a quiet field behind the level. */
export function CommandRoomArtwork() {
  const id = useId();
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 360 480" preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-0 h-full w-full">
    <defs>
      <linearGradient id={`${id}-wood`} x2="0" y2="1"><stop stopColor="var(--command-art-wood)" /><stop offset="1" stopColor="var(--command-art-shade)" /></linearGradient>
      <linearGradient id={`${id}-window`} x2="0" y2="1"><stop stopColor="var(--command-art-sky)" /><stop offset="1" stopColor="var(--command-art-sun)" /></linearGradient>
    </defs>
    <path d="M20 22h320v435H20z" fill="none" stroke="var(--command-edge)" opacity=".3" />
    <path d="M258 40h66v135h-66z" fill={`url(#${id}-window)`} opacity=".3" />
    <path d="M291 40v135m-33-68h66" stroke="var(--command-art-wood)" strokeWidth="5" opacity=".4" />
    <g opacity=".55">
      <path d="M0 448h360v32H0z" fill={`url(#${id}-wood)`} />
      <path d="M14 446V244h54v202m-48-145h42m-42 70h42" fill="none" stroke="var(--command-art-wood)" strokeWidth="7" />
      <path d="M25 287v-31m9 31v-36m10 36v-27m10 27v-34" stroke="var(--command-art-sun)" strokeWidth="6" />
      <path d="m288 448 14-124 20 2-4 122z" fill="var(--command-art-wood)" />
      <path d="m307 325 3-38 8 1-1 39" fill="var(--command-art-shade)" />
      <circle cx="278" cy="432" r="16" fill="var(--command-art-ball)" /><path d="m270 418 8 28m0-29 8 26" stroke="var(--command-art-sun)" fill="none" />
      <g transform="translate(20 405) rotate(-8)"><rect width="57" height="38" rx="4" fill="var(--command-art-wood)" /><path d="M7 10h40m-40 8h30m-30 8h36" stroke="var(--command-art-sun)" strokeWidth="2" /></g>
      <path d="M143 454h73l-7-18h-58z" fill="var(--command-art-wood)" />
      <path d="M157 447v-6h11m-5-5v11m28-6h2m7 4h2" stroke="var(--command-art-sun)" strokeWidth="3" />
    </g>
  </svg>;
}
