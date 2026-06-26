import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { DotsBoxesPublicState } from "@shared/types";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";

/* ─────────────────────────── Player pens (College stationery) ─────────────────────────── */
/*
 * College Textbook Edition — each player draws with a classic writing
 * instrument found in any college pencil-case: fountain pen black,
 * Reynolds blue ballpoint, red correction pen, and Camlin green ink.
 * All four are deep and legible against the cream ruled page.
 */
export type Pen = {
  name: string;
  color: string;
  /** Slightly softer color for box fills + score backgrounds. */
  softColor: string;
  /** Subtle drop-shadow approximating ink on paper. */
  shadow: string;
};

export const PENS: Pen[] = [
  { name: "Fountain Black", color: "#1a1a2e", softColor: "rgba(26,26,46,0.16)",   shadow: "0 0.5px 1px rgba(0,0,0,0.35)" },
  { name: "Reynolds Blue",  color: "#1e3a8a", softColor: "rgba(30,58,138,0.16)",  shadow: "0 0.5px 1px rgba(30,58,138,0.40)" },
  { name: "Red Marker",     color: "#7f1d1d", softColor: "rgba(127,29,29,0.16)",  shadow: "0 0.5px 1px rgba(127,29,29,0.38)" },
  { name: "Camlin Green",   color: "#14532d", softColor: "rgba(20,83,45,0.16)",   shadow: "0 0.5px 1px rgba(20,83,45,0.38)" },
];

export function penFor(idx: number): Pen {
  return PENS[((idx % PENS.length) + PENS.length) % PENS.length];
}

/* ─────────────────────────── Full classroom scene wrapper ─────────────────────────── */
/**
 * Fills the entire viewport with a nostalgic classroom environment.
 * Three fixed-height bands (chalkboard / floor) sandwich a flex-grow
 * desk area so there is ZERO overflow regardless of screen size.
 */
