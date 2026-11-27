/**
 * Decorative footer art. Everything here is aria-hidden and carries no text, so a
 * replacement illustration can be dropped in without touching the footer's layout.
 * Colours come from the scoped `--footer-*` tokens, so the scene follows the theme.
 */

/**
 * A shallow playground scene that tells the BHALYAM story without a word: an old tree,
 * a chalk hopscotch with three children playing, one flying a kite, a swing, a setting sun.
 *
 * The canvas is 2400 units wide with the scene centred in it and anchored to the bottom.
 * It is wider than any footer, so the container is always height-bound: the full height of
 * the scene (tree crown, kite) is never cropped, a phone crops the sides down to the
 * children and the kite, and a wide screen simply shows more hill.
 */
export function PlaygroundArtwork() {
  return <div aria-hidden="true" data-footer-art="playground"
    className="pointer-events-none relative h-[96px] w-full min-w-0 overflow-hidden sm:h-[108px] lg:h-[118px]">
    <svg viewBox="0 14 2400 146" preserveAspectRatio="xMidYMax slice" fill="none" focusable="false" className="absolute inset-0 h-full w-full">
      <g transform="translate(665 0)">
        <circle cx="820" cy="104" r="54" className="fill-footer-orange/10" />
        <circle cx="820" cy="104" r="34" className="fill-footer-orange/25" />
      </g>
      <path d="M0 118Q330 98 660 116T1350 112T1950 114T2400 108V160H0Z" className="fill-footer-glass" />
      <g className="fill-footer-mint/15">
        <ellipse cx="300" cy="112" rx="16" ry="9" /><ellipse cx="350" cy="115" rx="11" ry="7" />
        <ellipse cx="2050" cy="110" rx="15" ry="9" /><ellipse cx="2104" cy="112" rx="10" ry="6" />
      </g>
      <path d="M0 134Q450 122 930 131T1650 128T2400 126V160H0Z" className="fill-footer-deep" />
      <g transform="translate(665 0)">
        <g className="text-footer-soft" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M100 146C104 128 104 112 100 96L122 96C117 112 119 128 126 146Z" className="fill-footer-soft/35" strokeOpacity=".4" strokeWidth="1.5" />
          <path d="M110 100L84 78M114 104L146 80M112 94V70" strokeOpacity=".45" strokeWidth="4" />
          <path d="M84 147q8-6 16 0M126 147q8-5 14 0" strokeOpacity=".4" strokeWidth="2" />
          <path d="M160 148C230 138 270 154 340 146S420 151 440 146" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="3 6" />
          <path d="M456 142h30l-4 12h-30zM496 142h30l-4 12h-30zM536 142h30l-4 12h-30zM576 142h30l-4 12h-30zM616 142h30l-4 12h-30z" strokeOpacity=".35" strokeWidth="1.5" />
          <path d="M936 138L952 66H1020L1036 138M952 66H1020" strokeOpacity=".5" strokeWidth="3" />
          <path d="M968 68V108M1004 68V112" strokeOpacity=".5" strokeWidth="2" />
          <path d="M958 108H978M994 112H1014" strokeOpacity=".6" strokeWidth="4" />
          <path d="M470 38q6-7 12 0q6-7 12 0M512 52q5-6 10 0q5-6 10 0" strokeOpacity=".4" strokeWidth="2" />
          <path d="M300 148l2-8l3 8M312 148l1-6l3 6M780 146l2-7l3 7M1080 146l2-8l3 8" strokeOpacity=".4" strokeWidth="1.5" />
          <path d="M641 93Q668 80 691 64" strokeOpacity=".55" strokeWidth="1.2" />
        </g>
        <g className="fill-footer-mint/25">
          <circle cx="112" cy="62" r="30" /><circle cx="80" cy="78" r="22" /><circle cx="146" cy="76" r="24" />
          <circle cx="112" cy="86" r="22" /><circle cx="94" cy="50" r="18" /><circle cx="134" cy="50" r="18" />
          <ellipse cx="360" cy="134" rx="24" ry="9" /><ellipse cx="880" cy="133" rx="20" ry="8" /><ellipse cx="30" cy="137" rx="22" ry="8" />
        </g>
        <g className="fill-footer-mint/15"><circle cx="100" cy="66" r="14" /><circle cx="130" cy="72" r="13" /><circle cx="116" cy="46" r="10" /></g>
        <g transform="translate(0 8)">
          <path d="M700 22L716 42L700 60L684 42Z" className="fill-footer-gold/55 stroke-footer-soft/60" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M700 22V60M684 42H716" className="stroke-footer-soft/40" strokeWidth="1" />
          <path d="M700 60q-8 8 0 14t-2 14t6 10" className="stroke-footer-orange/70" strokeWidth="1.5" strokeLinecap="round" />
          <g className="fill-footer-orange/60"><circle cx="699" cy="72" r="2.2" /><circle cx="701" cy="85" r="2.2" /></g>
        </g>
        <g className="text-footer-scene-ink dark:text-footer-mute" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <g fill="currentColor" stroke="none"><circle cx="482" cy="98" r="7" /><circle cx="547" cy="97" r="7" /><circle cx="622" cy="101" r="7" /></g>
          <path d="M480 108L470 128M547 107V127M622 111L620 131" strokeWidth="8" />
          <path d="M470 128L484 138L480 148M470 128L458 137L448 146M547 127V147M547 127L559 135L550 141M620 131L613 148M620 131L630 147" strokeWidth="6" />
          <path d="M478 113L493 121M478 113L463 117M547 113L530 105M547 113L564 107M622 116L636 104L641 93M622 116L609 125" strokeWidth="4.5" />
        </g>
        <g className="fill-footer-gold/40"><circle cx="300" cy="56" r="1.5" /><circle cx="900" cy="44" r="1.5" /><circle cx="1070" cy="62" r="1" /></g>
      </g>
    </svg>
  </div>;
}
