"use client";

import {
  Activity,
  BarChart3,
  Bell,
  BellOff,
  Bike,
  Camera,
  Check,
  ChevronRight,
  CircleGauge,
  Dumbbell,
  Egg,
  Footprints,
  Gauge,
  ImagePlus,
  Info,
  Layers3,
  Minus,
  MoonStar,
  Plus,
  Save,
  ScanLine,
  Search,
  Sunrise,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Trash2,
  Trophy,
  Utensils,
  Weight,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { BodyHeatmap } from "@/components/BodyHeatmap";
import { BodyTwinEditor } from "@/components/BodyTwinEditor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { recognizeFoodPhoto, FoodRecognition } from "@/lib/browser-food-recognition";
import {
  ACTIVITY_TYPES,
  ActivityEntry,
  createExerciseLogs,
  createMealItem,
  DEFAULT_STORE,
  ExerciseLog,
  FOOD_LIBRARY,
  FoodDefinition,
  foodForRecognition,
  GoalSettings,
  MacroSet,
  MEAL_SCHEDULE,
  MealEntry,
  MealItem,
  MealSlot,
  mealMacros,
  Muscle,
  RecompStore,
  ROUTINES,
  RoutineDefinition,
  roundMacro,
  scaleMacros,
  SleepEntry,
  SleepQuality,
  StrengthSession,
  sumMacros,
  todayIso,
  uid,
} from "@/lib/recomp-domain";

type View = "today" | "food" | "training" | "sleep" | "progress";
type RecognitionState = "idle" | "loading" | "ready" | "error";
type MetricRange = "day" | "week" | "month" | "year";

const STORE_KEY = "recomp-v2";
const METRIC_RANGES: Array<{ id: MetricRange; label: string; days: number }> = [
  { id: "day", label: "Day", days: 1 },
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: 30 },
  { id: "year", label: "Year", days: 365 },
];

const NAV_ITEMS = [
  { id: "today" as const, label: "Today", icon: CircleGauge },
  { id: "food" as const, label: "Food", icon: Utensils },
  { id: "training" as const, label: "Training", icon: Dumbbell },
  { id: "sleep" as const, label: "Sleep", icon: MoonStar },
  { id: "progress" as const, label: "Progress", icon: BarChart3 },
];

const SLOT_COLORS: Record<MealSlot, string> = {
  Breakfast: "#f09b32",
  Lunch: "#2f9e63",
  Snack: "#6c63d9",
  Dinner: "#3176d5",
};

function formatDay(date: string, long = false) {
  return new Intl.DateTimeFormat("en", long
    ? { weekday: "long", month: "long", day: "numeric" }
    : { month: "short", day: "numeric" }
  ).format(new Date(`${date}T12:00:00`));
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function recentDates(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  });
}

function mealItemWithQuantity(item: MealItem, quantity: number): MealItem {
  const baseQuantity = item.quantity || 1;
  return {
    ...item,
    quantity,
    calories: Math.round((item.calories / baseQuantity) * quantity),
    protein: roundMacro((item.protein / baseQuantity) * quantity),
    carbs: roundMacro((item.carbs / baseQuantity) * quantity),
    fat: roundMacro((item.fat / baseQuantity) * quantity),
    fiber: roundMacro((item.fiber / baseQuantity) * quantity),
  };
}

function currentMealSlot(): MealSlot {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  if (hour < 10.5) return "Breakfast";
  if (hour < 14.5) return "Lunch";
  if (hour < 18) return "Snack";
  return "Dinner";
}

function getMuscleScores(sessions: StrengthSession[], days = 7) {
  const scores: Partial<Record<Muscle, number>> = {};
  const cutoff = recentDates(days)[0];
  const today = todayIso();

  sessions
    .filter((session) => session.date >= cutoff && session.date <= today)
    .forEach((session) => {
      session.exercises.forEach((exercise) => {
        const completed = exercise.sets.filter((set) => set.completed).length;
        exercise.primary.forEach((muscle) => {
          scores[muscle] = (scores[muscle] ?? 0) + completed;
        });
        exercise.secondary.forEach((muscle) => {
          scores[muscle] = roundMacro((scores[muscle] ?? 0) + completed * 0.5);
        });
      });
    });

  return scores;
}

function completedSets(sessions: StrengthSession[]) {
  return sessions.reduce((sessionTotal, session) =>
    sessionTotal + session.exercises.reduce((exerciseTotal, exercise) =>
      exerciseTotal + exercise.sets.filter((set) => set.completed).length, 0
    ), 0
  );
}

function strengthVolume(sessions: StrengthSession[]) {
  return sessions.reduce((sessionTotal, session) =>
    sessionTotal + session.exercises.reduce((exerciseTotal, exercise) =>
      exerciseTotal + exercise.sets
        .filter((set) => set.completed)
        .reduce((setTotal, set) => setTotal + set.reps * set.weightKg, 0), 0
    ), 0
  );
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
    notation: value >= 1_000 ? "compact" : "standard",
  }).format(value);
}

function sleepDuration(bedtime: string, wakeTime: string) {
  const [bedHour, bedMinute] = bedtime.split(":").map(Number);
  const [wakeHour, wakeMinute] = wakeTime.split(":").map(Number);
  if ([bedHour, bedMinute, wakeHour, wakeMinute].some(Number.isNaN)) return 0;
  const bed = bedHour * 60 + bedMinute;
  let wake = wakeHour * 60 + wakeMinute;
  if (wake <= bed) wake += 24 * 60;
  return clamp(wake - bed, 0, 16 * 60);
}