export function ClassroomScene({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#ddd5be",
        overflow: "hidden",
      }}
    >
      {/* ══ Chalkboard — fixed 72 px, horizontal flex, never wraps ══ */}
      <div
        style={{
          flexShrink: 0,
          height: 72,
          background: "linear-gradient(180deg,#1e3b2a 0%,#28503c 60%,#1e3b2a 100%)",
          borderBottom: "7px solid #7a4f28",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 10px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* chalkboard grain */}
        <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(118deg,transparent,transparent 2px,rgba(255,255,255,0.013) 2px,rgba(255,255,255,0.013) 4px)", pointerEvents: "none" }} />

        {/* ── Game demo SVG — left, inline in flex row ── */}
        <svg aria-hidden style={{ flexShrink: 0, opacity: 0.84, zIndex: 1 }} width="78" height="54" viewBox="0 0 78 54">
          {/* 3×3 dot grid */}
          {[0,1,2].map(row=>[0,1,2].map(col=>(
            <circle key={`${row}-${col}`} cx={8+col*27} cy={8+row*19} r="2.5" fill="rgba(255,255,255,0.85)" />
          )))}
          {/* drawn lines — two player colours */}
          <line x1="8"  y1="8"  x2="35" y2="8"  stroke="rgba(100,200,255,0.88)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="35" y1="8"  x2="62" y2="8"  stroke="rgba(255,180,80,0.88)"  strokeWidth="2" strokeLinecap="round"/>
          <line x1="8"  y1="27" x2="35" y2="27" stroke="rgba(100,200,255,0.82)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="8"  y1="8"  x2="8"  y2="27" stroke="rgba(255,180,80,0.88)"  strokeWidth="2" strokeLinecap="round"/>
          <line x1="35" y1="8"  x2="35" y2="27" stroke="rgba(100,200,255,0.88)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="35" y1="27" x2="62" y2="27" stroke="rgba(255,180,80,0.82)"  strokeWidth="2" strokeLinecap="round"/>
          <line x1="62" y1="8"  x2="62" y2="27" stroke="rgba(255,180,80,0.88)"  strokeWidth="2" strokeLinecap="round"/>
          {/* closed box */}
          <rect x="37" y="10" width="23" height="15" fill="rgba(255,200,80,0.22)" rx="1"/>
          <text x="48" y="21" textAnchor="middle" fontSize="10" fill="rgba(255,220,100,0.92)" fontFamily="'Caveat',cursive" fontWeight="bold">A</text>
          {/* dashed unfinished line */}
          <line x1="8" y1="46" x2="62" y2="46" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round"/>
          {/* pencil hint + label */}
          <text x="64" y="50" fontSize="11" fill="rgba(255,255,255,0.50)" fontFamily="Arial">✏</text>
          <text x="35" y="54" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.50)" fontFamily="'Caveat',cursive">Dots &amp; Boxes</text>
        </svg>

        {/* ── Centre: title + 3 equations on one line ── */}
        <div style={{ flex: 1, textAlign: "center", zIndex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Caveat','Patrick Hand',cursive", fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.90)", letterSpacing: 1.5, textShadow: "0 1px 3px rgba(0,0,0,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Class VI — Mathematics &amp; Games
          </div>
          <div style={{ fontFamily: "'Caveat',cursive", fontSize: 11, color: "rgba(210,255,225,0.62)", marginTop: 3, display: "flex", gap: 14, justifyContent: "center", flexWrap: "nowrap" }}>
            <span>a²+b²=c²</span><span>∑n(n+1)/2</span><span>π≈3.14</span>
          </div>
        </div>

        {/* ── "How to play" sketch — right of clock, compact ── */}
        <svg aria-hidden style={{ flexShrink: 0, opacity: 0.65, zIndex: 1 }} width="62" height="50" viewBox="0 0 62 50">
          {[0,1,2].map(r=>[0,1,2].map(c=>(
            <circle key={`${r}-${c}`} cx={6+c*22} cy={6+r*16} r="2" fill="rgba(255,255,255,0.72)" />
          )))}
          <line x1="6" y1="6" x2="28" y2="6"  stroke="rgba(255,255,255,0.62)" strokeWidth="1.4"/>
          <line x1="6" y1="22" x2="28" y2="22" stroke="rgba(255,255,180,0.62)" strokeWidth="1.4"/>
          <line x1="6" y1="6"  x2="6"  y2="22" stroke="rgba(255,255,255,0.62)" strokeWidth="1.4"/>
          <line x1="28" y1="6" x2="28" y2="22" stroke="rgba(255,255,255,0.62)" strokeWidth="1.4"/>
          <rect x="8" y="8" width="18" height="12" fill="rgba(255,255,255,0.10)" rx="1"/>
          <text x="17" y="18" textAnchor="middle" fontSize="8" fill="rgba(255,220,80,0.85)" fontFamily="'Caveat',cursive">B</text>
          <text x="2" y="46" fontSize="7.5" fill="rgba(255,255,255,0.50)" fontFamily="'Caveat',cursive">Close → Score!</text>
          {/* arrow */}
          <line x1="32" y1="14" x2="44" y2="14" stroke="rgba(255,255,180,0.55)" strokeWidth="1.2"/>
          <polygon points="44,11 44,17 50,14" fill="rgba(255,255,180,0.55)"/>
          <text x="53" y="18" fontSize="8" fill="rgba(255,220,80,0.75)" fontFamily="'Caveat',cursive">+1</text>
        </svg>

        {/* ── Wall clock — far right ── */}
        <svg aria-hidden style={{ flexShrink: 0, opacity: 0.66, zIndex: 1 }} width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="2"/>
          <circle cx="20" cy="20" r="16" fill="rgba(245,240,220,0.09)"/>
          {Array.from({length:12}).map((_,i)=>{
            const a=(i/12)*Math.PI*2-Math.PI/2;
            return <line key={i} x1={20+Math.cos(a)*12} y1={20+Math.sin(a)*12} x2={20+Math.cos(a)*15} y2={20+Math.sin(a)*15} stroke="rgba(255,255,255,0.58)" strokeWidth={i%3===0?1.5:0.8}/>;
          })}
          <line x1="20" y1="20" x2="14" y2="12" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="20" y1="20" x2="20" y2="9"  stroke="rgba(255,255,255,0.68)" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="20" cy="20" r="1.5" fill="rgba(255,255,255,0.85)"/>
        </svg>

        {/* chalk dust tray at bottom */}
        <div aria-hidden style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.06)", borderTop: "1px solid rgba(255,255,255,0.09)" }}>
          {[60,160,280,420,560].map((x,i)=>(
            <div key={i} style={{ position: "absolute", left: x, top: 1, width: i%2===0?11:7, height: 2, borderRadius: 2, background: i%3===0?"rgba(255,255,255,0.48)":"rgba(255,220,180,0.48)" }}/>
          ))}
        </div>
      </div>

      {/* Board mounting rail */}
      <div aria-hidden style={{ flexShrink: 0, height: 10, background: "linear-gradient(180deg,#8b5a28,#a0722a 60%,#8b5a28)", boxShadow: "0 3px 7px rgba(0,0,0,0.22)", borderBottom: "2px solid #6b4010" }}/>

      {/* ══ Desk area — flex-grow, overflow hidden ══ */}
      <div style={{ flex: 1, overflow: "hidden", padding: "6px 10px 4px" }}>
        <ClassroomDesk>{children}</ClassroomDesk>
      </div>

      {/* ══ Wooden floor + footer slot — fixed height ══ */}
      <div
        style={{
          flexShrink: 0,
          background: "linear-gradient(180deg,#c8922a,#b07820 60%,#986010)",
          backgroundImage: [
            "linear-gradient(180deg,#c8922a,#b07820 60%,#986010)",
            "repeating-linear-gradient(90deg,transparent,transparent 88px,rgba(0,0,0,0.09) 88px,rgba(0,0,0,0.09) 90px)",
            "repeating-linear-gradient(0deg,transparent,transparent 16px,rgba(0,0,0,0.05) 16px,rgba(0,0,0,0.05) 18px)",
          ].join(", "),
          borderTop: "4px solid #7a5010",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(255,255,255,0.09),transparent 40%)", pointerEvents: "none" }}/>

        {footer ? (
          <div style={{ padding: "6px 14px", position: "relative", zIndex: 2 }}>
            {footer}
          </div>
        ) : (
          <div style={{ padding: "6px 18px", display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 2, height: 46 }}>
            {/* Dustbin */}
            <div style={{ flexShrink: 0, opacity: 0.70, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 20, height: 6, background: "linear-gradient(90deg,#6b7280,#9ca3af)", borderRadius: "2px 2px 0 0" }}/>
              <div style={{ width: 17, height: 22, background: "linear-gradient(180deg,#4b5563,#374151)", borderRadius: "0 0 3px 3px" }}/>
            </div>
            {/* School bag */}
            <div style={{ opacity: 0.65, flexShrink: 0 }}>
              <div style={{ width: 32, height: 38, background: "linear-gradient(145deg,#1e3a8a,#1e40af)", borderRadius: "6px 6px 8px 8px", border: "1px solid #1e1b4b", boxShadow: "2px 2px 4px rgba(0,0,0,0.28)", position: "relative" }}>
                <div style={{ position: "absolute", top: 6, left: 3, right: 3, height: 11, background: "rgba(255,255,255,0.10)", borderRadius: 2 }}/>
              </div>
            </div>
            {/* Tally marks — score illustration */}
            <svg aria-hidden style={{ opacity: 0.58, flexShrink: 0 }} width="46" height="34" viewBox="0 0 46 34">
              {[0,1,2,3].map(i=><line key={i} x1={4+i*6} y1="5" x2={4+i*6} y2="22" stroke="rgba(255,255,255,0.78)" strokeWidth="1.7" strokeLinecap="round"/>)}
              <line x1="2" y1="24" x2="26" y2="7" stroke="rgba(255,255,255,0.78)" strokeWidth="1.7" strokeLinecap="round"/>
              <text x="30" y="20" fontSize="9" fill="rgba(255,255,180,0.68)" fontFamily="'Caveat',cursive">vs</text>
            </svg>
            {/* Chalk pieces */}
            {[0,1,2].map(i=>(
              <div key={i} style={{ width: i%2===0?13:8, height: 3, borderRadius: 2, background: i%2===0?"rgba(255,255,255,0.58)":"rgba(255,220,180,0.58)", transform:`rotate(${-14+i*11}deg)`, flexShrink: 0 }}/>
            ))}
            <div style={{ marginLeft: "auto", fontSize: 10, fontFamily: "'Caveat',cursive", color: "#fff3e0", opacity: 0.52, flexShrink: 0 }}>🤫 No noise!</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Classroom desk wrapper ─────────────────────────── */
/**
 * Wraps the entire game in a warm wooden school-desk surface filled with
 * nostalgic stationery decorations — ruler, HB pencil, eraser, sharpener,
 * textbook stack, mini chalkboard and desk-carved initials — so the empty
 * space around the board never looks pale or bare.
 */
export function ClassroomDesk({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative w-full h-full rounded-xl overflow-hidden"
      style={{
        background: "#c09030",
        backgroundImage: [
          "linear-gradient(158deg, #d4a840 0%, #b88828 35%, #c49235 65%, #a87618 100%)",
          "repeating-linear-gradient(0deg,   transparent, transparent 8px, rgba(0,0,0,0.022) 8px, rgba(0,0,0,0.022) 9px)",
          "repeating-linear-gradient(82deg,  transparent, transparent 28px, rgba(255,255,255,0.038) 28px, rgba(255,255,255,0.038) 30px)",
        ].join(", "),
        boxShadow: "inset 0 0 80px rgba(0,0,0,0.14), inset 0 2px 12px rgba(0,0,0,0.10)",
        padding: "18px 14px 12px",
      }}
    >
      {/* ══ Wooden ruler strip across the very top ══ */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{ height: 28, background: "#d4a240", borderBottom: "2px solid #a07010", overflow: "hidden" }}
      >
        {/* ruler top sheen */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(255,255,255,0.18),transparent)" }} />
        {/* centimetre ticks */}
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute", left: i * 16 + 8, top: 0,
            width: 1, height: i % 5 === 0 ? 16 : 9,
            background: "rgba(100,60,0,0.55)",
          }} />
        ))}
        {/* number labels every 5 ticks */}
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} style={{
            position: "absolute", left: i * 80 + 3, top: 14,
            fontSize: 9, color: "rgba(80,40,0,0.7)",
            fontFamily: "Arial, sans-serif", fontWeight: 700, userSelect: "none",
          }}>{i + 1}</span>
        ))}
      </div>

      {/* ══ HB Pencil — top-right, diagonal ══ */}
      <svg
        aria-hidden
        className="absolute pointer-events-none"
        style={{ top: 36, right: 18, transform: "rotate(-12deg)", opacity: 0.82 }}
        width="160" height="18" viewBox="0 0 160 18"
      >
        {/* Eraser (pink) */}
        <rect x="0" y="3" width="14" height="12" fill="#f9a8b0" rx="1.5" />
        {/* Metal ferrule */}
        <rect x="14" y="3" width="5" height="12" fill="#9ca3af" />
        <line x1="14" y1="3" x2="14" y2="15" stroke="#6b7280" strokeWidth="0.7" />
        <line x1="19" y1="3" x2="19" y2="15" stroke="#6b7280" strokeWidth="0.7" />
        {/* Hexagonal yellow body */}
        <rect x="19" y="2" width="124" height="14" fill="#fcd34d" />
        <rect x="19" y="2" width="124" height="4"  fill="#fde68a" />
        <rect x="19" y="12" width="124" height="4" fill="#f59e0b" />
        {/* "HB" label */}
        <text x="68" y="12" fontSize="8" fill="#92400e" fontFamily="Arial" fontWeight="bold" textAnchor="middle">HB No.2</text>
        {/* Tip cone */}
        <polygon points="143,2 143,16 160,9" fill="#fef9c3" />
        <polygon points="153,6 153,12 160,9" fill="#d4a044" />
        {/* Graphite tip */}
        <polygon points="157,7.5 157,10.5 160,9" fill="#1a1a2e" />
      </svg>

      {/* ══ Eraser + Sharpener cluster — bottom-left ══ */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{ bottom: 32, left: 20, display: "flex", flexDirection: "column", gap: 6, opacity: 0.80 }}
      >
        {/* Eraser block */}
        <div style={{
          width: 58, height: 24, borderRadius: 3,
          background: "linear-gradient(135deg,#f9a8d4,#ec4899)",
          border: "1px solid #be185d",
          boxShadow: "2px 2px 4px rgba(0,0,0,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: "#831843", fontWeight: 800,
          fontFamily: "Arial,sans-serif", letterSpacing: 1,
        }}>NATARAJ</div>
        {/* Sharpener (metallic box) */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{
            width: 26, height: 20, borderRadius: 2,
            background: "linear-gradient(135deg,#9ca3af,#6b7280)",
            border: "1px solid #4b5563",
            boxShadow: "1px 1px 3px rgba(0,0,0,0.3)",
          }} />
          {/* Pencil shaving curl */}
          <svg width="22" height="14" viewBox="0 0 22 14">
            <path d="M2 12 C4 4 10 2 14 6 C18 10 16 14 12 12 C8 10 6 6 10 4"
              fill="none" stroke="#fcd34d" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* ══ Textbook stack — bottom-right ══ */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{ bottom: 28, right: 22, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, opacity: 0.78 }}
      >
        {/* Top: thin notebook */}
        <div style={{
          width: 72, height: 10, borderRadius: "3px 3px 0 0",
          background: "#fde68a", border: "1px solid #d97706",
          boxShadow: "1px 1px 0 rgba(0,0,0,0.18)",
          fontSize: 7, color: "#92400e", fontFamily: "Arial,sans-serif",
          display: "flex", alignItems: "center", paddingLeft: 4, fontWeight: 700,
        }}>NOTES</div>
        {/* Middle: red textbook */}
        <div style={{
          width: 78, height: 16, borderRadius: 2,
          background: "#7f1d1d", border: "1px solid #450a0a",
          boxShadow: "2px 1px 0 rgba(0,0,0,0.22)",
          fontSize: 7, color: "#fecaca", fontFamily: "Arial,sans-serif",
          display: "flex", alignItems: "center", paddingLeft: 4,
        }}>MATHEMATICS</div>
        {/* Bottom: thick blue textbook */}
        <div style={{
          width: 84, height: 20, borderRadius: 2,
          background: "#1e3a8a", border: "1px solid #1e1b4b",
          boxShadow: "2px 2px 4px rgba(0,0,0,0.28)",
          fontSize: 7, color: "#bfdbfe", fontFamily: "Arial,sans-serif",
          display: "flex", alignItems: "center", paddingLeft: 4,
        }}>SCIENCE · PART II</div>
      </div>

      {/* ══ Mini chalkboard with formulas — left side ══ */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: 14, top: "50%", transform: "translateY(-50%)",
          width: 68, opacity: 0.70,
        }}
      >
        <div style={{
          background: "#1a2e1a",
          border: "4px solid #6b4c20",
          borderRadius: 3,
          padding: "6px 8px",
          boxShadow: "2px 2px 6px rgba(0,0,0,0.4)",
          fontFamily: "'Caveat','Patrick Hand',cursive",
          fontSize: 11,
          color: "#d1fae5",
          lineHeight: 1.7,
          whiteSpace: "nowrap",
        }}>
          x²+y²=r²<br />
          π≈3.14<br />
          ∠A+∠B=180°<br />
          <span style={{ color: "#fde68a" }}>∑n(n+1)</span>
        </div>
        {/* Chalk dust at the bottom */}
        <div style={{
          marginTop: 2, height: 3, borderRadius: 2,
          background: "rgba(255,255,255,0.35)",
          filter: "blur(1px)",
        }} />
      </div>

      {/* ══ "Carved" initials on desk — subtle centre watermark ══ */}
      <div
        aria-hidden
        className="absolute pointer-events-none select-none"
        style={{
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          fontSize: 96, fontFamily: "'Caveat',cursive",
          color: "rgba(0,0,0,0.045)",
          fontWeight: 900, letterSpacing: 4,
          userSelect: "none", whiteSpace: "nowrap",
        }}
      >
        B &amp; P ♥
      </div>

      {/* ══ Sticker star top-left corner ══ */}
      <svg
        aria-hidden
        className="absolute pointer-events-none"
        style={{ top: 32, left: 22, opacity: 0.72 }}
        width="34" height="34" viewBox="0 0 34 34"
      >
        <polygon
          points="17,2 21,12 32,13 23,20 26,31 17,25 8,31 11,20 2,13 13,12"
          fill="#fde047" stroke="#b45309" strokeWidth="1"
        />
        <text x="11" y="20" fontSize="9" fill="#92400e" fontFamily="Arial" fontWeight="bold">★</text>
      </svg>

      {/* Content above all decorations */}
      <div className="relative" style={{ zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
}
/** Dot diameter and line thickness are fixed; only `cellPx` scales per tier. */
const DOT_PX = 7;
const LINE_THICK = 4;

/* ─────────────────────────── Notebook shell ─────────────────────────── */

export function NotebookPaper({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative mx-auto rounded-sm overflow-hidden mt-3"
      style={{
        // College ruled notebook page: cream stock, blue horizontal lines,
        // red margin line — instantly familiar to every Indian student.
        background: "#f9f6ef",
        backgroundImage: [
          // Horizontal ruled lines every 28 px
          "linear-gradient(to bottom, transparent 27px, rgba(37,99,235,0.20) 27px, rgba(37,99,235,0.20) 28px, transparent 28px)",
          // Red left-margin line at 58px
          "linear-gradient(to right, transparent 57px, rgba(220,38,38,0.55) 57px, rgba(220,38,38,0.55) 59px, transparent 59px)",
        ].join(", "),
        backgroundSize: "100% 28px, 100% 100%",
        boxShadow:
          "0 14px 26px -10px rgba(0,0,0,0.30), 0 4px 10px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(0,0,0,0.08)",
      }}
    >
      {/* Spiral binding holes down the left edge */}
      {[14, 52, 90, 128, 166, 204, 242, 280].map((top) => (
        <div
          key={top}
          className="absolute pointer-events-none"
          style={{
            left: 10,
            top,
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "1.5px solid rgba(0,0,0,0.22)",
            background: "rgba(255,255,255,0.9)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
          }}
          aria-hidden
        />
      ))}
      {/* Dog-eared top-right corner */}
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: 32,
          height: 32,
          background:
            "linear-gradient(225deg, rgba(0,0,0,0.08) 0%, transparent 55%), linear-gradient(225deg, #ece9df 0%, #f9f6ef 55%)",
          clipPath: "polygon(100% 0, 0 0, 100% 100%)",
        }}
        aria-hidden
      />
      {/* Coffee stain ring */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: "22%",
          bottom: 30,
          width: 42,
          height: 42,
          borderRadius: "50%",
          border: "2px solid rgba(120,80,30,0.18)",
          boxShadow: "inset 0 0 8px rgba(120,80,30,0.10)",
          opacity: 0.7,
        }}
        aria-hidden
      />
      {/* Page number bottom-right */}
      <div
        className="absolute bottom-2 right-4 pointer-events-none select-none"
        style={{
          fontSize: 17,
          color: "#3b4060",
          fontFamily: "'Caveat','Patrick Hand',cursive",
          transform: "rotate(-1deg)",
          opacity: 0.7,
        }}
        aria-hidden
      >
        — 47 —
      </div>
      {children}
    </div>
  );
}

