import { useId } from "react";

/** Original shelf-and-plinth illustration; all lettering stays in live HTML. */
export function TrophyVaultArtwork() {
  const id = useId().replace(/:/g, "");
  return <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-gold`} x1="0" x2="1" y2=".7"><stop stopColor="#805013" /><stop offset=".28" stopColor="#ffdb77" /><stop offset=".52" stopColor="#fff0b6" /><stop offset=".72" stopColor="#cf8b22" /><stop offset="1" stopColor="#805013" /></linearGradient>
      <radialGradient id={`${id}-light`}><stop stopColor="#ffc64a" stopOpacity=".45" /><stop offset="1" stopColor="#ffc64a" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-base`} x2="0" y2="1"><stop stopColor="#466078" /><stop offset="1" stopColor="#0b1d32" /></linearGradient>
    </defs>
    <circle cx="240" cy="170" r="170" fill={`url(#${id}-light)`} />
    <g stroke="var(--vault-edge)" fill="none" opacity=".45" strokeWidth="2">
      <path d="M20 80h100v210H20M360 80h100v210H360M20 150h100M20 220h100M360 150h100M360 220h100" />
      <path d="M40 145v-35h16v35m8 0v-44h12v44m8 0-6-32 15-3 7 35M380 215v-35h16v35m8 0v-44h12v44m8 0-6-32 15-3 7 35" />
      <circle cx="68" cy="193" r="17" /><path d="m68 181 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z" />
      <path d="m384 141 12-30 13 30m-23-8h20m19 8v-30h13v30" />
    </g>
    <g stroke="#dfaf51" opacity=".4"><path d="m240 23 0 35m-78-17 18 34m-71 5 28 24m181-63-18 34m71 5-28 24" /><path d="m152 210-25 11m201-11 25 11" /></g>
    <ellipse cx="240" cy="308" rx="145" ry="25" fill="var(--vault-ink)" opacity=".08" />
    <path d="M126 281q114-32 228 0v25q-114 35-228 0Z" fill={`url(#${id}-base)`} stroke="#c69535" strokeWidth="2" />
    <ellipse cx="240" cy="280" rx="114" ry="23" fill="#21394c" stroke="#dcad4d" strokeWidth="3" />
    <g fill={`url(#${id}-gold)`} stroke="#b67b22" strokeWidth="2">
      <path d="M184 100h-38v32c0 37 27 60 60 61l-3-16c-25-3-40-20-40-45v-15h22Zm112 0h38v32c0 37-27 60-60 61l3-16c25-3 40-20 40-45v-15h-22Z" />
      <path d="M180 87h120l-8 65c-3 30-24 51-45 58v32h28v15h-70v-15h28v-32c-21-7-42-28-45-58Z" />
      <ellipse cx="240" cy="87" rx="61" ry="9" />
      <path d="M200 257h80l10 18H190Z" />
    </g>
    <path d="M204 108q-2 53 22 74" stroke="#fff4c7" strokeWidth="5" fill="none" opacity=".7" />
    <circle cx="240" cy="142" r="24" fill="#9a651c" stroke="#ffe09a" strokeWidth="2" />
    <path d="m240 123 6 12 13 2-10 10 2 13-11-6-11 6 2-13-10-10 13-2Z" fill="#ffe7a4" />
    <g fill="#e5b852"><circle cx="137" cy="121" r="2" /><circle cx="340" cy="159" r="3" /><circle cx="170" cy="57" r="2" /><circle cx="310" cy="240" r="2" /><path d="m349 52 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" /></g>
  </svg>;
}