function formatDuration(minutes: number) {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h${remainder ? ` ${remainder}m` : ""}`;
}

function sleepQualityLabel(quality: SleepQuality) {
  return ["", "Poor", "Fair", "Good", "Great", "Excellent"][quality];
}

function averageSleep(entries: SleepEntry[]) {
  if (!entries.length) return { duration: 0, quality: 0 };
  return {
    duration: Math.round(entries.reduce((total, entry) => total + entry.durationMinutes, 0) / entries.length),
    quality: roundMacro(entries.reduce((total, entry) => total + entry.quality, 0) / entries.length),
  };
}

function weightTrend(weights: RecompStore["weights"]) {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  if (!sorted.length) return { current: null, delta: null };
  if (sorted.length < 4) {
    return {
      current: sorted.at(-1)!.weightKg,
      delta: sorted.length > 1 ? roundMacro(sorted.at(-1)!.weightKg - sorted[0].weightKg) : null,
    };
  }
  const midpoint = Math.floor(sorted.length / 2);
  const previous = sorted.slice(0, midpoint);
  const recent = sorted.slice(midpoint);
  const previousAverage = previous.reduce((total, entry) => total + entry.weightKg, 0) / previous.length;
  const recentAverage = recent.reduce((total, entry) => total + entry.weightKg, 0) / recent.length;
  return { current: roundMacro(recentAverage), delta: roundMacro(recentAverage - previousAverage) };
}

function weeklySignals(store: RecompStore) {
  const dates = recentDates(7);
  const meals = store.meals.filter((meal) => dates.includes(meal.date));
  const totals = dates.map((date) =>
    sumMacros(meals.filter((meal) => meal.date === date).map(mealMacros))
  );
  const logged = totals.filter((total) => total.calories > 0);
  const proteinDays = totals.filter((total) => total.protein >= store.goals.protein * 0.85).length;
  const targetDays = totals.filter((total) =>
    total.calories > 0 && Math.abs(total.calories - store.goals.calories) <= store.goals.calories * 0.1
  ).length;
  const sessions = store.strengthSessions.filter((session) => dates.includes(session.date));
  const activityMinutes = store.activities
    .filter((activity) => dates.includes(activity.date))
    .reduce((total, activity) => total + activity.durationMinutes, 0);
  const weighIns = store.weights.filter((entry) => dates.includes(entry.date)).length;
  const sleepEntries = store.sleepEntries.filter((entry) => dates.includes(entry.date));
  const sleepTargetMinutes = store.goals.sleepHours * 60;
  const sleepScore = sleepEntries.length
    ? sleepEntries.reduce((total, entry) => total + clamp(entry.durationMinutes / sleepTargetMinutes, 0, 1), 0) / sleepEntries.length
    : 0;
  const muscleScores = getMuscleScores(store.strengthSessions, 7);
  const muscleCoverage = Object.values(muscleScores).filter((score) => (score ?? 0) > 0).length;
  const baseMomentum =
    25 * (logged.length / 7) +
    20 * (proteinDays / 7) +
    25 * Math.min(1, sessions.length / Math.max(1, store.goals.trainingDays)) +
    15 * Math.min(1, (activityMinutes + sessions.length * 45) / 150) +
    5 * Math.min(1, weighIns / 3) +
    10 * Math.min(1, store.meals.filter((meal) => meal.date === todayIso()).length / 4);
  const momentum = Math.round(sleepEntries.length
    ? (baseMomentum + 15 * sleepScore) / 1.15
    : baseMomentum);
  return {
    activityMinutes,
    loggedDays: logged.length,
    momentum: clamp(momentum, 0, 100),
    muscleCoverage,
    proteinDays,
    sleepEntries,
    sessions,
    targetDays,
  };
}

function loadRhythm(store: RecompStore) {
  const currentDates = recentDates(7);
  const comparisonDates = recentDates(35).slice(0, 28);
  const current = completedSets(store.strengthSessions.filter((session) => currentDates.includes(session.date)));
  const previousWeekly = completedSets(
    store.strengthSessions.filter((session) => comparisonDates.includes(session.date)),
  ) / 4;
  if (!current && !previousWeekly) return { label: "Starting", value: 0 };
  const ratio = previousWeekly ? current / previousWeekly : 1;
  if (ratio > 1.35) return { label: "Surge", value: Math.min(100, Math.round(ratio * 60)) };
  if (ratio < 0.65) return { label: "Lighter", value: Math.round(ratio * 70) };
  return { label: "Steady", value: Math.min(100, Math.round(ratio * 70)) };
}

function MomentumDial({ value }: { value: number }) {
  const circumference = 251.33;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="momentum-dial" aria-label={`Recomp momentum ${value} out of 100`}>
      <svg aria-hidden="true" viewBox="0 0 96 96">
        <circle className="momentum-track" cx="48" cy="48" fill="none" r="40" strokeWidth="7" />
        <circle
          className="momentum-value"
          cx="48"
          cy="48"
          fill="none"
          r="40"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="7"
        />
      </svg>
      <span><strong>{value}</strong><small>/ 100</small></span>
    </div>
  );
}

function RecompCockpit({
  store,
  totals,
  onAction,
}: {
  store: RecompStore;
  totals: MacroSet;
  onAction: (view: View) => void;
}) {
  const signals = weeklySignals(store);
  const trend = weightTrend(store.weights);
  const lastSleep = [...store.sleepEntries].sort((a, b) => b.date.localeCompare(a.date))[0];
  const proteinLeft = Math.max(0, store.goals.protein - totals.protein);
  const caloriesLeft = Math.max(0, store.goals.calories - totals.calories);
  const hasMealToday = store.meals.some((meal) => meal.date === todayIso());
  const trainingDue = signals.sessions.length < store.goals.trainingDays;
  const next = !hasMealToday
    ? { title: "Log your first meal", detail: "A complete day makes every recommendation sharper.", view: "food" as View }
    : proteinLeft > 20
      ? { title: `Close the ${Math.round(proteinLeft)}g protein gap`, detail: `${Math.round(caloriesLeft)} kcal remain in today's budget.`, view: "food" as View }
      : trainingDue
        ? { title: "Progress one familiar lift", detail: `${signals.sessions.length} of ${store.goals.trainingDays} strength sessions logged this week.`, view: "training" as View }
        : { title: "Review the trend, not one day", detail: "Your nutrition and training inputs are ready for a useful check-in.", view: "progress" as View };

  return (
    <section className="recomp-cockpit">
      <div className="cockpit-momentum">
        <MomentumDial value={signals.momentum} />
        <div><span>Recomp momentum</span><small>7-day consistency signal</small></div>
      </div>
      <div className="cockpit-action">
        <span><Sparkles size={14} />Next best move</span>
        <h2>{next.title}</h2>
        <p>{next.detail}</p>
        <button className="text-link" onClick={() => onAction(next.view)} type="button">
          Act on this <ChevronRight size={15} />
        </button>
      </div>
      <div className="cockpit-signals">
        <div><Target size={16} /><span><strong>{signals.targetDays}/7</strong><small>target days</small></span></div>
        <div><Dumbbell size={16} /><span><strong>{signals.sessions.length}/{store.goals.trainingDays}</strong><small>strength</small></span></div>
        <div><MoonStar size={16} /><span><strong>{lastSleep ? formatDuration(lastSleep.durationMinutes) : "Log"}</strong><small>last sleep</small></span></div>
        <div><TrendingUp size={16} /><span><strong>{trend.current === null ? "—" : `${trend.current} kg`}</strong><small>trend weight</small></span></div>
      </div>
    </section>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`re-card ${className}`}>{children}</section>;
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <p>{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  disabled = false,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className="icon-button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  children,
  icon: Icon,
  onClick,
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number }>;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button className="primary-button" disabled={disabled} onClick={onClick} type={type}>
      {Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  icon: Icon,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number }>;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="secondary-button" disabled={disabled} onClick={onClick} type="button">
      {Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}

function MacroBudget({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}) {
  const progress = clamp((value / target) * 100, 0, 115);
  const remaining = Math.max(0, target - value);

  return (
    <div className="macro-budget">
      <div className="macro-budget-top">
        <span>{label}</span>
        <strong>{formatNumber(value)}<small> / {target}{unit}</small></strong>
      </div>
      <div className="progress-track">
        <i style={{ background: color, width: `${Math.min(100, progress)}%` }} />
      </div>
      <span className="macro-remaining">
        {value > target ? `${formatNumber(value - target)}${unit} over` : `${formatNumber(remaining)}${unit} left`}
      </span>
    </div>
  );
}

function MacroStrip({ totals, goals }: { totals: MacroSet; goals: GoalSettings }) {
  return (
    <div className="macro-strip">
      <MacroBudget label="Calories" value={totals.calories} target={goals.calories} unit="" color="#ff6548" />
      <MacroBudget label="Protein" value={totals.protein} target={goals.protein} unit="g" color="#24945a" />
      <MacroBudget label="Carbs" value={totals.carbs} target={goals.carbs} unit="g" color="#3578d4" />
      <MacroBudget label="Fat" value={totals.fat} target={goals.fat} unit="g" color="#d3942a" />
      <MacroBudget label="Fiber" value={totals.fiber} target={goals.fiber} unit="g" color="#6c63d9" />
    </div>
  );
}

function MealRhythm({
  meals,
  remindersEnabled,
  onToggleReminders,
  onLog,
}: {
  meals: MealEntry[];
  remindersEnabled: boolean;
  onToggleReminders: () => void;
  onLog: (slot: MealSlot) => void;
}) {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  return (
    <Card>
      <SectionHeading
        eyebrow="Meal rhythm"
        title="Stay ahead of the gaps"
        action={
          <SecondaryButton
            icon={remindersEnabled ? Bell : BellOff}
            onClick={onToggleReminders}
          >
            {remindersEnabled ? "Reminders on" : "Remind me"}
          </SecondaryButton>
        }
      />
      <div className="meal-rhythm">
        {MEAL_SCHEDULE.map((schedule) => {
          const meal = meals.find((entry) => entry.slot === schedule.slot);
          const total = meal ? mealMacros(meal) : null;
          const overdue = !meal && currentHour > schedule.hour + 1;
          const next = !meal && currentHour <= schedule.hour &&
            !MEAL_SCHEDULE.some((candidate) =>
              candidate.hour < schedule.hour &&
              candidate.hour >= currentHour &&
              !meals.some((entry) => entry.slot === candidate.slot)
            );

          return (
            <button
              className={`meal-stop ${meal ? "meal-stop-complete" : ""} ${overdue ? "meal-stop-overdue" : ""}`}
              key={schedule.slot}
              onClick={() => onLog(schedule.slot)}
              type="button"
            >
              <span className="meal-stop-dot" style={{ background: meal ? SLOT_COLORS[schedule.slot] : undefined }}>
                {meal ? <Check size={14} /> : next ? <Plus size={14} /> : null}
              </span>
              <span>
                <strong>{schedule.slot}</strong>
                <small>{meal ? `${total?.calories} kcal logged` : overdue ? "Not logged" : schedule.time}</small>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function MealList({
  meals,
  onDelete,
  emptyText = "Nothing logged yet.",
}: {
  meals: MealEntry[];
  onDelete?: (id: string) => void;
  emptyText?: string;
}) {
  if (!meals.length) {
    return <div className="empty-state"><Utensils size={20} /><span>{emptyText}</span></div>;
  }

  return (
    <div className="entry-list">
      {meals.map((meal) => {
        const totals = mealMacros(meal);
        return (
          <article className="meal-entry" key={meal.id}>
            {meal.photo ? <img alt="" src={meal.photo} /> : (
              <div className="meal-entry-icon" style={{ color: SLOT_COLORS[meal.slot] }}>
                <Egg size={18} />
              </div>
            )}
            <div className="meal-entry-copy">
              <div>
                <strong>{meal.slot}</strong>
                {meal.source === "photo" ? <span className="source-tag"><Sparkles size={11} />Photo</span> : null}
              </div>
              <p>{meal.items.map((item) => item.name).join(", ")}</p>
              <small>{totals.calories} kcal · {formatNumber(totals.protein)}g protein</small>
            </div>
            {onDelete ? (
              <IconButton label="Delete meal" onClick={() => onDelete(meal.id)}>
                <Trash2 size={16} />
              </IconButton>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function TodayView({
  store,
  totals,
  todayMeals,
  muscleScores,
  setView,
  setMealSlot,
  toggleReminders,
  deleteMeal,
}: {
  store: RecompStore;
  totals: MacroSet;
  todayMeals: MealEntry[];
  muscleScores: Partial<Record<Muscle, number>>;
  setView: (view: View) => void;
  setMealSlot: (slot: MealSlot) => void;
  toggleReminders: () => void;
  deleteMeal: (id: string) => void;
}) {
  const latestTraining = store.strengthSessions[0];
  const todayActivities = store.activities.filter((entry) => entry.date === todayIso());
  const lastSleep = [...store.sleepEntries].sort((a, b) => b.date.localeCompare(a.date))[0];

  function logSlot(slot: MealSlot) {
    setMealSlot(slot);
    setView("food");
  }

  return (
    <div className="view-stack">
      <div className="today-heading">
        <div>
          <p>{formatDay(todayIso(), true)}</p>
          <h1>Your day at a glance</h1>
        </div>
        <div className="today-actions">
          <SecondaryButton icon={Dumbbell} onClick={() => setView("training")}>Start training</SecondaryButton>
          <PrimaryButton icon={Plus} onClick={() => logSlot(currentMealSlot())}>Log food</PrimaryButton>
        </div>
      </div>

      <RecompCockpit onAction={setView} store={store} totals={totals} />
      <MacroStrip totals={totals} goals={store.goals} />

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <MealRhythm
            meals={todayMeals}
            remindersEnabled={store.remindersEnabled}
            onToggleReminders={toggleReminders}
            onLog={logSlot}
          />

          <Card>
            <SectionHeading
              eyebrow="Today's food"
              title={todayMeals.length ? `${todayMeals.length} meals logged` : "Start with your first meal"}
              action={<SecondaryButton icon={Plus} onClick={() => logSlot(currentMealSlot())}>Add</SecondaryButton>}
            />
            <MealList meals={todayMeals} onDelete={deleteMeal} />
          </Card>
        </div>

        <div className="dashboard-side">
          <Card>
            <SectionHeading eyebrow="7-day training" title="Muscles worked" />
            <BodyHeatmap profile={store.bodyProfile} scores={muscleScores} compact />
            <button className="text-link" onClick={() => setView("progress")} type="button">
              See training balance <ChevronRight size={15} />
            </button>
          </Card>

          <Card>
            <SectionHeading eyebrow="Activity" title="Latest movement" />
            {latestTraining || todayActivities.length ? (
              <div className="activity-summary">
                {latestTraining ? (
                  <div><Dumbbell size={17} /><span><strong>{latestTraining.routineName}</strong><small>{formatDay(latestTraining.date)}</small></span></div>
                ) : null}
                {todayActivities.map((entry) => (
                  <div key={entry.id}><Activity size={17} /><span><strong>{entry.type}</strong><small>{entry.durationMinutes} min · {entry.intensity}</small></span></div>
                ))}
              </div>
            ) : <div className="empty-state compact"><Activity size={18} /><span>No activity logged today.</span></div>}
          </Card>

          <Card className="today-sleep-card">
            <SectionHeading
              action={<SecondaryButton icon={Plus} onClick={() => setView("sleep")}>{lastSleep ? "Update" : "Log"}</SecondaryButton>}
              eyebrow="Recovery"
              title="Last sleep"
            />
            {lastSleep ? (
              <div className="today-sleep-summary">
                <MoonStar size={24} />
                <span><strong>{formatDuration(lastSleep.durationMinutes)}</strong><small>{lastSleep.bedtime} – {lastSleep.wakeTime}</small></span>
                <span><strong>{lastSleep.quality}/5</strong><small>{sleepQualityLabel(lastSleep.quality)}</small></span>
              </div>
            ) : (
              <button className="sleep-empty-action" onClick={() => setView("sleep")} type="button">
                <MoonStar size={20} />
                <span><strong>Add last night</strong><small>Make recovery part of today&apos;s guidance.</small></span>
                <ChevronRight size={16} />
              </button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function PhotoCapture({
  onUseSuggestion,
}: {
  onUseSuggestion: (
    food: FoodDefinition,
    photo: string,
    recognition: FoodRecognition,
  ) => void;
}) {
  const [photo, setPhoto] = useState("");
  const [state, setState] = useState<RecognitionState>("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<FoodRecognition[]>([]);
  const [error, setError] = useState("");

  async function loadFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 15_000_000) {
      setError("Choose an image smaller than 15 MB.");
      setState("error");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      setPhoto(canvas.toDataURL("image/jpeg", 0.82));
      setResults([]);
      setState("idle");
      setError("");
    } catch {
      setError("This image could not be prepared. Try a JPEG or PNG.");
      setState("error");
    }
  }

  async function analyze() {
    if (!photo) return;
    setState("loading");
    setProgress(0);
    setError("");
    try {
      const found = await recognizeFoodPhoto(photo, setProgress);
      setResults(found);
      setState("ready");
    } catch {
      setError("Local recognition could not run on this device. Add ingredients below instead.");
      setState("error");
    }
  }

  return (
    <Card className="photo-capture">
      <SectionHeading eyebrow="Private on-device beta" title="Start with a photo" />
      <div className="photo-capture-grid">
        <label className={`photo-drop ${photo ? "has-photo" : ""}`}>
          {photo ? <img alt="Meal preview" src={photo} /> : (
            <span><Camera size={26} /><strong>Take or choose a meal photo</strong><small>The image stays in this browser.</small></span>
          )}
          <input
            accept="image/*"
            capture="environment"
            onChange={(event) => void loadFile(event.target.files?.[0])}
            type="file"
          />
        </label>
        <div className="photo-capture-copy">
          <p>
            Recomp runs a Food-101 model in your browser to suggest a dish. You confirm the ingredients and amount before anything is logged.
          </p>
          {photo ? (
            <div className="photo-actions">
              <PrimaryButton disabled={state === "loading"} icon={Sparkles} onClick={() => void analyze()}>
                {state === "loading" ? progress ? `Loading ${progress}%` : "Loading model" : "Recognize meal"}
              </PrimaryButton>
              <IconButton label="Remove photo" onClick={() => { setPhoto(""); setResults([]); setState("idle"); }}>
                <X size={16} />
              </IconButton>
            </div>
          ) : null}
          {state === "loading" ? (
            <div className="model-progress"><i style={{ width: `${progress}%` }} /></div>
          ) : null}
          {error ? <p className="inline-error">{error}</p> : null}
          {results.length ? (
            <div className="recognition-results">
              {results.map((result) => {
                const food = foodForRecognition(result.label);
                return (
                  <div key={result.label}>
                    <span><strong>{result.label}</strong><small>{Math.round(result.confidence * 100)}% match</small></span>
                    {food ? (
                      <button onClick={() => onUseSuggestion(food, photo, result)} type="button">
                        Add estimate
                      </button>
                    ) : <small>Choose ingredients below</small>}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function FoodPicker({ onAdd }: { onAdd: (food: FoodDefinition) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FoodDefinition["category"] | "All">("All");
  const foods = FOOD_LIBRARY.filter((food) => {
    const matchesCategory = category === "All" || food.category === category;
    const matchesQuery = !query || `${food.name} ${food.serving}`.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <Card>
      <SectionHeading eyebrow="Food library" title="Add common foods" />
      <div className="food-filter">
        <label><Search size={16} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Search banana, eggs, rice..." value={query} /></label>
        <select onChange={(event) => setCategory(event.target.value as typeof category)} value={category}>
          {["All", "Everyday", "Protein", "Carb", "Produce", "Dish"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="food-grid">
        {foods.slice(0, 14).map((food) => (
          <button key={food.id} onClick={() => onAdd(food)} type="button">
            <span className={`food-dot food-dot-${food.category.toLowerCase()}`} />
            <span><strong>{food.name}</strong><small>{food.serving} · {food.calories} kcal</small></span>
            <Plus size={15} />
          </button>
        ))}
      </div>
    </Card>
  );
}

function CustomFoodForm({ onAdd }: { onAdd: (food: FoodDefinition) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [serving, setServing] = useState("1 serving");
  const [macros, setMacros] = useState({ calories: "", protein: "", carbs: "", fat: "", fiber: "" });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd({
      id: uid("custom-food"),
      name: name.trim(),
      serving: serving.trim() || "1 serving",
      category: "Everyday",
      calories: Number(macros.calories) || 0,
      protein: Number(macros.protein) || 0,
      carbs: Number(macros.carbs) || 0,
      fat: Number(macros.fat) || 0,
      fiber: Number(macros.fiber) || 0,
    });
    setName("");
    setMacros({ calories: "", protein: "", carbs: "", fat: "", fiber: "" });
    setOpen(false);
  }

  return (
    <div className="custom-food">
      <button className="text-link" onClick={() => setOpen((value) => !value)} type="button">
        <Plus size={15} /> Add a custom food or ingredient
      </button>
      {open ? (
        <form onSubmit={submit}>
          <input onChange={(event) => setName(event.target.value)} placeholder="Ingredient name" required value={name} />
          <input onChange={(event) => setServing(event.target.value)} placeholder="Serving" value={serving} />
          <div>
            {(["calories", "protein", "carbs", "fat", "fiber"] as const).map((key) => (
              <label key={key}><span>{key === "calories" ? "Kcal" : key}</span><input inputMode="decimal" onChange={(event) => setMacros((current) => ({ ...current, [key]: event.target.value }))} value={macros[key]} /></label>
            ))}
          </div>
          <PrimaryButton icon={Plus} type="submit">Add ingredient</PrimaryButton>
        </form>
      ) : null}
    </div>
  );
}

function MealComposer({
  slot,
  setSlot,
  items,
  setItems,
  photo,
  recognition,
  onSave,
}: {
  slot: MealSlot;
  setSlot: (slot: MealSlot) => void;
  items: MealItem[];
  setItems: React.Dispatch<React.SetStateAction<MealItem[]>>;
  photo: string;
  recognition: FoodRecognition | null;
  onSave: () => void;
}) {
  const totals = sumMacros(items);

  function changeQuantity(id: string, direction: -1 | 1) {
    setItems((current) => current.map((item) =>
      item.id === id
        ? mealItemWithQuantity(
            item,
            clamp(
              roundMacro(item.quantity + direction * (item.quantityStep ?? 0.25)),
              item.quantityStep ?? 0.25,
              10,
            ),
          )
        : item
    ));
  }

  return (
    <Card className="meal-composer">
      <SectionHeading
        eyebrow="Meal builder"
        title={items.length ? `${items.length} items ready` : "Build this meal"}
        action={items.length ? <strong className="composer-total">{totals.calories} kcal</strong> : null}
      />
      <div className="slot-control">
        {MEAL_SCHEDULE.map((item) => (
          <button className={slot === item.slot ? "active" : ""} key={item.slot} onClick={() => setSlot(item.slot)} type="button">
            {item.slot}
          </button>
        ))}
      </div>
      {items.length ? (
        <div className="composer-items">
          {items.map((item) => (
            <div key={item.id}>
              <span><strong>{item.name}</strong><small>{item.serving} · {item.calories} kcal · {formatNumber(item.protein)}g protein</small></span>
              <div className="quantity-control">
                <IconButton label={`Reduce ${item.name}`} onClick={() => changeQuantity(item.id, -1)}><Minus size={14} /></IconButton>
                <strong>{formatNumber(item.quantity)}x</strong>
                <IconButton label={`Add more ${item.name}`} onClick={() => changeQuantity(item.id, 1)}><Plus size={14} /></IconButton>
                <IconButton label={`Remove ${item.name}`} onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}><Trash2 size={14} /></IconButton>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty-state"><Plus size={19} /><span>Choose common foods or enter ingredients.</span></div>}
      {recognition ? (
        <p className="estimate-note"><Info size={14} />Photo suggestion: {recognition.label}, {Math.round(recognition.confidence * 100)}% confidence. Adjust the portion before saving.</p>
      ) : null}
      <div className="composer-summary">
        <span><strong>{totals.calories}</strong><small>kcal</small></span>
        <span><strong>{formatNumber(totals.protein)}g</strong><small>protein</small></span>
        <span><strong>{formatNumber(totals.carbs)}g</strong><small>carbs</small></span>
        <span><strong>{formatNumber(totals.fat)}g</strong><small>fat</small></span>
        <PrimaryButton disabled={!items.length} icon={Save} onClick={onSave}>Save {slot.toLowerCase()}</PrimaryButton>
      </div>
      {photo ? <span className="photo-attached"><ImagePlus size={14} />Photo attached</span> : null}
    </Card>
  );
}

function FoodView({
  meals,
  slot,
  setSlot,
  saveMeal,
  deleteMeal,
}: {
  meals: MealEntry[];
  slot: MealSlot;
  setSlot: (slot: MealSlot) => void;
  saveMeal: (slot: MealSlot, items: MealItem[], photo: string, recognition: FoodRecognition | null) => void;
  deleteMeal: (id: string) => void;
}) {
  const [items, setItems] = useState<MealItem[]>([]);
  const [photo, setPhoto] = useState("");
  const [recognition, setRecognition] = useState<FoodRecognition | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  function addFood(food: FoodDefinition) {
    setItems((current) => [...current, createMealItem(food)]);
  }

  function useSuggestion(food: FoodDefinition, image: string, result: FoodRecognition) {
    setItems((current) => [...current, createMealItem(food)]);
    setPhoto(image);
    setRecognition(result);
    window.setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  function submit() {
    if (!items.length) return;
    saveMeal(slot, items, photo, recognition);
    setItems([]);
    setPhoto("");
    setRecognition(null);
  }

  return (
    <div className="view-stack">
      <div className="view-heading">
        <div><p>Nutrition</p><h1>Log food without the spreadsheet feeling</h1></div>
      </div>
      <PhotoCapture onUseSuggestion={useSuggestion} />
      <div className="food-layout">
        <div>
          <FoodPicker onAdd={addFood} />
          <CustomFoodForm onAdd={addFood} />
        </div>
        <div ref={composerRef}>
          <MealComposer
            items={items}
            onSave={submit}
            photo={photo}
            recognition={recognition}
            setItems={setItems}
            setSlot={setSlot}
            slot={slot}
          />
        </div>
      </div>
      <Card>
        <SectionHeading eyebrow="Today" title="Meal log" />
        <MealList meals={meals} onDelete={deleteMeal} />
      </Card>
    </div>
  );
}

function SetEditor({
  logs,
  setLogs,
}: {
  logs: ExerciseLog[];
  setLogs: React.Dispatch<React.SetStateAction<ExerciseLog[]>>;
}) {
  function updateSet(exerciseId: string, setId: string, patch: Partial<ExerciseLog["sets"][number]>) {
    setLogs((current) => current.map((exercise) =>
      exercise.exerciseId === exerciseId
        ? { ...exercise, sets: exercise.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) }
        : exercise
    ));
  }

  return (
    <div className="set-editor">
      {logs.map((exercise, exerciseIndex) => (
        <article key={exercise.exerciseId}>
          <div className="exercise-title">
            <span>{exerciseIndex + 1}</span>
            <div><strong>{exercise.name}</strong><small>{exercise.primary.join(", ")}</small></div>
          </div>
          <div className="set-table">
            <div className="set-head"><span>Set</span><span>kg</span><span>Reps</span><span>Done</span></div>
            {exercise.sets.map((set, index) => (
              <div key={set.id}>
                <span>{index + 1}</span>
                <input aria-label={`${exercise.name} set ${index + 1} weight`} inputMode="decimal" onChange={(event) => updateSet(exercise.exerciseId, set.id, { weightKg: Number(event.target.value) || 0 })} value={set.weightKg || ""} />
                <input aria-label={`${exercise.name} set ${index + 1} reps`} inputMode="numeric" onChange={(event) => updateSet(exercise.exerciseId, set.id, { reps: Number(event.target.value) || 0 })} value={set.reps || ""} />
                <button aria-label={`Complete ${exercise.name} set ${index + 1}`} className={set.completed ? "set-done" : ""} onClick={() => updateSet(exercise.exerciseId, set.id, { completed: !set.completed })} type="button">
                  {set.completed ? <Check size={15} /> : null}
                </button>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function RoutinePicker({
  selected,
  setSelected,
}: {
  selected: RoutineDefinition;
  setSelected: (routine: RoutineDefinition) => void;
}) {
  return (
    <div className="routine-picker">
      {ROUTINES.map((routine) => (
        <button className={selected.id === routine.id ? "active" : ""} key={routine.id} onClick={() => setSelected(routine)} type="button">
          <span><Dumbbell size={17} /><small>{routine.duration} min</small></span>
          <strong>{routine.shortName}</strong>
          <p>{routine.focus}</p>
        </button>
      ))}
    </div>
  );
}

function ActivityForm({ onSave }: { onSave: (activity: Omit<ActivityEntry, "id" | "date">) => void }) {
  const [type, setType] = useState<ActivityEntry["type"]>("Running");
  const [duration, setDuration] = useState("30");
  const [distance, setDistance] = useState("");
  const [intensity, setIntensity] = useState<ActivityEntry["intensity"]>("Moderate");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      type,
      durationMinutes: Number(duration) || 0,
      distanceKm: distance ? Number(distance) : undefined,
      intensity,
    });
  }

  return (
    <form className="activity-form" onSubmit={submit}>
      <label><span>Activity</span><select onChange={(event) => setType(event.target.value as ActivityEntry["type"])} value={type}>{ACTIVITY_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Minutes</span><input inputMode="numeric" onChange={(event) => setDuration(event.target.value)} value={duration} /></label>
      <label><span>Distance km</span><input inputMode="decimal" onChange={(event) => setDistance(event.target.value)} placeholder="Optional" value={distance} /></label>
      <label><span>Intensity</span><select onChange={(event) => setIntensity(event.target.value as ActivityEntry["intensity"])} value={intensity}>{["Easy", "Moderate", "Hard"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <PrimaryButton icon={Plus} type="submit">Log activity</PrimaryButton>
    </form>
  );
}

function TrainingView({
  store,
  saveStrength,
  saveActivity,
  deleteActivity,
}: {
  store: RecompStore;
  saveStrength: (routine: RoutineDefinition, exercises: ExerciseLog[]) => void;
  saveActivity: (activity: Omit<ActivityEntry, "id" | "date">) => void;
  deleteActivity: (id: string) => void;
}) {
  const [selected, setSelected] = useState(ROUTINES[0]);
  const [logs, setLogs] = useState<ExerciseLog[]>(() => createExerciseLogs(ROUTINES[0]));
  const [sessionOpen, setSessionOpen] = useState(false);

  function chooseRoutine(routine: RoutineDefinition) {
    setSelected(routine);
    setLogs(createExerciseLogs(routine));
    setSessionOpen(false);
  }

  function finishSession() {
    saveStrength(selected, logs);
    setLogs(createExerciseLogs(selected));
    setSessionOpen(false);
  }

  return (
    <div className="view-stack">
      <div className="view-heading">
        <div><p>Training</p><h1>Choose a session. Track only what matters.</h1></div>
      </div>

      <Card>
        <SectionHeading eyebrow="Suggested routines" title="Simple plans for consistent progress" />
        <RoutinePicker selected={selected} setSelected={chooseRoutine} />
      </Card>

      <div className="training-grid">
        <Card>
          <div className="routine-detail-head">
            <div>
              <span>{selected.level} · {selected.duration} minutes</span>
              <h2>{selected.name}</h2>
              <p>{selected.why}</p>
            </div>
            <PrimaryButton icon={Zap} onClick={() => setSessionOpen(true)}>Start session</PrimaryButton>
          </div>
          <div className="routine-exercises">
            {selected.exercises.map((exercise, index) => (
              <div key={exercise.id}>
                <span>{index + 1}</span>
                <div><strong>{exercise.name}</strong><small>{exercise.sets} sets · {exercise.reps} reps</small><p>{exercise.cue}</p></div>
                <span className="muscle-tag">{exercise.primary.join(" + ")}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeading eyebrow="Sports and movement" title="Everything else counts too" />
          <div className="activity-icons">
            <span><Activity size={18} />Run</span>
            <span><Bike size={18} />Ride</span>
            <span><Trophy size={18} />Sport</span>
            <span><Footprints size={18} />Walk</span>
          </div>
          <ActivityForm onSave={saveActivity} />
        </Card>
      </div>

      {sessionOpen ? (
        <Card className="active-session">
          <SectionHeading
            eyebrow="Active session"
            title={selected.name}
            action={<IconButton label="Close session" onClick={() => setSessionOpen(false)}><X size={17} /></IconButton>}
          />
          <SetEditor logs={logs} setLogs={setLogs} />
          <div className="session-footer">
            <span><Timer size={16} />Complete the useful sets. Leave a little in reserve.</span>
            <PrimaryButton icon={Check} onClick={finishSession}>Finish workout</PrimaryButton>
          </div>
        </Card>
      ) : null}

      <Card>
        <SectionHeading eyebrow="Recent movement" title="Activity history" />
        {store.strengthSessions.length || store.activities.length ? (
          <div className="history-list">
            {[...store.strengthSessions.map((session) => ({
              id: session.id,
              date: session.date,
              title: session.routineName,
              meta: `${session.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.completed).length, 0)} working sets`,
              kind: "Gym",
            })), ...store.activities.map((entry) => ({
              id: entry.id,
              date: entry.date,
              title: entry.type,
              meta: `${entry.durationMinutes} min${entry.distanceKm ? ` · ${entry.distanceKm} km` : ""}`,
              kind: entry.intensity,
            }))].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((entry) => (
              <div key={entry.id}>
                <span className="history-icon">{entry.kind === "Gym" ? <Dumbbell size={16} /> : <Activity size={16} />}</span>
                <span><strong>{entry.title}</strong><small>{formatDay(entry.date)} · {entry.meta}</small></span>
                <span className="history-kind">{entry.kind}</span>
                {entry.kind !== "Gym" ? <IconButton label={`Delete ${entry.title}`} onClick={() => deleteActivity(entry.id)}><Trash2 size={15} /></IconButton> : null}
              </div>
            ))}
          </div>
        ) : <div className="empty-state"><Activity size={20} /><span>Your completed sessions and activities will appear here.</span></div>}
      </Card>
    </div>
  );
}

function GoalEditor({
  goals,
  onSave,
  addWeight,
}: {
  goals: GoalSettings;
  onSave: (goals: GoalSettings) => void;
  addWeight: (weight: number) => void;
}) {
  const [draft, setDraft] = useState(goals);
  const [weight, setWeight] = useState("");

  return (
    <div className="goal-editor">
      <label><span>Goal</span><select onChange={(event) => setDraft((current) => ({ ...current, goal: event.target.value as GoalSettings["goal"] }))} value={draft.goal}>{["Lose fat", "Build muscle", "Recompose", "Maintain"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Calories</span><input inputMode="numeric" onChange={(event) => setDraft((current) => ({ ...current, calories: Number(event.target.value) || 0 }))} value={draft.calories} /></label>
      <label><span>Protein g</span><input inputMode="numeric" onChange={(event) => setDraft((current) => ({ ...current, protein: Number(event.target.value) || 0 }))} value={draft.protein} /></label>
      <label><span>Training days</span><input inputMode="numeric" max={7} min={1} onChange={(event) => setDraft((current) => ({ ...current, trainingDays: Number(event.target.value) || 1 }))} value={draft.trainingDays} /></label>
      <label><span>Sleep hours</span><input inputMode="decimal" max={12} min={4} onChange={(event) => setDraft((current) => ({ ...current, sleepHours: Number(event.target.value) || 8 }))} value={draft.sleepHours} /></label>
      <PrimaryButton icon={Save} onClick={() => onSave(draft)}>Save goals</PrimaryButton>
      <div className="weight-quick">
        <label><span>Today&apos;s weight</span><input inputMode="decimal" onChange={(event) => setWeight(event.target.value)} placeholder="kg" value={weight} /></label>
        <SecondaryButton icon={Weight} onClick={() => { if (Number(weight)) { addWeight(Number(weight)); setWeight(""); } }}>Log</SecondaryButton>
      </div>
    </div>
  );
}

function MiniBars({
  values,
  target,
}: {
  values: Array<{ id: string; label: string; value: number }>;
  target: number;
}) {
  const max = Math.max(target, ...values.map((item) => item.value), 1);
  return (
    <div className="mini-bars">
      {values.map((item) => (
        <div key={item.id}>
          <span><i style={{ height: `${Math.max(5, (item.value / max) * 100)}%` }} /></span>
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
}

function buildSleepBuckets(range: MetricRange, dates: string[], entries: SleepEntry[]) {
  function averageFor(groupDates: string[]) {
    const values = entries
      .filter((entry) => groupDates.includes(entry.date))
      .map((entry) => entry.durationMinutes);
    return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : 0;
  }

  if (range === "day") {
    return [{
      id: dates[0],
      label: "Last night",
      value: averageFor(dates),
    }];
  }

  if (range === "week") {
    return dates.map((date) => ({
      id: date,
      label: new Intl.DateTimeFormat("en", { weekday: "narrow" }).format(new Date(`${date}T12:00:00`)),
      value: averageFor([date]),
    }));
  }

  if (range === "month") {
    return Array.from({ length: 6 }, (_, index) => {
      const group = dates.slice(index * 5, index * 5 + 5);
      return {
        id: group[0],
        label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${group[0]}T12:00:00`)),
        value: averageFor(group),
      };
    });
  }

  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    const id = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    return {
      id,
      label: new Intl.DateTimeFormat("en", { month: "short" }).format(month),
      value: averageFor(dates.filter((date) => date.startsWith(id))),
    };
  });
}

function SleepView({
  entries,
  targetHours,
  onSave,
  onDelete,
}: {
  entries: SleepEntry[];
  targetHours: number;
  onSave: (entry: SleepEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [range, setRange] = useState<MetricRange>("week");
  const [date, setDate] = useState(todayIso());
  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [quality, setQuality] = useState<SleepQuality>(3);
  const [interruptions, setInterruptions] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const selectedEntry = entries.find((entry) => entry.date === date);
  const duration = sleepDuration(bedtime, wakeTime);
  const rangeConfig = METRIC_RANGES.find((item) => item.id === range) ?? METRIC_RANGES[1];
  const dates = useMemo(() => recentDates(rangeConfig.days), [rangeConfig.days]);
  const rangeEntries = entries.filter((entry) => dates.includes(entry.date));
  const averages = averageSleep(rangeEntries);
  const targetMinutes = targetHours * 60;
  const targetNights = rangeEntries.filter((entry) => entry.durationMinutes >= targetMinutes * 0.9).length;
  const bedtimeValues = rangeEntries.map((entry) => {
    const [hour, minute] = entry.bedtime.split(":").map(Number);
    return (hour < 12 ? hour + 24 : hour) * 60 + minute;
  });
  const bedtimeSpread = bedtimeValues.length > 1 ? Math.max(...bedtimeValues) - Math.min(...bedtimeValues) : 0;
  const buckets = buildSleepBuckets(range, dates, rangeEntries);
  const sleepSuggestion = !rangeEntries.length
    ? { title: "Log last night.", detail: "Sleep can only shape recovery guidance after you add a real night." }
    : averages.duration < targetMinutes - 30
      ? { title: "Protect another 30–60 minutes.", detail: `Your average is ${formatDuration(averages.duration)} against a ${formatDuration(targetMinutes)} target.` }
      : bedtimeSpread > 60
        ? { title: "Anchor the start of your night.", detail: `Bedtime moved by ${formatDuration(bedtimeSpread)} across the logged range.` }
        : averages.quality < 3
          ? { title: "Keep today familiar.", detail: "Lower perceived sleep quality is a good reason to avoid testing a new maximum." }
          : { title: "Recovery rhythm looks steady.", detail: "Keep the same sleep window while progressing training gradually." };

  useEffect(() => {
    if (selectedEntry) {
      setBedtime(selectedEntry.bedtime);
      setWakeTime(selectedEntry.wakeTime);
      setQuality(selectedEntry.quality);
      setInterruptions(selectedEntry.interruptions);
      setNote(selectedEntry.note ?? "");
    } else {
      setBedtime("23:00");
      setWakeTime("07:00");
      setQuality(3);
      setInterruptions(0);
      setNote("");
    }
    setError("");
  }, [date, selectedEntry?.id]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (duration < 120 || duration > 960) {
      setError("Use a sleep window between 2 and 16 hours.");
      return;
    }
    onSave({
      id: selectedEntry?.id ?? uid("sleep"),
      date,
      bedtime,
      wakeTime,
      durationMinutes: duration,
      quality,
      interruptions,
      note: note.trim() || undefined,
      source: selectedEntry?.source ?? "manual",
    });
    setError("");
  }

  return (
    <div className="view-stack sleep-view">
      <div className="view-heading progress-heading">
        <div><p>Sleep</p><h1>Recovery starts the night before</h1></div>
        <div className="metric-range" aria-label="Sleep time range">
          {METRIC_RANGES.map((item) => (
            <button
              aria-pressed={range === item.id}
              className={range === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setRange(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sleep-overview">
        <div className="sleep-orbit" aria-label={`${formatDuration(averages.duration)} average sleep`}>
          <MoonStar size={30} />
          <span><strong>{formatDuration(averages.duration)}</strong><small>{rangeConfig.label} average</small></span>
          <i style={{ "--sleep-progress": `${clamp((averages.duration / targetMinutes) * 100, 0, 100)}%` } as React.CSSProperties} />
        </div>
        <div><span><Sunrise size={17} /><small>Quality</small><strong>{averages.quality ? `${averages.quality}/5` : "—"}</strong></span></div>
        <div><span><Target size={17} /><small>Target nights</small><strong>{targetNights}/{rangeEntries.length || rangeConfig.days}</strong></span></div>
        <div><span><Timer size={17} /><small>Bedtime spread</small><strong>{bedtimeValues.length > 1 ? formatDuration(bedtimeSpread) : "—"}</strong></span></div>
      </div>

      <div className="sleep-layout">
        <Card className="sleep-log-card">
          <SectionHeading
            eyebrow={selectedEntry ? "Update a night" : "Add a night"}
            title={selectedEntry ? formatDay(date) : "Log sleep"}
          />
          <form className="sleep-form" onSubmit={submit}>
            <label><span>Wake date</span><input max={todayIso()} onChange={(event) => setDate(event.target.value)} type="date" value={date} /></label>
            <label><span>Bedtime</span><input onChange={(event) => setBedtime(event.target.value)} type="time" value={bedtime} /></label>
            <label><span>Wake time</span><input onChange={(event) => setWakeTime(event.target.value)} type="time" value={wakeTime} /></label>
            <div className="sleep-duration"><MoonStar size={18} /><span><strong>{formatDuration(duration)}</strong><small>calculated sleep window</small></span></div>
            <fieldset>
              <legend>How did it feel?</legend>
              <div className="quality-control">
                {([1, 2, 3, 4, 5] as SleepQuality[]).map((value) => (
                  <button
                    aria-pressed={quality === value}
                    className={quality === value ? "active" : ""}
                    key={value}
                    onClick={() => setQuality(value)}
                    type="button"
                  >
                    <strong>{value}</strong><small>{sleepQualityLabel(value)}</small>
                  </button>
                ))}
              </div>
            </fieldset>
            <label><span>Interruptions</span><input inputMode="numeric" max={20} min={0} onChange={(event) => setInterruptions(Number(event.target.value) || 0)} type="number" value={interruptions} /></label>
            <label className="sleep-note"><span>Note (optional)</span><input onChange={(event) => setNote(event.target.value)} placeholder="Late meal, hard session, travel..." value={note} /></label>
            {error ? <p className="form-error">{error}</p> : null}
            <PrimaryButton icon={Save} type="submit">{selectedEntry ? "Update night" : "Save night"}</PrimaryButton>
          </form>
        </Card>

        <div className="sleep-side">
          <Card>
            <SectionHeading eyebrow={`${rangeConfig.label} rhythm`} title="Sleep duration" />
            <MiniBars target={targetMinutes} values={buckets} />
            <div className="target-line">
              <span>{formatDuration(averages.duration)} average</span>
              <strong>{formatDuration(targetMinutes)} target</strong>
            </div>
          </Card>
          <Card>
            <SectionHeading eyebrow="Sleep coach" title={sleepSuggestion.title} />
            <p className="sleep-coach-copy">{sleepSuggestion.detail}</p>
          </Card>
        </div>
      </div>

      <Card>
        <SectionHeading eyebrow="History" title="Recent nights" />
        {entries.length ? (
          <div className="sleep-history">
            {[...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((entry) => (
              <div key={entry.id}>
                <span className="history-icon"><MoonStar size={16} /></span>
                <span><strong>{formatDay(entry.date)}</strong><small>{entry.bedtime} – {entry.wakeTime}</small></span>
                <span><strong>{formatDuration(entry.durationMinutes)}</strong><small>{sleepQualityLabel(entry.quality)} · {entry.interruptions} interruptions</small></span>
                <IconButton label="Delete sleep entry" onClick={() => onDelete(entry.id)}><Trash2 size={16} /></IconButton>
              </div>
            ))}
          </div>
        ) : <div className="empty-state"><MoonStar size={20} /><span>No sleep logged yet.</span></div>}
      </Card>
    </div>
  );
}

function buildCalorieBuckets(range: MetricRange, dates: string[], meals: MealEntry[]) {
  if (range === "day") {
    return MEAL_SCHEDULE.map(({ slot }) => ({
      id: slot,
      label: slot,
      value: sumMacros(meals.filter((meal) => meal.slot === slot).map(mealMacros)).calories,
    }));
  }

  function averageFor(groupDates: string[]) {
    const totals = groupDates.map((date) =>
      sumMacros(meals.filter((meal) => meal.date === date).map(mealMacros)).calories
    );
    const logged = totals.filter((value) => value > 0);
    return logged.length ? Math.round(logged.reduce((total, value) => total + value, 0) / logged.length) : 0;
  }

  if (range === "week") {
    return dates.map((date) => ({
      id: date,
      label: new Intl.DateTimeFormat("en", { weekday: "narrow" }).format(new Date(`${date}T12:00:00`)),
      value: averageFor([date]),
    }));
  }

  if (range === "month") {
    return Array.from({ length: 6 }, (_, index) => {
      const group = dates.slice(index * 5, index * 5 + 5);
      return {
        id: group[0],
        label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${group[0]}T12:00:00`)),
        value: averageFor(group),
      };
    });
  }

  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    const id = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    const monthDates = dates.filter((date) => date.startsWith(id));
    return {
      id,
      label: new Intl.DateTimeFormat("en", { month: "short" }).format(month),
      value: averageFor(monthDates),
    };
  });
}

function ProgressView({
  store,
  saveGoals,
  addWeight,
  onEditBody,
}: {
  store: RecompStore;
  saveGoals: (goals: GoalSettings) => void;
  addWeight: (weight: number) => void;
  onEditBody: () => void;
}) {
  const [range, setRange] = useState<MetricRange>("week");
  const rangeConfig = METRIC_RANGES.find((item) => item.id === range) ?? METRIC_RANGES[1];
  const dates = useMemo(() => recentDates(rangeConfig.days), [rangeConfig.days]);
  const rangeMeals = store.meals.filter((meal) => dates.includes(meal.date));
  const rangeSessions = store.strengthSessions.filter((session) => dates.includes(session.date));
  const rangeWeights = store.weights.filter((entry) => dates.includes(entry.date));
  const rangeSleep = store.sleepEntries.filter((entry) => dates.includes(entry.date));
  const sleepAverage = averageSleep(rangeSleep);
  const muscleScores = useMemo(
    () => getMuscleScores(store.strengthSessions, rangeConfig.days),
    [rangeConfig.days, store.strengthSessions],
  );
  const calorieBuckets = buildCalorieBuckets(range, dates, rangeMeals);
  const dailyTotals = dates.map((date) =>
    sumMacros(rangeMeals.filter((meal) => meal.date === date).map(mealMacros))
  );
  const loggedTotals = dailyTotals.filter((total) => total.calories > 0);
  const loggedDays = loggedTotals.length;
  const averageCalories = loggedDays
    ? loggedTotals.reduce((total, day) => total + day.calories, 0) / loggedDays
    : 0;
  const averageProtein = loggedDays
    ? loggedTotals.reduce((total, day) => total + day.protein, 0) / loggedDays
    : 0;
  const workingSets = completedSets(rangeSessions);
  const volume = strengthVolume(rangeSessions);
  const activityMinutes = store.activities
    .filter((entry) => dates.includes(entry.date))
    .reduce((total, entry) => total + entry.durationMinutes, 0);
  const sortedWeights = [...rangeWeights].sort((a, b) => a.date.localeCompare(b.date));
  const weightChange = sortedWeights.length > 1
    ? roundMacro(sortedWeights.at(-1)!.weightKg - sortedWeights[0].weightKg)
    : null;
  const expectedSessions = Math.max(1, Math.round(store.goals.trainingDays * rangeConfig.days / 7));
  const loggingCoverage = loggedDays / rangeConfig.days;
  const proteinDays = loggedTotals.filter((total) => total.protein >= store.goals.protein * 0.85).length;
  const targetDays = loggedTotals.filter((total) =>
    Math.abs(total.calories - store.goals.calories) <= store.goals.calories * 0.1
  ).length;
  const nutritionAdherence = loggedDays ? Math.round((targetDays / loggedDays) * 100) : 0;
  const muscleCoverage = Object.values(muscleScores).filter((score) => (score ?? 0) > 0).length;
  const rhythm = loadRhythm(store);
  const signalConfidence = Math.round(clamp(
    loggingCoverage * 75 + Math.min(1, rangeWeights.length / Math.max(2, rangeConfig.days / 7)) * 25,
    0,
    100,
  ));
  const chartTarget = range === "day" ? Math.round(store.goals.calories / 4) : store.goals.calories;

  const nutritionSuggestion = loggedDays === 0
    ? { title: "Log the first meal.", detail: "One complete day gives the dashboard something real to work with." }
    : averageProtein < store.goals.protein * 0.8
      ? { title: "Close the protein gap.", detail: `You averaged ${Math.round(averageProtein)}g against a ${store.goals.protein}g target.` }
      : loggingCoverage < 0.6
        ? { title: "Complete more food days.", detail: `${loggedDays} of ${rangeConfig.days} days contain nutrition data.` }
        : { title: "Nutrition is in a useful range.", detail: "Keep portions consistent before changing the calorie target." };

  const trainingSuggestion = rangeSessions.length < expectedSessions
    ? {
        title: "Schedule the next strength session.",
        detail: `${rangeSessions.length} of roughly ${expectedSessions} sessions are recorded for this ${rangeConfig.label.toLowerCase()}.`,
      }
    : {
        title: "Progress one familiar lift.",
        detail: `${workingSets} completed sets are logged. Add a rep or a small amount of weight with clean technique.`,
      };

  const trendSuggestion = sortedWeights.length < 2
    ? { title: "Add another weigh-in.", detail: "Two or more measurements reveal direction without overreacting to one day." }
    : {
        title: weightChange === 0 ? "The recorded trend is flat." : "Use the trend, not one measurement.",
        detail: `Recorded change for this ${rangeConfig.label.toLowerCase()}: ${weightChange! > 0 ? "+" : ""}${weightChange} kg.`,
      };
  const sleepSuggestion = !rangeSleep.length
    ? { title: "Add sleep to the picture.", detail: "A nightly duration and quality check makes training guidance more useful." }
    : sleepAverage.duration < store.goals.sleepHours * 60 - 30
      ? { title: "Give recovery more room.", detail: `${formatDuration(sleepAverage.duration)} average sleep is below your ${formatDuration(store.goals.sleepHours * 60)} target.` }
      : { title: "Keep the sleep window steady.", detail: `${formatDuration(sleepAverage.duration)} average sleep supports gradual training progression.` };

  return (
    <div className="view-stack">
      <div className="view-heading progress-heading">
        <div><p>Progress</p><h1>See what your habits are building</h1></div>
        <div className="metric-range" aria-label="Metric time range">
          {METRIC_RANGES.map((item) => (
            <button
              aria-pressed={range === item.id}
              className={range === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setRange(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="insight-stats">
        <div><span><Utensils size={17} /></span><strong>{loggedDays}/{rangeConfig.days}</strong><small>days logged</small></div>
        <div><span><Target size={17} /></span><strong>{nutritionAdherence}%</strong><small>calorie adherence</small></div>
        <div><span><Zap size={17} /></span><strong>{proteinDays}</strong><small>protein days</small></div>
        <div><span><Dumbbell size={17} /></span><strong>{compactNumber(volume)}</strong><small>volume kg</small></div>
        <div><span><Layers3 size={17} /></span><strong>{muscleCoverage}/10</strong><small>muscles covered</small></div>
        <div><span><Activity size={17} /></span><strong>{activityMinutes}</strong><small>activity min</small></div>
        <div><span><MoonStar size={17} /></span><strong>{formatDuration(sleepAverage.duration)}</strong><small>average sleep</small></div>
      </div>

      <section className="trajectory-rail" aria-label={`${rangeConfig.label} trajectory signals`}>
        <div className="trajectory-intro">
          <Gauge size={18} />
          <span><strong>Trajectory signals</strong><small>Useful direction, grounded in what you logged</small></span>
        </div>
        <div className="trajectory-signal">
          <span><small>Weight direction</small><strong>{weightChange === null ? "Needs data" : `${weightChange > 0 ? "+" : ""}${weightChange} kg`}</strong></span>
          <i><b style={{ width: `${weightChange === null ? 6 : clamp(50 + weightChange * 18, 6, 94)}%` }} /></i>
        </div>
        <div className="trajectory-signal">
          <span><small>7-day load rhythm</small><strong>{rhythm.label}</strong></span>
          <i><b style={{ width: `${Math.max(6, rhythm.value)}%` }} /></i>
        </div>
        <div className="trajectory-signal">
          <span><small>Signal confidence</small><strong>{signalConfidence}%</strong></span>
          <i><b style={{ width: `${Math.max(6, signalConfidence)}%` }} /></i>
        </div>
      </section>

      <div className="progress-layout">
        <section className="body-analysis">
          <SectionHeading
            action={<SecondaryButton icon={ScanLine} onClick={onEditBody}>{store.bodyProfile ? "Update twin" : "Build my body"}</SecondaryButton>}
            eyebrow={`${rangeConfig.label} training balance`}
            title={store.bodyProfile ? "Your 3D muscle load" : "3D muscle load"}
          />
          {store.bodyProfile ? (
            <div className="body-profile-note">
              <img alt="" src={store.bodyProfile.frontPhoto} />
              <span><strong>Personalized anatomy</strong><small>{store.bodyProfile.confidence} silhouette confidence · editable anytime</small></span>
            </div>
          ) : (
            <button className="body-profile-prompt" onClick={onEditBody} type="button">
              <ScanLine size={20} />
              <span><strong>Make this anatomy yours</strong><small>Add a full-body photo to tune the model proportions on-device.</small></span>
              <ChevronRight size={17} />
            </button>
          )}
          <BodyHeatmap periodDays={rangeConfig.days} profile={store.bodyProfile} scores={muscleScores} />
          <p className="panel-note">Primary muscles receive a full set; secondary muscles receive half. The model reflects completed sets.</p>
        </section>

        <div className="progress-side">
          <Card>
            <SectionHeading
              eyebrow="Nutrition consistency"
              title={range === "day" ? "Calories by meal" : "Average calories"}
            />
            <MiniBars target={chartTarget} values={calorieBuckets} />
            <div className="target-line">
              <span>{Math.round(averageCalories)} kcal average</span>
              <strong>{store.goals.calories} kcal target</strong>
            </div>
          </Card>

          <Card>
            <SectionHeading eyebrow={`${rangeConfig.label} suggestions`} title="What to do next" />
            <div className="insight-list">
              <div><Check size={15} /><span><strong>{nutritionSuggestion.title}</strong><small>{nutritionSuggestion.detail}</small></span></div>
              <div><Dumbbell size={15} /><span><strong>{trainingSuggestion.title}</strong><small>{trainingSuggestion.detail}</small></span></div>
              <div><Weight size={15} /><span><strong>{trendSuggestion.title}</strong><small>{trendSuggestion.detail}</small></span></div>
              <div><MoonStar size={15} /><span><strong>{sleepSuggestion.title}</strong><small>{sleepSuggestion.detail}</small></span></div>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <SectionHeading eyebrow="Targets" title="Fitness goals" />
        <GoalEditor addWeight={addWeight} goals={store.goals} onSave={saveGoals} />
      </Card>
    </div>
  );
}

function AppHeader({
  view,
  remindersEnabled,
  onToggleReminders,
  onNavigate,
}: {
  view: View;
  remindersEnabled: boolean;
  onToggleReminders: () => void;
  onNavigate: (view: View) => void;
}) {
  return (
    <header className="re-header">
      <div className="re-header-inner">
        <div className="re-brand">
          <span className="re-mark">r<span>/</span></span>
          <div><strong>recomp</strong><small>nutrition + training + recovery</small></div>
        </div>
        <nav className="desktop-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => onNavigate(item.id)} type="button">
                <Icon size={16} />{item.label}
              </button>
            );
          })}
        </nav>
        <div className="header-tools">
          <IconButton label={remindersEnabled ? "Disable reminders" : "Enable reminders"} onClick={onToggleReminders}>
            {remindersEnabled ? <Bell size={17} /> : <BellOff size={17} />}
          </IconButton>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function MobileNav({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)} type="button">
            <Icon size={19} /><span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function RecompApp({ showSignOut: _showSignOut = true }: { showSignOut?: boolean }) {
  const [view, setView] = useState<View>("today");
  const [store, setStore] = useState<RecompStore>(DEFAULT_STORE);
  const [hydrated, setHydrated] = useState(false);
  const [mealSlot, setMealSlot] = useState<MealSlot>(currentMealSlot());
  const [bodyTwinOpen, setBodyTwinOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<RecompStore>;
        setStore({
          ...DEFAULT_STORE,
          ...parsed,
          goals: { ...DEFAULT_STORE.goals, ...parsed.goals },
          meals: Array.isArray(parsed.meals) ? parsed.meals : [],
          strengthSessions: Array.isArray(parsed.strengthSessions) ? parsed.strengthSessions : [],
          activities: Array.isArray(parsed.activities) ? parsed.activities : [],
          weights: Array.isArray(parsed.weights) ? parsed.weights : [],
          sleepEntries: Array.isArray(parsed.sleepEntries) ? parsed.sleepEntries : [],
        });
      }
    } catch {
      setStore(DEFAULT_STORE);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      // Keep the active session usable if the browser rejects large local photo data.
    }
  }, [hydrated, store]);

  useEffect(() => {
    if (!store.remindersEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const timers: number[] = [];
    const now = new Date();
    const todayMeals = store.meals.filter((meal) => meal.date === todayIso());

    MEAL_SCHEDULE.forEach((schedule) => {
      if (todayMeals.some((meal) => meal.slot === schedule.slot)) return;
      const due = new Date();
      due.setHours(Math.floor(schedule.hour), schedule.hour % 1 ? 30 : 0, 0, 0);
      if (due <= now) return;
      timers.push(window.setTimeout(() => {
        new Notification(`Time to check ${schedule.slot.toLowerCase()}`, {
          body: "Log what you ate or plan the meal before the gap gets large.",
        });
      }, due.getTime() - now.getTime()));
    });

    return () => timers.forEach(window.clearTimeout);
  }, [store.meals, store.remindersEnabled]);

  const todayMeals = useMemo(
    () => store.meals.filter((meal) => meal.date === todayIso()).sort((a, b) =>
      MEAL_SCHEDULE.findIndex((item) => item.slot === a.slot) -
      MEAL_SCHEDULE.findIndex((item) => item.slot === b.slot)
    ),
    [store.meals],
  );
  const totals = useMemo(() => sumMacros(todayMeals.map(mealMacros)), [todayMeals]);
  const muscleScores = useMemo(() => getMuscleScores(store.strengthSessions), [store.strengthSessions]);

  function navigate(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleReminders() {
    if (!store.remindersEnabled && typeof Notification !== "undefined" && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }
    setStore((current) => ({ ...current, remindersEnabled: !current.remindersEnabled }));
  }

  function saveMeal(slot: MealSlot, items: MealItem[], photo: string, recognition: FoodRecognition | null) {
    const meal: MealEntry = {
      id: uid("meal"),
      date: todayIso(),
      slot,
      items,
      photo: photo || undefined,
      source: photo ? "photo" : "manual",
      recognitionLabel: recognition?.label,
      confidence: recognition?.confidence,
      createdAt: new Date().toISOString(),
    };
    setStore((current) => ({ ...current, meals: [meal, ...current.meals] }));
    navigate("today");
  }

  function saveStrength(routine: RoutineDefinition, exercises: ExerciseLog[]) {
    const normalized = exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => ({ ...set, completed: set.completed || set.weightKg > 0 })),
    }));
    const session: StrengthSession = {
      id: uid("strength"),
      date: todayIso(),
      routineId: routine.id,
      routineName: routine.name,
      exercises: normalized,
      completedAt: new Date().toISOString(),
    };
    setStore((current) => ({ ...current, strengthSessions: [session, ...current.strengthSessions] }));
  }

  function saveActivity(activity: Omit<ActivityEntry, "id" | "date">) {
    setStore((current) => ({
      ...current,
      activities: [{ ...activity, id: uid("activity"), date: todayIso() }, ...current.activities],
    }));
  }

  return (
    <div className="recomp-shell">
      <AppHeader
        onNavigate={navigate}
        remindersEnabled={store.remindersEnabled}
        onToggleReminders={() => void toggleReminders()}
        view={view}
      />
      <main className="re-main">
        {view === "today" ? (
          <TodayView
            deleteMeal={(id) => setStore((current) => ({ ...current, meals: current.meals.filter((meal) => meal.id !== id) }))}
            muscleScores={muscleScores}
            setMealSlot={setMealSlot}
            setView={navigate}
            store={store}
            todayMeals={todayMeals}
            toggleReminders={() => void toggleReminders()}
            totals={totals}
          />
        ) : null}
        {view === "food" ? (
          <FoodView
            deleteMeal={(id) => setStore((current) => ({ ...current, meals: current.meals.filter((meal) => meal.id !== id) }))}
            meals={todayMeals}
            saveMeal={saveMeal}
            setSlot={setMealSlot}
            slot={mealSlot}
          />
        ) : null}
        {view === "training" ? (
          <TrainingView
            deleteActivity={(id) => setStore((current) => ({ ...current, activities: current.activities.filter((entry) => entry.id !== id) }))}
            saveActivity={saveActivity}
            saveStrength={saveStrength}
            store={store}
          />
        ) : null}
        {view === "sleep" ? (
          <SleepView
            entries={store.sleepEntries}
            onDelete={(id) => setStore((current) => ({
              ...current,
              sleepEntries: current.sleepEntries.filter((entry) => entry.id !== id),
            }))}
            onSave={(entry) => setStore((current) => ({
              ...current,
              sleepEntries: [
                entry,
                ...current.sleepEntries.filter((candidate) => candidate.date !== entry.date),
              ],
            }))}
            targetHours={store.goals.sleepHours}
          />
        ) : null}
        {view === "progress" ? (
          <ProgressView
            addWeight={(weightKg) => setStore((current) => ({
              ...current,
              weights: [{ id: uid("weight"), date: todayIso(), weightKg }, ...current.weights.filter((entry) => entry.date !== todayIso())],
            }))}
            onEditBody={() => setBodyTwinOpen(true)}
            saveGoals={(goals) => setStore((current) => ({ ...current, goals }))}
            store={store}
          />
        ) : null}
      </main>
      <MobileNav setView={navigate} view={view} />
      <footer className="re-footer">by _ae</footer>
      {bodyTwinOpen ? (
        <BodyTwinEditor
          onClose={() => setBodyTwinOpen(false)}
          onDelete={store.bodyProfile ? () => {
            setStore((current) => ({ ...current, bodyProfile: undefined }));
            setBodyTwinOpen(false);
          } : undefined}
          onSave={(bodyProfile) => {
            setStore((current) => ({ ...current, bodyProfile }));
            setBodyTwinOpen(false);
          }}
          profile={store.bodyProfile}
        />
      ) : null}
    </div>
  );
}
