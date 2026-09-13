import { useState } from "react";
import type { HcSkin } from "../games/handcricket/hc-skin";
import { Hc3DStage } from "../games/handcricket/animations3d/Hc3DStage";
import { HcCrackersFlowerBlast } from "../games/handcricket/animations3d/scorecard/HcCrackersFlowerBlast";
import { HcRunnerCheerUp } from "../games/handcricket/animations3d/scorecard/HcRunnerCheerUp";

// Broadcast
import { Broadcast3DDuck } from "../games/handcricket/animations3d/themes/broadcast/Broadcast3DDuck";
import { Broadcast3DMilestone } from "../games/handcricket/animations3d/themes/broadcast/Broadcast3DMilestone";
import { Broadcast3DSix } from "../games/handcricket/animations3d/themes/broadcast/Broadcast3DSix";
import { Broadcast3DFour } from "../games/handcricket/animations3d/themes/broadcast/Broadcast3DFour";
import { Broadcast3DBowled } from "../games/handcricket/animations3d/themes/broadcast/Broadcast3DBowled";
import { Broadcast3DHattrick } from "../games/handcricket/animations3d/themes/broadcast/Broadcast3DHattrick";

// Cricbuzz
import { Cricbuzz3DDuck } from "../games/handcricket/animations3d/themes/cricbuzz/Cricbuzz3DDuck";
import { Cricbuzz3DMilestone } from "../games/handcricket/animations3d/themes/cricbuzz/Cricbuzz3DMilestone";
import { Cricbuzz3DSix } from "../games/handcricket/animations3d/themes/cricbuzz/Cricbuzz3DSix";
import { Cricbuzz3DFour } from "../games/handcricket/animations3d/themes/cricbuzz/Cricbuzz3DFour";
import { Cricbuzz3DBowled } from "../games/handcricket/animations3d/themes/cricbuzz/Cricbuzz3DBowled";
import { Cricbuzz3DHattrick } from "../games/handcricket/animations3d/themes/cricbuzz/Cricbuzz3DHattrick";

// Doordarshan
import { Doordarshan3DDuck } from "../games/handcricket/animations3d/themes/doordarshan/Doordarshan3DDuck";
import { Doordarshan3DMilestone } from "../games/handcricket/animations3d/themes/doordarshan/Doordarshan3DMilestone";
import { Doordarshan3DSix } from "../games/handcricket/animations3d/themes/doordarshan/Doordarshan3DSix";
import { Doordarshan3DFour } from "../games/handcricket/animations3d/themes/doordarshan/Doordarshan3DFour";
import { Doordarshan3DBowled } from "../games/handcricket/animations3d/themes/doordarshan/Doordarshan3DBowled";
import { Doordarshan3DHattrick } from "../games/handcricket/animations3d/themes/doordarshan/Doordarshan3DHattrick";

// Nostalgia
import { Nostalgia3DDuck } from "../games/handcricket/animations3d/themes/nostalgia/Nostalgia3DDuck";
import { Nostalgia3DMilestone } from "../games/handcricket/animations3d/themes/nostalgia/Nostalgia3DMilestone";
import { Nostalgia3DSix } from "../games/handcricket/animations3d/themes/nostalgia/Nostalgia3DSix";
import { Nostalgia3DFour } from "../games/handcricket/animations3d/themes/nostalgia/Nostalgia3DFour";
import { Nostalgia3DBowled } from "../games/handcricket/animations3d/themes/nostalgia/Nostalgia3DBowled";
import { Nostalgia3DHattrick } from "../games/handcricket/animations3d/themes/nostalgia/Nostalgia3DHattrick";

