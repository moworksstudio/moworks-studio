// The app's cast layer for the What If film style (owner #1287-#1293: MW Character Sheet v1, method A), as ricks-cast.js is Ricks Clip's: what the
// sheet standard asks for that FreshStack's rig (engine/rig.tsx Hero, MIT) does not draw, written by the app in the rig's own shapes and inks, beside
// the engine and never in it. An episode imports it as "mw:wi-cast".
//   AppHero          the rig as shipped, plus: view "back" (the same body from behind: no face, a plain jacket, the back of the head in its hair or
//                    hood) and the faces the rig lacks, "laugh", "angry" and "talk" (drawn over a face left blank, in the rig's own eye and mouth
//                    shapes, on its head's own transform); every other face is the rig's own Expr
//   STANDARD_FACES   the standard's eight faces in the rig's names (happy, surprised = shock, worried; the app's laugh, angry, talk; blink a lid)
//   POSES            stand, point, wave, reach, sit as Pose parts (limb angles, the rig's own); the walk is the engine's walkPose
//   talkFace(t)      a talking flap, the open mouth and the closed one by turns (no lip sync)
// Credit: Moworks Studio (the app's own code), on FreshStack's What If engine (MIT).
import React from "react";
import { Hero, HEAD, LEG_LEN, basePose, type Expr, type Look, type Pose } from "what-if";

export type AppFace = Expr | "laugh" | "angry" | "talk";
export const APP_FACES = ["laugh", "angry", "talk"] as const;
export const STANDARD_FACES: Record<string, AppFace> = { neutral: "neutral", happy: "happy", laugh: "laugh", surprised: "shock", worried: "worried", angry: "angry", talk: "talk", blink: "neutral" };
export const talkFace = (t: number): AppFace => (Math.floor(t * 8) % 2 ? "neutral" : "talk");

/** The standard's poses as the rig's own limb angles (a: the upper segment from hanging, b: the lower one's bend; degrees). */
export const POSES: Record<string, Partial<Pose>> = {
  stand: {},
  point: { armR: { a: 95, b: -5 }, armL: { a: 10, b: -8 }, handR: "point", look: 1 },
  wave: { armR: { a: 150, b: 35 }, armL: { a: 10, b: -8 }, expr: "happy" },
  reach: { armR: { a: 120, b: -10 }, armL: { a: 15, b: -10 } },
  // seen from the side (the clearest sit for this rig: its thighs swing in the facing direction): thighs level ahead, shins straight down
  sit: { yaw: 1, legL: { a: 86, b: -86 }, legR: { a: 82, b: -82 }, armL: { a: 30, b: -50 }, armR: { a: 36, b: -56 } },
};
/** How far a sitting body comes down: the thighs go level (the rig's THIGH, 72), the shins stay upright. */
export const SIT_DROP = 72;

const blank = (L: Look): Look => ({ ...L, face: L.skin });

/** The app's faces, drawn as the rig's Face draws: the same eye line, mouth line and ink, turned with the head (yaw). */
function AppFaceArt({ face, ink, yaw }: { face: "laugh" | "angry" | "talk"; ink: string; yaw: number }) {
  const ay = Math.min(1, Math.abs(yaw)), eyeY = HEAD.y - 4, mY = HEAD.y + 28, far = ay > 0.72 ? (yaw > 0 ? -1 : 1) : 0;
  const eye = (cx: number) => {
    if (far && Math.sign(cx) === far) return null;
    if (face === "laugh") return <path d={`M ${cx - 11} ${eyeY + 4} Q ${cx} ${eyeY - 10} ${cx + 11} ${eyeY + 4}`} stroke={ink} strokeWidth={6.5} fill="none" strokeLinecap="round" />;
    return <ellipse cx={cx} cy={eyeY + (face === "angry" ? 3 : 0)} rx={7} ry={face === "angry" ? 7.5 : 10} fill={ink} />;
  };
  return (
    <g transform={`translate(${yaw * 30} 0) scale(${1 - 0.28 * ay} 1)`}>
      {eye(-21)}
      {eye(21)}
      {face === "angry" ? <path d={`M -34 ${eyeY - 26} L -11 ${eyeY - 14} M 11 ${eyeY - 14} L 34 ${eyeY - 26}`} stroke={ink} strokeWidth={6} fill="none" strokeLinecap="round" /> : null}
      {face === "laugh" ? <path d={`M -32 ${eyeY - 24} Q -21 ${eyeY - 32} -10 ${eyeY - 25} M 10 ${eyeY - 25} Q 21 ${eyeY - 32} 32 ${eyeY - 24}`} stroke={ink} strokeWidth={5} fill="none" strokeLinecap="round" /> : null}
      {face === "laugh" ? (
        <g>
          <path d={`M -24 ${mY - 8} L 24 ${mY - 8} Q 22 ${mY + 26} 0 ${mY + 26} Q -22 ${mY + 26} -24 ${mY - 8} Z`} fill={ink} />
          <path d={`M -12 ${mY + 18} Q 0 ${mY + 8} 12 ${mY + 18} Q 0 ${mY + 26} -12 ${mY + 18} Z`} fill="#E06A5A" />
        </g>
      ) : face === "angry" ? (
        <path d={`M -15 ${mY + 8} Q 0 ${mY - 6} 15 ${mY + 8}`} stroke={ink} strokeWidth={5.5} fill="none" strokeLinecap="round" />
      ) : (
        <ellipse cx={0} cy={mY + 4} rx={11} ry={9} fill={ink} />
      )}
    </g>
  );
}