export function NotebookHeader({ roomCode, boxesPerSide }: { roomCode: string; boxesPerSide: number }) {
  return (
    <div
      className="flex justify-between items-baseline px-6 pt-4 pb-3 select-none"
      style={{ fontSize: 20, color: "#1e3a8a", fontFamily: "'Caveat','Patrick Hand',cursive" }}
    >
      <div>
        <span style={{ fontWeight: 700, letterSpacing: 1 }}>Exercise 4.2</span>{" — "}
        <span style={{ borderBottom: "1px dotted #1e3a8a55" }}>
          Dots &amp; Boxes &middot; {boxesPerSide}&times;{boxesPerSide}
        </span>
      </div>
      <div>
        <span style={{ fontWeight: 700 }}>Room:</span>{" "}
        <span style={{ borderBottom: "1px dotted #1e3a8a55" }}>{roomCode}</span>
      </div>
    </div>
  );
}

export function NotebookMarginDoodles() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {/* Compass arc — geometry doodle, bottom-left */}
      <svg
        style={{ position: "absolute", left: 10, bottom: 80, opacity: 0.50 }}
        width="36" height="36" viewBox="0 0 36 36"
      >
        {/* Compass legs */}
        <line x1="18" y1="4" x2="8" y2="32" stroke="#1a1a2e" strokeWidth="1.2" />
        <line x1="18" y1="4" x2="28" y2="32" stroke="#1a1a2e" strokeWidth="1.2" />
        {/* Arc at bottom */}
        <path d="M8 32 Q18 24 28 32" fill="none" stroke="#1e3a8a" strokeWidth="1.2" />
        {/* Hinge circle */}
        <circle cx="18" cy="4" r="2.5" fill="#1a1a2e" />
      </svg>
      {/* Math formula — right margin */}
      <div
        style={{
          position: "absolute",
          right: 14,
          top: 72,
          opacity: 0.40,
          fontSize: 15,
          color: "#1e3a8a",
          fontFamily: "'Caveat','Patrick Hand',cursive",
          transform: "rotate(2deg)",
          lineHeight: 1.5,
          userSelect: "none",
        }}
      >
        a²+b²=c²<br />
        Σn(n+1)<br />
        √2 ≈ 1.41
      </div>
      {/* Right-angled triangle doodle — left margin near top */}
      <svg
        style={{ position: "absolute", left: 18, top: 108, opacity: 0.48 }}
        width="36" height="32" viewBox="0 0 36 32"
      >
        <polygon points="4,28 4,4 32,28" fill="none" stroke="#7f1d1d" strokeWidth="1.4" />
        {/* Right-angle mark */}
        <path d="M4 22 L10 22 L10 28" fill="none" stroke="#7f1d1d" strokeWidth="1" />
        {/* labels */}
        <text x="17" y="13" fontSize="9" fill="#7f1d1d" fontFamily="'Caveat',cursive">c</text>
        <text x="1" y="18" fontSize="9" fill="#7f1d1d" fontFamily="'Caveat',cursive">a</text>
        <text x="15" y="31" fontSize="9" fill="#7f1d1d" fontFamily="'Caveat',cursive">b</text>
      </svg>
      {/* Sticky note — bottom-right */}
      <div
        style={{
          position: "absolute",
          right: 14,
          bottom: 56,
          width: 56,
          height: 52,
          background: "#fef08a",
          boxShadow: "2px 2px 4px rgba(0,0,0,0.18)",
          transform: "rotate(4deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          color: "#1a1a2e",
          fontFamily: "'Caveat','Patrick Hand',cursive",
          opacity: 0.75,
          userSelect: "none",
          textAlign: "center",
          lineHeight: 1.3,
          padding: 4,
        }}
      >
        Don't forget HW!
      </div>
    </div>
  );
}

