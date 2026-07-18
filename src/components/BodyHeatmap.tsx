"use client";

import { Muscle } from "@/lib/recomp-domain";

type MuscleScores = Partial<Record<Muscle, number>>;

const COLORS = {
  idle: "#d9ddd9",
  outline: "#717871",
  low: "#a9d6bd",
  medium: "#3bbf73",
  high: "#ff6b4a",
};

function muscleColor(score = 0) {
  if (score >= 6) return COLORS.high;
  if (score >= 3) return COLORS.medium;
  if (score > 0) return COLORS.low;
  return COLORS.idle;
}

function Region({
  d,
  muscle,
  scores,
}: {
  d: string;
  muscle: Muscle;
  scores: MuscleScores;
}) {
  const score = scores[muscle] ?? 0;
  return (
    <path
      d={d}
      fill={muscleColor(score)}
      stroke="rgba(20, 30, 24, 0.28)"
      strokeWidth="0.7"
    >
      <title>{`${muscle}: ${score} working sets`}</title>
    </path>
  );
}

function FrontBody({ scores }: { scores: MuscleScores }) {
  return (
    <svg viewBox="0 0 160 330" role="img" aria-label="Front muscle heat map">
      <g transform="translate(20 4)">
        <circle cx="60" cy="28" r="20" fill={COLORS.idle} stroke={COLORS.outline} strokeWidth="1.5" />
        <path d="M48 47 L44 59 L76 59 L72 47 Z" fill={COLORS.idle} stroke={COLORS.outline} strokeWidth="1.2" />

        <Region d="M44 59 C33 60 24 68 22 83 L37 91 L47 75 L60 81 L60 60 Z" muscle="shoulders" scores={scores} />
        <Region d="M76 59 C87 60 96 68 98 83 L83 91 L73 75 L60 81 L60 60 Z" muscle="shoulders" scores={scores} />
        <Region d="M47 75 C49 69 54 66 60 66 C66 66 71 69 73 75 L70 101 L60 106 L50 101 Z" muscle="chest" scores={scores} />

        <Region d="M22 83 C16 104 13 128 17 148 L30 146 L34 113 L37 91 Z" muscle="biceps" scores={scores} />
        <Region d="M98 83 C104 104 107 128 103 148 L90 146 L86 113 L83 91 Z" muscle="biceps" scores={scores} />
        <Region d="M17 148 C14 164 13 181 16 194 L27 194 L30 146 Z" muscle="triceps" scores={scores} />
        <Region d="M103 148 C106 164 107 181 104 194 L93 194 L90 146 Z" muscle="triceps" scores={scores} />

        <Region d="M50 101 L60 106 L70 101 L73 142 L67 166 L53 166 L47 142 Z" muscle="core" scores={scores} />
        <path d="M47 142 L53 166 L43 184 L35 159 L37 113 Z" fill={COLORS.idle} stroke={COLORS.outline} strokeWidth="1.2" />
        <path d="M73 142 L67 166 L77 184 L85 159 L83 113 Z" fill={COLORS.idle} stroke={COLORS.outline} strokeWidth="1.2" />

        <Region d="M43 184 C37 207 36 238 41 263 L57 260 L60 185 Z" muscle="quads" scores={scores} />
        <Region d="M77 184 C83 207 84 238 79 263 L63 260 L60 185 Z" muscle="quads" scores={scores} />
        <Region d="M41 263 C38 281 39 302 44 318 L56 318 L57 260 Z" muscle="calves" scores={scores} />
        <Region d="M79 263 C82 281 81 302 76 318 L64 318 L63 260 Z" muscle="calves" scores={scores} />
      </g>
    </svg>
  );
}

function BackBody({ scores }: { scores: MuscleScores }) {
  return (
    <svg viewBox="0 0 160 330" role="img" aria-label="Back muscle heat map">
      <g transform="translate(20 4)">
        <circle cx="60" cy="28" r="20" fill={COLORS.idle} stroke={COLORS.outline} strokeWidth="1.5" />
        <path d="M48 47 L44 59 L76 59 L72 47 Z" fill={COLORS.idle} stroke={COLORS.outline} strokeWidth="1.2" />

        <Region d="M44 59 C33 60 24 68 22 83 L37 91 L48 76 L60 82 L60 60 Z" muscle="shoulders" scores={scores} />
        <Region d="M76 59 C87 60 96 68 98 83 L83 91 L72 76 L60 82 L60 60 Z" muscle="shoulders" scores={scores} />
        <Region d="M48 76 L60 82 L72 76 L83 112 L75 151 L60 166 L45 151 L37 112 Z" muscle="back" scores={scores} />

        <Region d="M22 83 C16 104 13 128 17 148 L30 146 L34 113 L37 91 Z" muscle="triceps" scores={scores} />
        <Region d="M98 83 C104 104 107 128 103 148 L90 146 L86 113 L83 91 Z" muscle="triceps" scores={scores} />
        <path d="M17 148 C14 164 13 181 16 194 L27 194 L30 146 Z" fill={COLORS.idle} stroke={COLORS.outline} strokeWidth="1.2" />
        <path d="M103 148 C106 164 107 181 104 194 L93 194 L90 146 Z" fill={COLORS.idle} stroke={COLORS.outline} strokeWidth="1.2" />

        <Region d="M45 151 L60 166 L75 151 L78 183 L60 198 L42 183 Z" muscle="glutes" scores={scores} />
        <Region d="M42 183 C37 209 36 237 41 263 L57 260 L60 198 Z" muscle="hamstrings" scores={scores} />
        <Region d="M78 183 C83 209 84 237 79 263 L63 260 L60 198 Z" muscle="hamstrings" scores={scores} />
        <Region d="M41 263 C38 281 39 302 44 318 L56 318 L57 260 Z" muscle="calves" scores={scores} />
        <Region d="M79 263 C82 281 81 302 76 318 L64 318 L63 260 Z" muscle="calves" scores={scores} />
      </g>
    </svg>
  );
}

export function BodyHeatmap({
  scores,
  compact = false,
}: {
  scores: MuscleScores;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "heatmap heatmap-compact" : "heatmap"}>
      <div className="heatmap-figures">
        <div>
          <FrontBody scores={scores} />
          <span>Front</span>
        </div>
        <div>
          <BackBody scores={scores} />
          <span>Back</span>
        </div>
      </div>
      <div className="heatmap-legend" aria-label="Muscle load legend">
        <span><i style={{ background: COLORS.idle }} />Rested</span>
        <span><i style={{ background: COLORS.low }} />Light</span>
        <span><i style={{ background: COLORS.medium }} />Worked</span>
        <span><i style={{ background: COLORS.high }} />High</span>
      </div>
    </div>
  );
}
