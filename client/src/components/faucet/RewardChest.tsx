import { useId } from "react";
import { GoldCoin } from "./CoinRain";

/** Original open-chest illustration; shares the reward system's coin rather than introducing another currency. */
export function RewardChest() {
  const id = useId().replace(/:/g, "");
  return <div aria-hidden="true" className="relative h-28 w-36 drop-shadow-[0_6px_7px_#B9781744]">
    <svg viewBox="0 0 144 112" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id={`${id}wood`} x2="1" y2="1"><stop stopColor="#B56816" /><stop offset="1" stopColor="#63310E" /></linearGradient>
        <linearGradient id={`${id}gold`} x2="0.2" y2="1"><stop stopColor="#FFE995" /><stop offset=".5" stopColor="#F7B523" /><stop offset="1" stopColor="#B36A08" /></linearGradient>
      </defs>
      <path d="M34 52L26 16Q63 -1 108 16L116 51Z" fill={`url(#${id}gold)`} stroke="#995607" strokeWidth="2" />
      <path d="M41 44L35 21Q67 8 101 21L107 43Z" fill="#643313" stroke="#D58A1F" strokeWidth="2" />
      <path d="M29 52L111 49L124 68L41 79L20 66Z" fill="#512B12" stroke="#D78B13" strokeWidth="3" />
    </svg>
    <GoldCoin size={29} className="absolute left-9 top-9 -rotate-12" />
    <GoldCoin size={29} className="absolute left-14 top-7 rotate-12" />
    <GoldCoin size={26} className="absolute left-20 top-10 -rotate-12" />
    <GoldCoin size={25} className="absolute left-5 top-12 rotate-12" />
    <svg viewBox="0 0 144 112" className="absolute inset-0 h-full w-full">
      <path d="M21 65L41 76L123 65L119 100L44 110L25 98Z" fill={`url(#${id}wood)`} stroke="#9C5708" strokeWidth="2" />
      <path d="M21 65L41 76L123 65L122 74L42 85L23 75Z" fill={`url(#${id}gold)`} />
      <path d="M37 76L44 78L47 108L40 106Z M105 69L113 68L109 101L101 102Z" fill={`url(#${id}gold)`} />
      <path d="M74 79L85 78L85 91L75 93Z" fill={`url(#${id}gold)`} stroke="#9C5708" />
      <circle cx="80" cy="85" r="2" fill="#6D380B" />
      <path d="M48 103L97 97" fill="none" stroke="#E9A733" strokeWidth="1" opacity=".6" />
    </svg>
    <GoldCoin size={21} className="absolute bottom-0 left-1 -rotate-12" />
    <GoldCoin size={18} className="absolute bottom-1 right-0 rotate-12" />
  </div>;
}