/* ─────────────────────────── Candidate line (tap target) ─────────────────────────── */

function CandidateLine({
  horizontal,
  left,
  top,
  length,
  canPlay,
  onClick,
  selfPenColor,
}: {
  horizontal: boolean;
  left: number;
  top: number;
  length: number;
  canPlay: boolean;
  onClick: () => void;
  selfPenColor?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      disabled={!canPlay}
      style={{
        position: "absolute",
        left,
        top,
        width: horizontal ? length : 20,
        height: horizontal ? 20 : length,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: canPlay ? "pointer" : "default",
      }}
      aria-label={horizontal ? "Draw horizontal line" : "Draw vertical line"}
    >
      {/* Preview stroke — only when hovering AND it's our turn */}
      {hover && canPlay && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            margin: "auto",
            width: horizontal ? length : 3,
            height: horizontal ? 3 : length,
            background: selfPenColor ?? "#3b3a36",
            opacity: 0.45,
            borderRadius: 2,
          }}
          aria-hidden
        />
      )}
    </button>
  );
}

/* ─────────────────────────── Notebook board (dots / lines / boxes / tap targets) ─────────────────────────── */

/**
 * The play surface itself: drawn strokes, claimed boxes, the dot grid, and
 * the invisible tap targets over every empty edge. Shared by both shells —
 * the ONLY thing that differs per tier is `cellPx` (mobile keeps the
 * compact 64/48/38, desktop scales it up).
 *
 * Pulled out of the shell on purpose: nothing here depends on the turn
 * countdown, so the live clock (see {@link TurnTimer}) can tick without
 * re-rendering this geometry.
 */