/** The back of the body over the rig drawn face-on: a plain jacket (no front opening, shirt, tie or drawstrings), the head covered by its hair or
 *  its hood from behind; the limbs stay the rig's. */
function BackArt({ L, pose }: { L: Look; pose: Pose }) {
  const torso = "M -46 -112 Q 0 -124 46 -112 L 40 2 Q 0 12 -40 2 Z";
  const cover = L.extra === "hood" ? L.jacket : L.hair;
  return (
    <g>
      <g transform={`rotate(${pose.tilt})`}>
        <path d={torso} fill={L.jacket} stroke={L.line} strokeWidth={4} strokeLinejoin="round" />
        <path d="M -40 -40 Q 0 -30 40 -40" stroke={L.jacketShade} strokeWidth={5} fill="none" opacity={0.6} />
      </g>
      <g transform={`rotate(${pose.tilt}) rotate(${pose.headTilt} 0 ${HEAD.y + 40})`}>
        <circle cx={HEAD.x} cy={HEAD.y} r={HEAD.r} fill={cover} stroke={L.line} strokeWidth={4} />
        {L.extra === "hood" ? null : <path d={`M -40 ${HEAD.y + 40} Q 0 ${HEAD.y + 62} 40 ${HEAD.y + 40} A ${HEAD.r} ${HEAD.r} 0 0 1 -40 ${HEAD.y + 40} Z`} fill={L.skin} stroke={L.line} strokeWidth={3} />}
        {L.extra === "hood" ? null : <circle cx={-HEAD.r + 2} cy={HEAD.y + 4} r={9} fill={L.skin} stroke={L.line} strokeWidth={3} />}
        {L.extra === "hood" ? null : <circle cx={HEAD.r - 2} cy={HEAD.y + 4} r={9} fill={L.skin} stroke={L.line} strokeWidth={3} />}
      </g>
    </g>
  );
}

/** The rig, with the app's back view and faces where asked. view: "front" | "back" (any yaw is the rig's own turn). */
export function AppHero({ look, pose, face, view = "front", shadow = 1, rimId = "rimR" }: { look: Look; pose: Pose; face?: AppFace; view?: "front" | "back"; shadow?: number; rimId?: string }) {
  const f = face ?? pose.expr, app = (APP_FACES as readonly string[]).includes(f as string) || view === "back";
  const p: Pose = { ...pose, expr: app ? "neutral" : (f as Expr), yaw: view === "back" ? 0 : pose.yaw, glasses: view === "back" ? 0 : pose.glasses };
  return (
    <g>
      <Hero look={app ? blank(look) : look} pose={p} shadow={shadow} rimId={rimId} />
      {app ? (
        <g transform={`translate(${p.x} ${p.y}) scale(${p.scale}) rotate(${p.spin} 0 -90)`}>
          <g transform={`translate(0 ${LEG_LEN}) scale(${1 + 0.6 * p.squash} ${1 - p.squash}) translate(0 ${-LEG_LEN})`}>
            {view === "back" ? <BackArt L={look} pose={p} /> : (
              <g transform={`rotate(${p.tilt}) rotate(${p.headTilt} 0 ${HEAD.y + 40})`}><AppFaceArt face={f as "laugh" | "angry" | "talk"} ink={look.face} yaw={p.yaw} /></g>
            )}
          </g>
        </g>
      ) : null}
    </g>
  );
}

/** A pose of the standard on the rig's base, at a place and size. */
export const posed = (name: string, x: number, y: number, scale: number, extra: Partial<Pose> = {}): Pose => ({ ...basePose, x, y: y + (name === "sit" ? SIT_DROP * scale : 0), scale, ...(POSES[name] ?? {}), ...extra });