export default function PreviewAnimations3D() {
  const [activeSkin, setActiveSkin] = useState<HcSkin>("broadcast");
  const [activeFX, setActiveFX] = useState<
    | "winnerCrackers"
    | "runnerCheer"
    | "duck"
    | "milestone50"
    | "milestone100"
    | "six"
    | "four"
    | "bowled"
    | "hattrick"
    | null
  >(null);

  const renderActiveAnimation = () => {
    if (!activeFX) return null;

    if (activeFX === "winnerCrackers") {
      return <HcCrackersFlowerBlast skin={activeSkin} onComplete={() => setActiveFX(null)} />;
    }

    if (activeFX === "runnerCheer") {
      return <HcRunnerCheerUp skin={activeSkin} runnerName="Kohli" onComplete={() => setActiveFX(null)} />;
    }

    const glow =
      activeFX === "bowled" || activeFX === "duck"
        ? "red"
        : activeSkin === "cricbuzz"
        ? "emerald"
        : activeSkin === "nostalgia"
        ? "blue"
        : "gold";

    return (
      <Hc3DStage skin={activeSkin} onDismiss={() => setActiveFX(null)} ambientGlow={glow}>
        {activeSkin === "broadcast" && (
          <>
            {activeFX === "duck" && <Broadcast3DDuck batter="Rohit Sharma" duckType="golden" balls={1} />}
            {activeFX === "milestone50" && <Broadcast3DMilestone batter="Virat Kohli" runs={50} balls={24} fours={5} sixes={3} />}
            {activeFX === "milestone100" && <Broadcast3DMilestone batter="Virat Kohli" runs={100} balls={48} fours={9} sixes={6} />}
            {activeFX === "six" && <Broadcast3DSix batter="Hardik Pandya" message="Deposited onto the stadium roof!" />}
            {activeFX === "four" && <Broadcast3DFour batter="Shubman Gill" message="Classy cover drive races to the fence!" />}
            {activeFX === "bowled" && <Broadcast3DBowled batter="Steve Smith" bowler="Jasprit Bumrah" isYorker={true} message="Toe-crushing yorker flattens the stumps!" />}
            {activeFX === "hattrick" && <Broadcast3DHattrick bowler="Jasprit Bumrah" message="Three wickets in three balls!" />}
          </>
        )}

        {activeSkin === "cricbuzz" && (
          <>
            {activeFX === "duck" && <Cricbuzz3DDuck batter="Rohit Sharma" duckType="golden" balls={1} />}
            {activeFX === "milestone50" && <Cricbuzz3DMilestone batter="Virat Kohli" runs={50} balls={24} fours={5} sixes={3} />}
            {activeFX === "milestone100" && <Cricbuzz3DMilestone batter="Virat Kohli" runs={100} balls={48} fours={9} sixes={6} />}
            {activeFX === "six" && <Cricbuzz3DSix batter="Hardik Pandya" message="Monster hit over deep midwicket!" />}
            {activeFX === "four" && <Cricbuzz3DFour batter="Shubman Gill" message="Precision gap-piercing boundary!" />}
            {activeFX === "bowled" && <Cricbuzz3DBowled batter="Steve Smith" bowler="Jasprit Bumrah" isYorker={true} message="Radar clocked at 145.8 km/h!" />}
            {activeFX === "hattrick" && <Cricbuzz3DHattrick bowler="Jasprit Bumrah" message="Telemetry confirmed: 3 consecutive dismissals!" />}
          </>
        )}

        {activeSkin === "doordarshan" && (
          <>
            {activeFX === "duck" && <Doordarshan3DDuck batter="कपिल देव" duckType="golden" balls={1} />}
            {activeFX === "milestone50" && <Doordarshan3DMilestone batter="सचिन तेंदुलकर" runs={50} balls={24} />}
            {activeFX === "milestone100" && <Doordarshan3DMilestone batter="सचिन तेंदुलकर" runs={100} balls={48} />}
            {activeFX === "six" && <Doordarshan3DSix batter="कपिल देव" message="गेंद सीमा रेखा के बाहर!" />}
            {activeFX === "four" && <Doordarshan3DFour batter="सुनील गावस्कर" message="सटीक टाइमिंग से चौका!" />}
            {activeFX === "bowled" && <Doordarshan3DBowled batter="इमरान खान" bowler="कपिल देव" isYorker={true} message="मिस्त्री यॉर्कर से विकेट उखड़ी!" />}
            {activeFX === "hattrick" && <Doordarshan3DHattrick bowler="चेतन शर्मा" message="विश्व कप हैट्रिक का ऐतिहासिक पल!" />}
          </>
        )}

        {activeSkin === "nostalgia" && (
          <>
            {activeFX === "duck" && <Nostalgia3DDuck batter="Rohan" duckType="golden" balls={1} />}
            {activeFX === "milestone50" && <Nostalgia3DMilestone batter="Kunal" runs={50} balls={24} fours={6} sixes={2} />}
            {activeFX === "milestone100" && <Nostalgia3DMilestone batter="Kunal" runs={100} balls={48} fours={11} sixes={5} />}
            {activeFX === "six" && <Nostalgia3DSix batter="Aman" message="Ball smashed through the classroom window!" />}
            {activeFX === "four" && <Nostalgia3DFour batter="Rahul" message="Shot rolling along the notebook margin!" />}
            {activeFX === "bowled" && <Nostalgia3DBowled batter="Sameer" bowler="Kunal" isYorker={true} message="Chalk stumps knocked flat!" />}
            {activeFX === "hattrick" && <Nostalgia3DHattrick bowler="Kunal" message="3 skull stickers stamped on notebook!" />}
          </>
        )}
      </Hc3DStage>
    );
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white p-6 flex flex-col items-center">
      <div className="max-w-3xl w-full text-center space-y-6">
        <h1 className="text-3xl font-black tracking-tight text-amber-400">
          🏏 BHALYAM Hand Cricket — 3D Animations & Scorecard FX Studio
        </h1>
        <p className="text-sm text-stone-400">
          Preview realistic 3D animations and scorecard celebrations across all 4 themes.
        </p>

        {/* Theme Selectors */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-xl bg-stone-900 border border-stone-800">
          {(["broadcast", "cricbuzz", "doordarshan", "nostalgia"] as HcSkin[]).map((s) => (
            <button
              key={s}
              id={`theme-btn-${s}`}
              onClick={() => setActiveSkin(s)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                activeSkin === s
                  ? "bg-amber-500 text-stone-950 shadow-md scale-105"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Action Trigger Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
          <button
            id="btn-winner-crackers"
            onClick={() => setActiveFX("winnerCrackers")}
            className="p-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 font-black text-xs uppercase tracking-wider text-stone-950 shadow-lg hover:brightness-110 active:scale-95 transition"
          >
            🎆 Winner Firing Crackers & Flower Blast (5s)
          </button>

          <button
            id="btn-runner-cheer"
            onClick={() => setActiveFX("runnerCheer")}
            className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-black text-xs uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition"
          >
            👏 Runner-Up Cheer-Up Card
          </button>

          <button
            id="btn-duck"
            onClick={() => setActiveFX("duck")}
            className="p-3 rounded-xl bg-stone-800 border border-rose-500/50 hover:bg-rose-950/40 text-rose-300 font-bold text-xs uppercase tracking-wider transition"
          >
            🦆 3D Duck Out Animation
          </button>

          <button
            id="btn-milestone-50"
            onClick={() => setActiveFX("milestone50")}
            className="p-3 rounded-xl bg-stone-800 border border-amber-500/50 hover:bg-amber-950/40 text-amber-300 font-bold text-xs uppercase tracking-wider transition"
          >
            🏏 3D Milestone 50 Bat-Ball Impact
          </button>

          <button
            id="btn-milestone-100"
            onClick={() => setActiveFX("milestone100")}
            className="p-3 rounded-xl bg-stone-800 border border-yellow-400 hover:bg-yellow-950/40 text-yellow-300 font-bold text-xs uppercase tracking-wider transition"
          >
            💯 3D Milestone 100 Century
          </button>

          <button
            id="btn-six"
            onClick={() => setActiveFX("six")}
            className="p-3 rounded-xl bg-stone-800 border border-orange-500/50 hover:bg-orange-950/40 text-orange-300 font-bold text-xs uppercase tracking-wider transition"
          >
            🚀 3D Maximum Six
          </button>

          <button
            id="btn-four"
            onClick={() => setActiveFX("four")}
            className="p-3 rounded-xl bg-stone-800 border border-sky-500/50 hover:bg-sky-950/40 text-sky-300 font-bold text-xs uppercase tracking-wider transition"
          >
            ⚡ 3D Boundary Four
          </button>

          <button
            id="btn-bowled"
            onClick={() => setActiveFX("bowled")}
            className="p-3 rounded-xl bg-stone-800 border border-red-500/50 hover:bg-red-950/40 text-red-300 font-bold text-xs uppercase tracking-wider transition"
          >
            🎯 3D Bowled / Zing Bails
          </button>

          <button
            id="btn-hattrick"
            onClick={() => setActiveFX("hattrick")}
            className="p-3 rounded-xl bg-stone-800 border border-purple-500/50 hover:bg-purple-950/40 text-purple-300 font-bold text-xs uppercase tracking-wider transition"
          >
            🔥 3D Hat-Trick Hero
          </button>
        </div>
      </div>

      {renderActiveAnimation()}
    </div>
  );
}