export function NotebookBoard({
  state,
  cellPx,
  penOf,
  initialOf,
  drawnH,
  drawnV,
  canPlay,
  selfPenColor,
  onDraw,
}: {
  state: DotsBoxesPublicState;
  cellPx: number;
  penOf: Record<string, Pen>;
  initialOf: (id: string) => string;
  drawnH: Set<string>;
  drawnV: Set<string>;
  canPlay: boolean;
  selfPenColor?: string;
  onDraw: (kind: "h" | "v", r: number, c: number) => void;
}) {
  const size = state.options.boardSize;
  const totalPx = (size - 1) * cellPx + DOT_PX;

  // The dot grid never changes between real state updates — only when the
  // board size or cell scale changes. Memoise it so it isn't rebuilt on
  // every render of the surrounding shell.
  const dots = useMemo(() => {
    const out: ReactNode[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        out.push(
          <div
            key={`dot-${r}-${c}`}
            style={{
              position: "absolute",
              left: c * cellPx,
              top: r * cellPx,
              width: DOT_PX,
              height: DOT_PX,
              borderRadius: "50%",
              background: "#2a221a",
              boxShadow: "0 0.5px 0 rgba(0,0,0,0.35), 0 0 0 0.5px rgba(0,0,0,0.15)",
              pointerEvents: "none",
            }}
          />,
        );
      }
    }
    return out;
  }, [size, cellPx]);

  return (
    <div className="relative" style={{ width: totalPx, height: totalPx }}>
      {/* Drawn LINES — pencil/ink strokes, render under dots */}
      {state.hLines.map((l) => {
        const pen = penOf[l.playerId];
        const x = l.c * cellPx + DOT_PX / 2;
        const y = l.r * cellPx + DOT_PX / 2;
        const w = cellPx - DOT_PX;
        return (
          <motion.div
            key={`h-${l.r}-${l.c}-${l.playerId}`}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: x + DOT_PX / 2 - 1,
              top: y - LINE_THICK / 2 + DOT_PX / 2,
              width: w + 2,
              height: LINE_THICK,
              background: pen?.color ?? "#3b3a36",
              boxShadow: pen?.shadow,
              borderRadius: 2,
              transformOrigin: "left center",
            }}
          />
        );
      })}
      {state.vLines.map((l) => {
        const pen = penOf[l.playerId];
        const x = l.c * cellPx + DOT_PX / 2;
        const y = l.r * cellPx + DOT_PX / 2;
        const h = cellPx - DOT_PX;
        return (
          <motion.div
            key={`v-${l.r}-${l.c}-${l.playerId}`}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: x - LINE_THICK / 2 + DOT_PX / 2,
              top: y + DOT_PX / 2 - 1,
              width: LINE_THICK,
              height: h + 2,
              background: pen?.color ?? "#3b3a36",
              boxShadow: pen?.shadow,
              borderRadius: 2,
              transformOrigin: "top center",
            }}
          />
        );
      })}

      {/* Claimed BOXES — initial of the claimer, in their pen */}
      {state.claims.map((cl) => {
        const pen = penOf[cl.ownerId];
        const x = cl.c * cellPx + DOT_PX;
        const y = cl.r * cellPx + DOT_PX;
        const w = cellPx - DOT_PX;
        const h = cellPx - DOT_PX;
        return (
          <motion.div
            key={`box-${cl.r}-${cl.c}`}
            initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: ((cl.r * 7 + cl.c * 13) % 7 - 3) * 0.8 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: w,
              height: h,
              background: pen?.softColor ?? "rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Caveat', 'Patrick Hand', cursive",
              fontSize: cellPx * 0.72,
              color: pen?.color,
              fontWeight: 700,
              textShadow: pen?.shadow,
              pointerEvents: "none",
            }}
          >
            {initialOf(cl.ownerId)}
          </motion.div>
        );
      })}

      {/* DOTS — small graphite circles, rendered above lines */}
      {dots}

      {/* TAP TARGETS for undrawn lines — generous hit areas centred
          over each empty edge. Stay clickable only on your turn. */}
      {/* Horizontal candidates: (r in 0..size-1) × (c in 0..size-2) */}
      {Array.from({ length: size }).map((_, r) =>
        Array.from({ length: size - 1 }).map((_, c) => {
          const key = `${r},${c}`;
          if (drawnH.has(key)) return null;
          const x = c * cellPx + DOT_PX / 2;
          const y = r * cellPx + DOT_PX / 2;
          const w = cellPx - DOT_PX;
          return (
            <CandidateLine
              key={`hh-${r}-${c}`}
              horizontal
              left={x + DOT_PX / 2}
              top={y - 10 + DOT_PX / 2}
              length={w}
              canPlay={canPlay}
              onClick={() => onDraw("h", r, c)}
              selfPenColor={selfPenColor}
            />
          );
        }),
      )}
      {/* Vertical candidates: (r in 0..size-2) × (c in 0..size-1) */}
      {Array.from({ length: size - 1 }).map((_, r) =>
        Array.from({ length: size }).map((_, c) => {
          const key = `${r},${c}`;
          if (drawnV.has(key)) return null;
          const x = c * cellPx + DOT_PX / 2;
          const y = r * cellPx + DOT_PX / 2;
          const h = cellPx - DOT_PX;
          return (
            <CandidateLine
              key={`vv-${r}-${c}`}
              horizontal={false}
              left={x - 10 + DOT_PX / 2}
              top={y + DOT_PX / 2}
              length={h}
              canPlay={canPlay}
              onClick={() => onDraw("v", r, c)}
              selfPenColor={selfPenColor}
            />
          );
        }),
      )}
    </div>
  );
}

