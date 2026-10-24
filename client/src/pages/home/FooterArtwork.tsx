import { useId } from "react";
import BhalyamLogo from "../../components/bhalyam/BhalyamLogo";

export function VerandaScene() {
  const id = useId();
  return <svg viewBox="0 0 180 170" fill="none" aria-hidden="true" focusable="false"
    data-footer-art="veranda" className="pointer-events-none absolute -right-3 bottom-0 hidden h-40 w-40 text-footer-gold opacity-70 lg:block">
    <defs><radialGradient id={id}><stop stopColor="currentColor" stopOpacity=".25" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient></defs>
    <circle cx="88" cy="68" r="65" fill={`url(#${id})`} />
    <path d="M20 20H164M29 20V153M151 20V153M25 120H156M25 131H156M48 122V153M76 122V153M104 122V153M132 122V153" stroke="currentColor" strokeOpacity=".4" />
    <path d="M91 20V42M78 58H104L98 42H84L78 58Z" stroke="currentColor" strokeWidth="2" />
    <ellipse cx="91" cy="61" rx="14" ry="5" fill="currentColor" fillOpacity=".6" />
    <path d="M53 107V84H116V107M47 107H123M63 108V118M107 108V118" stroke="currentColor" strokeWidth="2" />
    <rect x="66" y="85" width="30" height="20" rx="3" className="fill-footer-panel" stroke="currentColor" />
    <circle cx="76" cy="95" r="5" stroke="currentColor" /><path d="M86 92H91M86 97H91M91 84L103 70" stroke="currentColor" />
    <path d="M139 114V93M139 102C124 99 128 84 139 93C147 78 155 94 139 102M132 115H148L145 126H135Z" fill="currentColor" fillOpacity=".4" />
    <path d="M10 154H170" stroke="currentColor" strokeOpacity=".35" />
  </svg>;
}

export function PlaygroundSignoff() {
  const id = useId();
  return <div className="relative order-5 h-[290px] min-w-0 overflow-hidden rounded-t-3xl border-t border-footer-edge/15 lg:col-span-12">
    <svg viewBox="0 0 1100 290" preserveAspectRatio="xMidYMax slice" fill="none" aria-hidden="true" focusable="false"
      data-footer-art="playground" className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id={`${id}-sunset`}><stop className="text-footer-orange" stopColor="currentColor" stopOpacity=".22" /><stop offset="1" className="text-footer-gold" stopColor="currentColor" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-route`} x1="200" x2="550" y1="180" y2="270" gradientUnits="userSpaceOnUse">
          <stop className="text-footer-gold" stopColor="currentColor" stopOpacity=".2" /><stop offset=".65" className="text-footer-gold" stopColor="currentColor" stopOpacity=".7" /><stop offset="1" className="text-footer-cyan" stopColor="currentColor" />
        </linearGradient>
      </defs>
      <ellipse cx="655" cy="155" rx="330" ry="150" fill={`url(#${id}-sunset)`} />
      <circle cx="655" cy="157" r="42" className="fill-footer-orange/20" />
      <path d="M0 200Q110 174 210 199T430 196T650 193T880 196T1100 191V290H0Z" className="fill-footer-deep" />
      <path d="M0 204Q200 190 350 205T670 201T1100 199" className="stroke-footer-gold/15" />
      <g className="text-footer-soft" stroke="currentColor" strokeOpacity=".2">
        <path d="M126 193V112M76 147Q85 94 125 100Q163 89 179 144M91 172Q68 143 90 130M158 170Q184 140 166 125" strokeWidth="5" />
        <path d="M850 195V117H946V195M859 117L838 196M936 117L957 196M878 118V166M919 118V166M872 167H885M912 167H925" strokeWidth="2" />
        <path d="M772 58L785 39L798 57L785 73ZM785 73Q773 96 792 99T785 128" />
      </g>
      <g className="text-footer-night" fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="438" cy="159" r="9" /><path d="M434 170L420 189L443 194L450 211M425 182L446 184L459 177M435 193L421 213" strokeWidth="8" />
        <circle cx="510" cy="154" r="9" /><path d="M508 166L518 186L498 199L496 215M515 178L492 185L479 179M516 188L533 210" strokeWidth="8" />
        <circle cx="575" cy="163" r="8" /><path d="M575 174L565 194L583 202M570 182L589 184M568 194L553 210M579 200L594 213" strokeWidth="7" />
      </g>
      <path d="M456 196H491L501 218H447ZM461 207H495M468 197L466 218M480 197L484 218" className="stroke-footer-soft/35" strokeWidth="1.5" />
      <circle cx="480" cy="179" r="3" className="fill-footer-gold/70" />
      <path d="M202 223L275 198L334 224L264 249ZM238 211L299 237M297 211L231 237" className="stroke-footer-soft/20" strokeWidth="1.5" strokeDasharray="4 5" />
      <path d="M267 248C340 280 385 232 423 241S483 274 550 267" stroke={`url(#${id}-route)`} strokeWidth="2" strokeDasharray="5 6" />
      <path d="M550 267H663V246H732V229H825M663 267H909" className="stroke-footer-cyan/25" strokeWidth="1.5" />
      <g className="fill-footer-cyan/50"><circle cx="663" cy="246" r="3" /><circle cx="732" cy="229" r="3" /><circle cx="825" cy="229" r="3" /><rect x="300" y="83" width="3" height="3" /><rect x="821" y="98" width="3" height="3" /></g>
      <g className="fill-footer-gold/40"><circle cx="225" cy="57" r="1.5" /><circle cx="715" cy="38" r="1.5" /><circle cx="889" cy="62" r="1.5" /><circle cx="371" cy="106" r="1" /><circle cx="955" cy="94" r="1" /></g>
    </svg>
    <div className="relative mx-auto max-w-sm px-4 pt-7 text-center">
      <p className="font-script text-3xl font-semibold leading-tight text-footer-gold sm:text-4xl">Same Games. Bigger Memories.</p>
      <p className="mt-2 text-xs text-footer-soft">The game session ends. The memories continue.</p>
    </div>
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-xl border border-footer-gold/35 bg-footer-night p-1">
      <BhalyamLogo size={34} decorative shadow={false} />
    </div>
  </div>;
}
