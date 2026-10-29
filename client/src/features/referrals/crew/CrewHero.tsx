/** A paper plane on a dotted flight path, drawn once and reused at two sizes. */
function PaperPlane({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M44 4 4 21l14 5 5 14 21-36Z" />
      <path d="m18 26 26-22" />
    </svg>
  );
}

/** A low skyline at dusk: only a silhouette, so it stays quiet behind the title. */
function Skyline() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 600 90" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-16 w-full text-[#050b16]/80 sm:h-20">
      <path
        fill="currentColor"
        d="M0 90V58h28V40h22v18h18V30l14-12 14 12v28h24V46h30V24h20v34h22V50h26V34l16-14 16 14v24h28V44h34v14h22V36h26v22h30V48h24V28h18v30h26V42h30v16h22V52h28V38l12-10 12 10v20h24V46h30v44Z"
      />
    </svg>
  );
}

/**
 * The page's title. The friends' photograph glows through the right side under a dusk-purple wash, a skyline and two
 * paper planes frame the title, and the handwritten line is the page's mood. All the art is decoration; the title and
 * the tagline are the only things a screen reader hears.
 */
export function CrewHero() {
  return (
    <header className="relative isolate overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-r from-[#0b1c31] via-[#1c1a4a] to-[#8a3a4a] px-5 pb-12 pt-6 sm:px-8 sm:pb-14 sm:pt-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-3/4 sm:w-3/5">
        <picture>
          <source type="image/avif" srcSet="/gangoffriends.avif" />
          <source type="image/webp" srcSet="/gangoffriends.webp" />
          <img src="/gangoffriends.png" alt="" width={1536} height={1024} loading="lazy" decoding="async" className="h-full w-full object-cover object-[60%_40%] opacity-45 [mask-image:linear-gradient(90deg,transparent,#000_55%)]" />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c31]/70 via-transparent to-[#7a2e8a]/25" />
      </div>
      <Skyline />
      <PaperPlane className="pointer-events-none absolute right-[34%] top-5 hidden h-9 w-9 -rotate-12 text-white/80 sm:block" />
      <PaperPlane className="pointer-events-none absolute right-6 top-4 h-7 w-7 rotate-6 text-white/70 sm:right-24" />

      <h1 className="relative m-0 font-display text-[40px] leading-none tracking-wide text-white sm:text-6xl">
        Crew <span className="text-[#ffb800]">Quest</span>
      </h1>
      <p className="relative m-0 mt-2 max-w-md text-sm leading-relaxed text-[#dbe7f5] sm:text-base">Invite friends. Play together. Unlock shared memories.</p>
      <p aria-hidden="true" className="absolute bottom-5 right-5 m-0 hidden -rotate-3 font-script text-2xl text-white/90 sm:block">
        Good friends make great games!
      </p>
    </header>
  );
}