/* ─────────────────────────── Turn timer (isolated clock) ─────────────────────────── */

/**
 * The live turn countdown chip. It owns its own 250ms tick via the shared
 * {@link useTurnSecondsLeft} hook, so only THIS leaf re-renders four times
 * a second — the board geometry and score chips stay put between real
 * state updates. (The previous single-board version held `now` at the top
 * of the component, re-rendering the entire board on every tick.)
 */
function TurnTimer({ state }: { state: DotsBoxesPublicState }) {
  const remainingSec = useTurnSecondsLeft(state.turnDeadline);
  // Match the original guard exactly: show only while playing with a live
  // deadline (turnDeadline truthy).
  if (state.phase !== "playing" || !state.turnDeadline) return null;
  return (
    <div
      className="rounded-full px-4 py-1.5 font-black"
      style={{
        background: remainingSec <= 5 ? "rgba(220,38,38,0.18)" : "rgba(30,58,138,0.12)",
        color: remainingSec <= 5 ? "#7f1d1d" : "#1e3a8a",
        border: `1.5px solid ${remainingSec <= 5 ? "#7f1d1d" : "#1e3a8a"}`,
        fontFamily: "'Caveat', 'Patrick Hand', cursive",
        fontSize: 22,
        minWidth: 90,
        textAlign: "center",
      }}
    >
      ⏱ {remainingSec}s
    </div>
  );
}

/* ─────────────────────────── Score bar ─────────────────────────── */

export function ScoreBar({
  state,
  penOf,
  nameOf,
  selfId,
  vertical = false,
}: {
  state: DotsBoxesPublicState;
  penOf: Record<string, Pen>;
  nameOf: (id: string) => string;
  selfId: string | null;
  /** Desktop side-rail mode: stack the player chips in a column. */
  vertical?: boolean;
}) {
  return (
    <div
      className={
        vertical
          ? "flex flex-col items-stretch gap-2 px-2"
          : "flex flex-wrap items-center gap-1.5 px-2"
      }
    >
      {state.playerOrder.map((pid) => {
        const pen = penOf[pid];
        const isTurn = state.turnPlayerId === pid;
        const me = pid === selfId;
        return (
          <div
            key={pid}
            className="rounded-md transition"
            style={{
              background: isTurn ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.6)",
              border: isTurn ? `2px solid ${pen.color}` : "1px solid rgba(40,70,140,0.28)",
              boxShadow: isTurn ? `0 0 0 2px ${pen.color}22 inset` : undefined,
              fontFamily: "'Caveat', 'Patrick Hand', cursive",
              // vertical (desktop rail): wider cards; horizontal (mobile): compact chips
              ...(vertical
                ? { padding: "6px 12px", minWidth: 130 }
                : { padding: "3px 8px", minWidth: 110 }),
            }}
          >
            {vertical ? (
              /* ── Desktop: two-line layout ── */
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-black" style={{ color: pen.color, fontSize: 22 }}>
                    {nameOf(pid)}{me ? " (you)" : ""}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span style={{ fontSize: 14, color: "#6b5b48" }}>{pen.name}</span>
                  <span className="font-black" style={{ color: pen.color, fontSize: 28, lineHeight: 1 }}>
                    {state.scores[pid] ?? 0}
                  </span>
                </div>
              </>
            ) : (
              /* ── Mobile: compact single-row chip ── */
              <div className="flex items-center justify-between gap-2">
                <div style={{ minWidth: 0 }}>
                  <div className="font-black truncate" style={{ color: pen.color, fontSize: 15, lineHeight: 1.2 }}>
                    {nameOf(pid)}{me ? " (you)" : ""}
                  </div>
                  <div style={{ fontSize: 10, color: "#6b5b48", lineHeight: 1 }}>{pen.name}</div>
                </div>
                <span className="font-black flex-shrink-0" style={{ color: pen.color, fontSize: 20, lineHeight: 1 }}>
                  {state.scores[pid] ?? 0}
                </span>
              </div>
            )}
          </div>
        );
      })}
      {!vertical && <div className="flex-1" />}
      <TurnTimer state={state} />
    </div>
  );
}

/* ─────────────────────────── End-of-game report card ─────────────────────────── */

export function ReportCardOverlay({
  state,
  nameOf,
  penOf,
  initialOf,
  onClose,
}: {
  state: DotsBoxesPublicState;
  nameOf: (id: string) => string;
  penOf: Record<string, Pen>;
  initialOf: (id: string) => string;
  onClose: () => void;
}) {
  const standings = state.playerOrder
    .map((pid) => ({ pid, score: state.scores[pid] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const totalBoxes = state.claims.length;
  const champ = state.winnerId;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Dots & Boxes results"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, rotate: -1.5 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-md w-full rounded-md overflow-hidden"
        style={{
          // Solid base color so the board underneath doesn't bleed
          // through. `background` shorthand was setting backgroundColor
          // OK here but being explicit makes the intent clear.
          backgroundColor: "#f9f6ef",
          backgroundImage: [
            "linear-gradient(to bottom, transparent 27px, rgba(37,99,235,0.18) 27px, rgba(37,99,235,0.18) 28px, transparent 28px)",
          ].join(", "),
          backgroundSize: "100% 28px",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)",
          padding: "20px 22px 18px",
          fontFamily: "'Caveat', 'Patrick Hand', cursive",
        }}
      >
        {/* Close button — backdrop click also closes. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close results"
          className="absolute right-2 top-2 rounded-full transition active:translate-y-px"
          style={{
            width: 30,
            height: 30,
            background: "rgba(30,58,138,0.10)",
            border: "1px solid rgba(30,58,138,0.35)",
            color: "#1e3a8a",
            fontFamily: "'Caveat', cursive",
            fontSize: 20,
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          ×
        </button>
        <div
          className="text-center mb-2"
          style={{
            fontSize: 28,
            color: "#1a1a2e",
            borderBottom: "2px solid #1e3a8a",
            paddingBottom: 4,
          }}
        >
          📝 Dots &amp; Boxes — Results
        </div>
        <div className="text-center mb-3" style={{ fontSize: 20, color: "#1e3a8a" }}>
          {champ ? (
            <>Champion: <span style={{ color: penOf[champ]?.color, fontWeight: 800 }}>{nameOf(champ)}</span></>
          ) : (
            <>It's a tie!</>
          )}
        </div>

        <div className="flex justify-center mb-3" style={{ fontSize: 18, color: "#5a4a3a" }}>
          {totalBoxes} boxes closed across {state.moveCount} lines drawn
        </div>

        <ol className="space-y-1 mt-1">
          {standings.map((s, i) => {
            const pen = penOf[s.pid];
            return (
              <li
                key={s.pid}
                className="flex items-center justify-between rounded px-2 py-1"
                style={{
                  fontSize: 22,
                  background: pen?.softColor,
                  border: `1px solid ${pen?.color ?? "#3b3a36"}33`,
                }}
              >
                <span className="flex items-center gap-2">
                  <span style={{ color: "#7a6651", marginRight: 4 }}>{i + 1}.</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: pen?.color,
                      color: "#fbf3df",
                      fontFamily: "'Caveat', cursive",
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {initialOf(s.pid)}
                  </span>
                  <span style={{ color: pen?.color, fontWeight: 700 }}>{nameOf(s.pid)}</span>
                </span>
                <span style={{ color: pen?.color, fontWeight: 800 }}>{s.score}</span>
              </li>
            );
          })}
        </ol>

        <div
          className="mt-4 text-right"
          style={{
            fontSize: 22,
            color: "#1e3a8a",
            transform: "rotate(-3deg)",
            borderBottom: "1px solid #1e3a8a66",
            paddingBottom: 2,
            display: "inline-block",
            float: "right",
          }}
        >
          ✓ Well Done!
        </div>
        <div style={{ clear: "both" }} />
      </motion.div>
    </div>
  );
}
