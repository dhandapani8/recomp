"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import {
  Activity,
  Apple,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Gauge,
  Leaf,
  LogOut,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Scale,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  Upload,
  Utensils,
  UserRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { font } from "@/lib/design-system";

type View = "dashboard" | "meals" | "weight" | "workouts" | "insights";
type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";
type Confidence = "High" | "Medium" | "Low";
type WorkoutType = "Gym" | "Badminton" | "Walk" | "Mobility" | "Rest";
type Intensity = "Low" | "Medium" | "High";

type Meal = {
  id: string;
  date: string;
  mealType: MealType;
  description: string;
  imageDataUrl?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: Confidence;
  feedback: string;
  createdAt: string;
};

type WeightEntry = {
  id: string;
  date: string;
  weightKg: number;
};

type Workout = {
  id: string;
  date: string;
  type: WorkoutType;
  durationMinutes: number;
  intensity: Intensity;
  notes: string;
};

type Profile = {
  name: string;
  sex: string;
  age: number;
  heightCm: number;
  startWeightKg: number;
  goalWeightKg: number;
  dietType: string;
  training: string;
  targetLossKg: number;
  maintenance: string;
  bmr: number;
};

type FitStore = {
  profile: Profile;
  targetCalories: number;
  meals: Meal[];
  weights: WeightEntry[];
  workouts: Workout[];
};

type MealForm = {
  date: string;
  mealType: MealType;
  description: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  confidence: Confidence;
  imageDataUrl: string;
};

type WeightForm = {
  date: string;
  weightKg: string;
};

type WorkoutForm = {
  date: string;
  type: WorkoutType;
  durationMinutes: string;
  intensity: Intensity;
  notes: string;
};

type Totals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

const STORAGE_KEY = "recomp-v1";

const DEFAULT_PROFILE: Profile = {
  name: "Dhandapani",
  sex: "Male",
  age: 31,
  heightCm: 175,
  startWeightKg: 84,
  goalWeightKg: 74,
  dietType: "Flexible",
  training: "Gym + badminton, 2-3 days/week",
  targetLossKg: 0.4,
  maintenance: "2,600-2,700 kcal",
  bmr: 1784,
};

const MACRO_TARGETS = {
  protein: 150,
  carbs: 220,
  fat: 65,
  fiberMin: 25,
  fiberMax: 40,
};

const EMPTY_TOTALS: Totals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];
const CONFIDENCE_LEVELS: Confidence[] = ["High", "Medium", "Low"];
const WORKOUT_TYPES: WorkoutType[] = ["Gym", "Badminton", "Walk", "Mobility", "Rest"];
const INTENSITIES: Intensity[] = ["Low", "Medium", "High"];

const PROTEIN_PICKS = [
  "Greek yogurt",
  "Whey",
  "Eggs",
  "Chicken",
  "Fish",
  "Tofu",
  "Lentils",
  "Cottage cheese",
];

const QUICK_MEALS = [
  {
    label: "Usual breakfast",
    mealType: "Breakfast" as MealType,
    description: "Greek yogurt bowl with banana, chia seeds, walnuts, and a scoop of whey",
    calories: 510,
    protein: 38,
    carbs: 62,
    fat: 15,
    fiber: 9,
    confidence: "Medium" as Confidence,
  },
  {
    label: "Protein snack",
    mealType: "Snack" as MealType,
    description: "Whey protein shake with an apple",
    calories: 260,
    protein: 27,
    carbs: 28,
    fat: 2,
    fiber: 4,
    confidence: "High" as Confidence,
  },
  {
    label: "Protein dinner",
    mealType: "Dinner" as MealType,
    description: "Lean protein bowl with rice, vegetables, avocado, and yogurt dip",
    calories: 650,
    protein: 43,
    carbs: 72,
    fat: 20,
    fiber: 12,
    confidence: "Medium" as Confidence,
  },
];

const VIEW_ITEMS = [
  { id: "dashboard" as View, label: "Dashboard", icon: Gauge },
  { id: "meals" as View, label: "Meals", icon: Utensils },
  { id: "weight" as View, label: "Weight", icon: Scale },
  { id: "workouts" as View, label: "Workouts", icon: Dumbbell },
  { id: "insights" as View, label: "Insights", icon: BarChart3 },
];

const ACCENT = {
  green: "#159947",
  blue: "#2563eb",
  orange: "#ea580c",
  teal: "#0f9f8a",
  pink: "#db2777",
  yellow: "#ca8a04",
  red: "#dc2626",
  slate: "#475569",
};

const WATCH_METRICS = [
  { label: "Move", value: "640 kcal", color: ACCENT.orange },
  { label: "Exercise", value: "46 min", color: ACCENT.green },
  { label: "Steps", value: "8,420", color: ACCENT.blue },
  { label: "Sleep", value: "7h 12m", color: ACCENT.teal },
];

const GYM_PLANS = [
  {
    name: "Upper strength",
    duration: 60,
    intensity: "High" as Intensity,
    goal: "Build pressing and pulling strength without burying recovery.",
    exercises: [
      "Bench press - 4 x 5-8",
      "Chest-supported row - 4 x 8-10",
      "Incline dumbbell press - 3 x 8-10",
      "Lat pulldown - 3 x 10-12",
      "Lateral raise - 3 x 12-15",
      "Cable triceps pressdown - 2 x 12-15",
    ],
  },
  {
    name: "Lower strength",
    duration: 65,
    intensity: "High" as Intensity,
    goal: "Keep legs strong while cutting. Prioritize clean reps over volume.",
    exercises: [
      "Back squat - 4 x 5-8",
      "Romanian deadlift - 3 x 8-10",
      "Leg press - 3 x 10-12",
      "Hamstring curl - 3 x 10-12",
      "Standing calf raise - 3 x 12-15",
      "Plank - 3 x 45-60s",
    ],
  },
  {
    name: "Full-body recomp",
    duration: 55,
    intensity: "Medium" as Intensity,
    goal: "Best default when sleep or food has been average.",
    exercises: [
      "Goblet squat - 3 x 10",
      "Dumbbell bench press - 3 x 8-10",
      "Seated cable row - 3 x 10-12",
      "Hip thrust - 3 x 10-12",
      "Lateral raise - 2 x 15",
      "Farmer carry - 4 x 30m",
    ],
  },
];

function toISODate(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function parseISODate(iso: string) {
  return new Date(`${iso}T12:00:00`);
}

function addDays(iso: string, days: number) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function formatDate(iso: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en", options ?? { month: "short", day: "numeric" }).format(parseISODate(iso));
}

function formatWeekday(iso: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(parseISODate(iso));
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100_000)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function percentage(value: number, target: number) {
  if (target <= 0) return 0;
  return clamp(Math.round((value / target) * 100), 0, 120);
}

function numberOrZero(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function buildMealFeedback(meal: Pick<Meal, "mealType" | "description" | "calories" | "protein" | "carbs" | "fat" | "fiber">) {
  const description = meal.description.toLowerCase();
  const proteinRatio = meal.calories > 0 ? meal.protein / (meal.calories / 100) : 0;
  const carbHeavy = meal.carbs > meal.protein * 2.4 && meal.carbs > 45;
  const highFiber = meal.fiber >= 8;

  if (description.includes("rice") && description.includes("corn")) {
    return "Good fiber, but this leans carb-heavy. Next time choose rice or corn, then add a clear protein anchor like Greek yogurt, eggs, tofu, chicken, fish, lentils, or cottage cheese.";
  }

  if (proteinRatio >= 7 && highFiber) {
    return "Strong plate: solid protein density and fiber. Keep this as a repeatable option.";
  }

  if (meal.protein < 20 && meal.mealType !== "Snack") {
    return "Protein is the limiter here. Add Greek yogurt, eggs, tofu, chicken, fish, lentils, or cottage cheese before cutting calories.";
  }

  if (carbHeavy) {
    return "Carbs are doing most of the work. Keep the base smaller and add a protein anchor.";
  }

  if (meal.fat > 25) {
    return "Tasty, but fat is taking a lot of the calorie budget. Use a lighter cooking fat or a leaner protein portion.";
  }

  return "Solid entry. Keep portions honest and pair the next meal with a clear protein source.";
}

function sumMeals(meals: Meal[]): Totals {
  return meals.reduce(
    (total, meal) => ({
      calories: total.calories + meal.calories,
      protein: total.protein + meal.protein,
      carbs: total.carbs + meal.carbs,
      fat: total.fat + meal.fat,
      fiber: total.fiber + meal.fiber,
    }),
    EMPTY_TOTALS
  );
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getWeekDates(today: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
}

function makeMeal(
  date: string,
  mealType: MealType,
  description: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber: number,
  confidence: Confidence = "Medium"
): Meal {
  const meal = {
    id: makeId("meal"),
    date,
    mealType,
    description,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    confidence,
    createdAt: `${date}T12:00:00.000Z`,
    feedback: "",
  };

  return {
    ...meal,
    feedback: buildMealFeedback(meal),
  };
}

function createSeedStore(today: string, profile: Profile = DEFAULT_PROFILE): FitStore {
  const d = (offset: number) => addDays(today, offset);

  return {
    profile,
    targetCalories: 2200,
    meals: [
      makeMeal(today, "Breakfast", "Greek yogurt bowl with banana, chia seeds, walnuts, and whey", 510, 38, 62, 15, 9),
      makeMeal(today, "Lunch", "Chicken burrito bowl with rice, beans, corn, and salad", 710, 44, 92, 17, 14),
      makeMeal(today, "Snack", "Whey protein shake with an apple", 260, 27, 28, 2, 4, "High"),

      makeMeal(d(-1), "Breakfast", "Eggs, toast, Greek yogurt, and fruit", 560, 42, 54, 19, 7),
      makeMeal(d(-1), "Lunch", "Turkey sandwich, salad, and soup", 620, 43, 62, 18, 9),
      makeMeal(d(-1), "Dinner", "Salmon rice bowl with cucumber yogurt sauce", 760, 48, 72, 30, 8),
      makeMeal(d(-1), "Snack", "Cottage cheese bowl", 220, 26, 12, 7, 2, "High"),

      makeMeal(d(-2), "Breakfast", "Oats with milk, berries, and protein powder", 540, 42, 66, 12, 10),
      makeMeal(d(-2), "Lunch", "Chicken wrap with hummus and vegetables", 680, 45, 68, 22, 10),
      makeMeal(d(-2), "Dinner", "Lean beef stir fry with rice and salad", 790, 52, 78, 28, 8),

      makeMeal(d(-3), "Breakfast", "Eggs, toast, and Greek yogurt", 590, 45, 44, 24, 5, "High"),
      makeMeal(d(-3), "Lunch", "Custom burrito bowl with beans and chicken", 760, 49, 84, 21, 13),
      makeMeal(d(-3), "Dinner", "Tandoori chicken, roti, and salad", 740, 51, 58, 25, 7),

      makeMeal(d(-4), "Breakfast", "Protein smoothie with oats", 500, 39, 60, 11, 9),
      makeMeal(d(-4), "Lunch", "Tuna rice bowl with mixed vegetables and yogurt", 720, 47, 84, 18, 9),
      makeMeal(d(-4), "Dinner", "Prawn noodles with edamame", 820, 52, 90, 24, 9),

      makeMeal(d(-5), "Breakfast", "Skyr bowl with granola and berries", 470, 34, 57, 12, 7),
      makeMeal(d(-5), "Lunch", "Cafeteria pasta with grilled chicken salad", 790, 46, 92, 25, 9),
      makeMeal(d(-5), "Dinner", "Chicken curry with rice", 760, 54, 76, 22, 8),

      makeMeal(d(-6), "Breakfast", "Dosa, sambar, and Greek yogurt", 610, 33, 84, 16, 11),
      makeMeal(d(-6), "Lunch", "Chicken salad bowl with quinoa", 650, 48, 58, 20, 10),
      makeMeal(d(-6), "Dinner", "Turkey pasta with vegetables", 810, 50, 92, 24, 10),
    ],
    weights: [
      { id: makeId("weight"), date: d(-8), weightKg: 84.1 },
      { id: makeId("weight"), date: d(-7), weightKg: 84.0 },
      { id: makeId("weight"), date: d(-6), weightKg: 83.9 },
      { id: makeId("weight"), date: d(-5), weightKg: 83.8 },
      { id: makeId("weight"), date: d(-4), weightKg: 83.7 },
      { id: makeId("weight"), date: d(-3), weightKg: 83.6 },
      { id: makeId("weight"), date: d(-2), weightKg: 83.5 },
      { id: makeId("weight"), date: d(-1), weightKg: 83.4 },
      { id: makeId("weight"), date: today, weightKg: 83.4 },
    ],
    workouts: [
      {
        id: makeId("workout"),
        date: today,
        type: "Gym",
        durationMinutes: 55,
        intensity: "Medium",
        notes: "Upper body strength. Prioritize protein before bed.",
      },
      {
        id: makeId("workout"),
        date: d(-2),
        type: "Badminton",
        durationMinutes: 75,
        intensity: "High",
        notes: "High-cardio session. Carbs were useful.",
      },
      {
        id: makeId("workout"),
        date: d(-5),
        type: "Gym",
        durationMinutes: 50,
        intensity: "Medium",
        notes: "Legs and pull work.",
      },
    ],
  };
}

function parseStoredStore(value: string | null): FitStore | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<FitStore>;
    if (!Array.isArray(parsed.meals) || !Array.isArray(parsed.weights) || !Array.isArray(parsed.workouts)) {
      return null;
    }

    return {
      profile: { ...DEFAULT_PROFILE, ...parsed.profile },
      targetCalories: typeof parsed.targetCalories === "number" ? parsed.targetCalories : 2200,
      meals: parsed.meals,
      weights: parsed.weights,
      workouts: parsed.workouts,
    };
  } catch {
    return null;
  }
}

function createEmptyMealForm(date: string): MealForm {
  return {
    date,
    mealType: "Dinner",
    description: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    confidence: "Medium",
    imageDataUrl: "",
  };
}

function createEmptyWeightForm(date: string): WeightForm {
  return {
    date,
    weightKg: "",
  };
}

function createEmptyWorkoutForm(date: string): WorkoutForm {
  return {
    date,
    type: "Gym",
    durationMinutes: "45",
    intensity: "Medium",
    notes: "",
  };
}

function getMealsForDate(meals: Meal[], date: string) {
  return meals
    .filter(meal => meal.date === date)
    .sort((a, b) => MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType));
}

function getLatestWeight(weights: WeightEntry[]) {
  return [...weights].sort((a, b) => b.date.localeCompare(a.date))[0];
}

function getWeightForDate(weights: WeightEntry[], date: string) {
  return weights.find(weight => weight.date === date);
}

function getDailyTotalsByDate(meals: Meal[], dates: string[]) {
  return dates.map(date => ({
    date,
    totals: sumMeals(getMealsForDate(meals, date)),
  }));
}

function getCoachMessages(totals: Totals, targetCalories: number, todaysMeals: Meal[], todaysWorkouts: Workout[]) {
  const remainingCalories = targetCalories - totals.calories;
  const remainingProtein = MACRO_TARGETS.protein - totals.protein;
  const hasWorkout = todaysWorkouts.some(workout => workout.type !== "Rest");
  const hasBadminton = todaysWorkouts.some(workout => workout.type === "Badminton");
  const hasDinner = todaysMeals.some(meal => meal.mealType === "Dinner");

  const messages = [];

  if (!hasDinner && remainingCalories > 450) {
    messages.push({
      title: "Dinner shape",
      body: `Aim for ${Math.max(35, Math.round(remainingProtein))} g protein inside about ${Math.round(remainingCalories)} kcal. Greek yogurt, eggs, tofu, chicken, fish, lentils, or cottage cheese can fit cleanly.`,
      color: ACCENT.green,
      icon: Leaf,
    });
  }

  if (hasWorkout && remainingProtein > 25) {
    messages.push({
      title: "Training recovery",
      body: "You trained today and protein is still open. Add a protein snack before changing the calorie target.",
      color: ACCENT.blue,
      icon: Dumbbell,
    });
  }

  if (hasBadminton) {
    messages.push({
      title: "Carb timing",
      body: "Badminton day can afford a little more carbohydrate around play. Keep dinner protein-forward.",
      color: ACCENT.orange,
      icon: Activity,
    });
  }

  if (totals.fiber >= MACRO_TARGETS.fiberMin) {
    messages.push({
      title: "Fiber handled",
      body: "Fiber is already in range. Keep the next choice easy to digest and protein-led.",
      color: ACCENT.teal,
      icon: CheckCircle2,
    });
  }

  if (messages.length === 0) {
    messages.push({
      title: "Good baseline",
      body: "Log one more honest meal and keep the protein anchor visible.",
      color: ACCENT.green,
      icon: Sparkles,
    });
  }

  return messages.slice(0, 3);
}

function getScore(totals: Totals, targetCalories: number) {
  const calorieGap = Math.abs(targetCalories - totals.calories);
  const calorieScore = clamp(4 - calorieGap / 220, 0, 4);
  const proteinScore = clamp((totals.protein / MACRO_TARGETS.protein) * 3, 0, 3);
  const fiberScore = clamp((totals.fiber / MACRO_TARGETS.fiberMin) * 2, 0, 2);
  const confidenceScore = totals.calories > 0 ? 1 : 0;
  return round(calorieScore + proteinScore + fiberScore + confidenceScore, 1);
}

function computeWeeklyReview(store: FitStore, today: string) {
  const dates = getWeekDates(today);
  const dailyTotals = getDailyTotalsByDate(store.meals, dates);
  const avgCalories = average(dailyTotals.map(day => day.totals.calories));
  const avgProtein = average(dailyTotals.map(day => day.totals.protein));
  const sortedWeights = [...store.weights].sort((a, b) => a.date.localeCompare(b.date));
  const recentWeights = sortedWeights.filter(weight => dates.includes(weight.date));
  const avgWeight = average(recentWeights.map(weight => weight.weightKg));
  const firstWeight = recentWeights[0];
  const latestWeight = recentWeights.at(-1);
  const daySpan = firstWeight && latestWeight
    ? Math.max(1, (parseISODate(latestWeight.date).getTime() - parseISODate(firstWeight.date).getTime()) / 86_400_000)
    : 7;
  const weeklyChange = firstWeight && latestWeight
    ? ((latestWeight.weightKg - firstWeight.weightKg) / daySpan) * 7
    : 0;

  let newTarget = store.targetCalories;
  let verdict = "Keep target steady";
  let recommendation = "Weight trend is inside the useful recomposition lane. Hold calories and make dinner protein-forward.";

  if (avgProtein < 120) {
    verdict = "Fix protein first";
    recommendation = "Protein average is below 120 g, so do not cut calories yet. Add one reliable protein snack daily.";
  } else if (weeklyChange > -0.2) {
    newTarget = store.targetCalories - 125;
    verdict = "Small calorie reduction";
    recommendation = "Loss is slower than target. Reduce by 100-150 kcal or add a daily walk before making a larger cut.";
  } else if (weeklyChange < -0.8) {
    newTarget = store.targetCalories + 125;
    verdict = "Add a little food";
    recommendation = "Loss is faster than needed. Add 100-150 kcal, preferably carbs around training or protein at dinner.";
  }

  return {
    avgCalories,
    avgProtein,
    avgWeight,
    weeklyChange,
    newTarget,
    verdict,
    recommendation,
    dailyTotals,
  };
}

function bmi(weightKg: number, profile: Profile) {
  const heightM = profile.heightCm / 100;
  return weightKg / (heightM * heightM);
}

function confidenceColor(confidence: Confidence) {
  if (confidence === "High") return ACCENT.green;
  if (confidence === "Medium") return ACCENT.orange;
  return ACCENT.red;
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border p-4 shadow-sm sm:p-5 ${className}`}
      style={{
        background: "color-mix(in srgb, var(--bg-card) 94%, white)",
        borderColor: "color-mix(in srgb, var(--border) 82%, transparent)",
      }}
    >
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
      {children}
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const inputClass =
  "min-h-10 w-full rounded-lg border px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]";

const inputStyle = {
  background: "var(--bg-card)",
  borderColor: "var(--border)",
  color: "var(--text)",
} satisfies React.CSSProperties;

function ProgressBar({
  value,
  target,
  color,
}: {
  value: number;
  target: number;
  color: string;
}) {
  const width = percentage(value, target);

  return (
    <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--border) 45%, transparent)" }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(width, 100)}%`, background: color }}
      />
    </div>
  );
}

function StatPill({
  label,
  value,
  color = ACCENT.slate,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-lg border px-3 py-2"
      style={{
        background: `${color}10`,
        borderColor: `${color}2e`,
      }}
    >
      <p className="text-[10px] font-mono uppercase tracking-[0.13em]" style={{ color }}>
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
        {value}
      </p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  icon: Icon,
  color = ACCENT.slate,
  type = "button",
}: {
  label: string;
  onClick?: () => void;
  icon: React.ComponentType<{ size?: number }>;
  color?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition hover:-translate-y-0.5 hover:shadow-sm"
      style={{ color, borderColor: `${color}35`, background: `${color}10` }}
      aria-label={label}
      title={label}
    >
      <Icon size={16} />
    </button>
  );
}

function ActionButton({
  children,
  icon: Icon,
  type = "button",
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ size?: number }>;
  type?: "button" | "submit";
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";

  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-sm"
      style={{
        background: isPrimary ? "var(--accent)" : "var(--bg-card)",
        borderColor: isPrimary ? "var(--accent)" : "var(--border)",
        color: isPrimary ? "var(--accent-contrast)" : "var(--text)",
      }}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

function CaloriesGauge({ totals, targetCalories, profile }: { totals: Totals; targetCalories: number; profile: Profile }) {
  const progress = percentage(totals.calories, targetCalories);
  const remaining = targetCalories - totals.calories;

  return (
    <div className="grid gap-5 md:grid-cols-[12rem_1fr] md:items-center">
      <div
        className="mx-auto grid h-44 w-44 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${ACCENT.green} 0 ${Math.min(progress, 100)}%, color-mix(in srgb, var(--border) 45%, transparent) ${Math.min(progress, 100)}% 100%)`,
        }}
      >
        <div className="grid h-32 w-32 place-items-center rounded-full text-center" style={{ background: "var(--bg-card)" }}>
          <div>
            <p className="text-3xl font-bold" style={{ color: "var(--text)" }}>
              {Math.round(totals.calories)}
            </p>
            <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
              of {targetCalories}
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatPill
            label="Remaining"
            value={`${remaining >= 0 ? remaining : Math.abs(remaining)} kcal ${remaining >= 0 ? "left" : "over"}`}
            color={remaining >= 0 ? ACCENT.green : ACCENT.red}
          />
          <StatPill label="Score" value={`${getScore(totals, targetCalories)} / 10`} color={ACCENT.blue} />
          <StatPill label="Target loss" value={`${profile.targetLossKg} kg/week`} color={ACCENT.orange} />
        </div>

        <div className="mt-5 grid gap-4">
          {[
            { label: "Protein", value: totals.protein, target: MACRO_TARGETS.protein, color: ACCENT.green, suffix: "g" },
            { label: "Carbs", value: totals.carbs, target: MACRO_TARGETS.carbs, color: ACCENT.blue, suffix: "g" },
            { label: "Fat", value: totals.fat, target: MACRO_TARGETS.fat, color: ACCENT.orange, suffix: "g" },
            { label: "Fiber", value: totals.fiber, target: MACRO_TARGETS.fiberMin, color: ACCENT.teal, suffix: "g" },
          ].map(item => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium" style={{ color: "var(--text)" }}>
                  {item.label}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {Math.round(item.value)} / {item.target}{item.suffix}
                </span>
              </div>
              <ProgressBar value={item.value} target={item.target} color={item.color} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MealState({ meals }: { meals: Meal[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {MEAL_TYPES.map(type => {
        const logged = meals.some(meal => meal.mealType === type);
        return (
          <div
            key={type}
            className="rounded-lg border px-3 py-3"
            style={{
              background: logged ? `${ACCENT.green}10` : "var(--bg-card)",
              borderColor: logged ? `${ACCENT.green}35` : "var(--border)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {type}
              </p>
              {logged ? <CheckCircle2 size={16} color={ACCENT.green} /> : <CalendarDays size={16} color={ACCENT.slate} />}
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {logged ? "Logged" : "Pending"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function MiniMealList({
  meals,
  onDelete,
}: {
  meals: Meal[];
  onDelete?: (id: string) => void;
}) {
  if (meals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-5 text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        No meals logged for this date.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {meals.map(meal => (
        <article
          key={meal.id}
          className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[4.5rem_1fr_auto]"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg" style={{ background: `${ACCENT.green}12` }}>
            {meal.imageDataUrl ? (
              <Image src={meal.imageDataUrl} alt="" width={96} height={96} unoptimized className="h-full w-full object-cover" />
            ) : (
              <Utensils size={20} color={ACCENT.green} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md px-2 py-1 text-[10px] font-mono uppercase tracking-[0.12em]" style={{ background: `${ACCENT.blue}12`, color: ACCENT.blue }}>
                {meal.mealType}
              </span>
              <span
                className="rounded-md px-2 py-1 text-[10px] font-mono uppercase tracking-[0.12em]"
                style={{
                  background: `${confidenceColor(meal.confidence)}12`,
                  color: confidenceColor(meal.confidence),
                }}
              >
                {meal.confidence}
              </span>
            </div>
            <h3 className="mt-2 text-sm font-semibold leading-snug" style={{ color: "var(--text)" }}>
              {meal.description}
            </h3>
            <p className="mt-2 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
              {meal.feedback}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span>{meal.calories} kcal</span>
              <span>{meal.protein}g P</span>
              <span>{meal.carbs}g C</span>
              <span>{meal.fat}g F</span>
              <span>{meal.fiber}g fiber</span>
            </div>
          </div>
          {onDelete && (
            <div className="self-start">
              <IconButton label="Delete meal" onClick={() => onDelete(meal.id)} icon={Trash2} color={ACCENT.red} />
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function MealFormPanel({
  form,
  setForm,
  onSubmit,
  onQuickMeal,
  onRepeatLatest,
}: {
  form: MealForm;
  setForm: React.Dispatch<React.SetStateAction<MealForm>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onQuickMeal: (quickMeal: typeof QUICK_MEALS[number]) => void;
  onRepeatLatest: () => void;
}) {
  function update<K extends keyof MealForm>(key: K, value: MealForm[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        update("imageDataUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <Panel>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: ACCENT.green }}>
            Add meal
          </p>
          <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
            Manual macro entry
          </h2>
        </div>
        <IconButton label="Repeat latest meal" onClick={onRepeatLatest} icon={RotateCcw} color={ACCENT.blue} />
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date">
            <input className={inputClass} style={inputStyle} type="date" value={form.date} onChange={event => update("date", event.target.value)} />
          </Field>
          <Field label="Meal">
            <select className={inputClass} style={inputStyle} value={form.mealType} onChange={event => update("mealType", event.target.value as MealType)}>
              {MEAL_TYPES.map(type => <option key={type}>{type}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-24 py-3`}
            style={inputStyle}
            value={form.description}
            onChange={event => update("description", event.target.value)}
            placeholder="Rice, beans, corn, salad, curd"
          />
        </Field>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <Field label="Kcal">
            <input className={inputClass} style={inputStyle} inputMode="numeric" value={form.calories} onChange={event => update("calories", event.target.value)} />
          </Field>
          <Field label="Protein">
            <input className={inputClass} style={inputStyle} inputMode="numeric" value={form.protein} onChange={event => update("protein", event.target.value)} />
          </Field>
          <Field label="Carbs">
            <input className={inputClass} style={inputStyle} inputMode="numeric" value={form.carbs} onChange={event => update("carbs", event.target.value)} />
          </Field>
          <Field label="Fat">
            <input className={inputClass} style={inputStyle} inputMode="numeric" value={form.fat} onChange={event => update("fat", event.target.value)} />
          </Field>
          <Field label="Fiber">
            <input className={inputClass} style={inputStyle} inputMode="numeric" value={form.fiber} onChange={event => update("fiber", event.target.value)} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
          <Field label="Confidence">
            <select className={inputClass} style={inputStyle} value={form.confidence} onChange={event => update("confidence", event.target.value as Confidence)}>
              {CONFIDENCE_LEVELS.map(level => <option key={level}>{level}</option>)}
            </select>
          </Field>
          <Field label="Photo">
            <label
              className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 text-sm"
              style={inputStyle}
            >
              <span className="truncate" style={{ color: form.imageDataUrl ? "var(--text)" : "var(--text-muted)" }}>
                {form.imageDataUrl ? "Image attached" : "Upload image"}
              </span>
              <Upload size={16} color={ACCENT.slate} />
              <input className="sr-only" type="file" accept="image/*" onChange={event => handleFile(event.target.files?.[0])} />
            </label>
          </Field>
        </div>

        {form.imageDataUrl && (
          <div className="relative h-28 overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <Image src={form.imageDataUrl} alt="" fill unoptimized className="object-cover" />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {QUICK_MEALS.map(quickMeal => (
            <button
              key={quickMeal.label}
              type="button"
              onClick={() => onQuickMeal(quickMeal)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              <RefreshCcw size={13} />
              {quickMeal.label}
            </button>
          ))}
        </div>

        <ActionButton type="submit" icon={Plus}>
          Save meal
        </ActionButton>
      </form>
    </Panel>
  );
}

function CoachPanel({
  totals,
  targetCalories,
  meals,
  workouts,
}: {
  totals: Totals;
  targetCalories: number;
  meals: Meal[];
  workouts: Workout[];
}) {
  const messages = getCoachMessages(totals, targetCalories, meals, workouts);

  return (
    <Panel>
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} color={ACCENT.orange} />
        <h2 className="text-lg font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
          Daily coach
        </h2>
      </div>

      <div className="grid gap-3">
        {messages.map(message => {
          const Icon = message.icon;
          return (
            <div key={message.title} className="rounded-lg border p-3" style={{ borderColor: `${message.color}35`, background: `${message.color}0f` }}>
              <div className="flex items-center gap-2">
                <Icon size={16} color={message.color} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {message.title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                {message.body}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
          Protein picks
        </p>
        <div className="flex flex-wrap gap-2">
          {PROTEIN_PICKS.map(swap => (
            <span key={swap} className="rounded-md border px-2.5 py-1.5 text-xs" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              {swap}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function DashboardView({
  date,
  today,
  store,
  meals,
  totals,
  workouts,
  mealForm,
  setMealForm,
  onMealSubmit,
  onQuickMeal,
  onRepeatLatest,
}: {
  date: string;
  today: string;
  store: FitStore;
  meals: Meal[];
  totals: Totals;
  workouts: Workout[];
  mealForm: MealForm;
  setMealForm: React.Dispatch<React.SetStateAction<MealForm>>;
  onMealSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onQuickMeal: (quickMeal: typeof QUICK_MEALS[number]) => void;
  onRepeatLatest: () => void;
}) {
  const latestWeight = getLatestWeight(store.weights);
  const review = computeWeeklyReview(store, today);
  const workoutsForDate = workouts.filter(workout => workout.date === date);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="grid gap-5">
        <Panel>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: ACCENT.green }}>
                {formatDate(date, { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <h2 className="mt-1 text-2xl font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
                Today&apos;s targets
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatPill label="Weight" value={latestWeight ? `${latestWeight.weightKg} kg` : "No entry"} color={ACCENT.blue} />
              <StatPill label="Weekly" value={review.verdict} color={ACCENT.orange} />
            </div>
          </div>

          <CaloriesGauge totals={totals} targetCalories={store.targetCalories} profile={store.profile} />
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <Apple size={18} color={ACCENT.green} />
            <h2 className="text-lg font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
              Meal state
            </h2>
          </div>
          <MealState meals={meals} />
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Utensils size={18} color={ACCENT.blue} />
              <h2 className="text-lg font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
                Logged meals
              </h2>
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {meals.length} entries
            </span>
          </div>
          <MiniMealList meals={meals} />
        </Panel>
      </div>

      <div className="grid content-start gap-5">
        <CoachPanel totals={totals} targetCalories={store.targetCalories} meals={meals} workouts={workoutsForDate} />
        <MealFormPanel
          form={mealForm}
          setForm={setMealForm}
          onSubmit={onMealSubmit}
          onQuickMeal={onQuickMeal}
          onRepeatLatest={onRepeatLatest}
        />
      </div>
    </div>
  );
}

function MealsView({
  selectedDate,
  setSelectedDate,
  meals,
  totals,
  targetCalories,
  mealForm,
  setMealForm,
  onMealSubmit,
  onQuickMeal,
  onRepeatLatest,
  onDeleteMeal,
}: {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  meals: Meal[];
  totals: Totals;
  targetCalories: number;
  mealForm: MealForm;
  setMealForm: React.Dispatch<React.SetStateAction<MealForm>>;
  onMealSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onQuickMeal: (quickMeal: typeof QUICK_MEALS[number]) => void;
  onRepeatLatest: () => void;
  onDeleteMeal: (id: string) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="grid content-start gap-5">
        <Panel>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: ACCENT.blue }}>
                Meal log
              </p>
              <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
                {formatDate(selectedDate, { weekday: "long", month: "long", day: "numeric" })}
              </h2>
            </div>
            <input
              className={inputClass}
              style={inputStyle}
              type="date"
              value={selectedDate}
              onChange={event => setSelectedDate(event.target.value)}
            />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <StatPill label="Calories" value={`${totals.calories} / ${targetCalories}`} color={ACCENT.green} />
            <StatPill label="Protein" value={`${totals.protein} / ${MACRO_TARGETS.protein}g`} color={ACCENT.blue} />
            <StatPill label="Carbs" value={`${totals.carbs}g`} color={ACCENT.orange} />
            <StatPill label="Fiber" value={`${totals.fiber}g`} color={ACCENT.teal} />
          </div>
        </Panel>

        <MealFormPanel
          form={mealForm}
          setForm={setMealForm}
          onSubmit={onMealSubmit}
          onQuickMeal={onQuickMeal}
          onRepeatLatest={onRepeatLatest}
        />
      </div>

      <Panel>
        <MiniMealList meals={meals} onDelete={onDeleteMeal} />
      </Panel>
    </div>
  );
}

function LineChart({
  points,
  color,
  suffix,
}: {
  points: { label: string; value: number }[];
  color: string;
  suffix: string;
}) {
  const width = 620;
  const height = 220;
  const padding = 26;
  const values = points.map(point => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.1, max - min);
  const path = points
    .map((point, index) => {
      const x = padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
      const y = padding + ((max - point.value) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Trend chart in ${suffix}`} className="h-56 w-full">
        <path d={`M ${padding} ${height - padding} H ${width - padding}`} stroke="color-mix(in srgb, var(--border) 80%, transparent)" strokeWidth="1" />
        <path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const x = padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
          const y = padding + ((max - point.value) / range) * (height - padding * 2);
          return (
            <g key={`${point.label}-${point.value}`}>
              <circle cx={x} cy={y} r="5" fill={color} />
              <text x={x} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function WeightView({
  store,
  selectedDate,
  weightForm,
  setWeightForm,
  onWeightSubmit,
  onDeleteWeight,
}: {
  store: FitStore;
  selectedDate: string;
  weightForm: WeightForm;
  setWeightForm: React.Dispatch<React.SetStateAction<WeightForm>>;
  onWeightSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteWeight: (id: string) => void;
}) {
  const sortedWeights = [...store.weights].sort((a, b) => a.date.localeCompare(b.date));
  const chartWeights = sortedWeights.slice(-10).map(entry => ({ label: formatWeekday(entry.date), value: entry.weightKg }));
  const latest = getLatestWeight(store.weights);
  const sevenDayAverage = average(sortedWeights.slice(-7).map(entry => entry.weightKg));
  const weightForSelectedDate = getWeightForDate(store.weights, selectedDate);

  function update<K extends keyof WeightForm>(key: K, value: WeightForm[K]) {
    setWeightForm(current => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid content-start gap-5">
        <Panel>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: ACCENT.blue }}>
                Weight trend
              </p>
              <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
                7-day signal
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatPill label="Latest" value={latest ? `${latest.weightKg} kg` : "-"} color={ACCENT.green} />
              <StatPill label="7-day avg" value={sevenDayAverage ? `${round(sevenDayAverage, 1)} kg` : "-"} color={ACCENT.blue} />
              <StatPill label="Goal" value={`${store.profile.goalWeightKg} kg`} color={ACCENT.orange} />
              <StatPill label="BMI" value={latest ? `${round(bmi(latest.weightKg, store.profile), 1)}` : "-"} color={ACCENT.teal} />
            </div>
          </div>
          {chartWeights.length > 1 ? (
            <LineChart points={chartWeights} color={ACCENT.blue} suffix="kg" />
          ) : (
            <div className="rounded-lg border border-dashed p-5 text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              Add two weigh-ins to draw the trend.
            </div>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
            Entries
          </h2>
          <div className="grid gap-2">
            {[...store.weights].sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {entry.weightKg} kg
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatDate(entry.date, { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                </div>
                <IconButton label="Delete weigh-in" onClick={() => onDeleteWeight(entry.id)} icon={Trash2} color={ACCENT.red} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="mb-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: ACCENT.green }}>
            Weigh-in
          </p>
          <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
            {weightForSelectedDate ? "Update entry" : "Add entry"}
          </h2>
        </div>

        <form onSubmit={onWeightSubmit} className="grid gap-4">
          <Field label="Date">
            <input className={inputClass} style={inputStyle} type="date" value={weightForm.date} onChange={event => update("date", event.target.value)} />
          </Field>
          <Field label="Weight kg">
            <input className={inputClass} style={inputStyle} inputMode="decimal" value={weightForm.weightKg} onChange={event => update("weightKg", event.target.value)} />
          </Field>
          <ActionButton type="submit" icon={Save}>
            Save weight
          </ActionButton>
        </form>
      </Panel>
    </div>
  );
}

function WorkoutView({
  store,
  workoutForm,
  setWorkoutForm,
  onWorkoutSubmit,
  onDeleteWorkout,
}: {
  store: FitStore;
  workoutForm: WorkoutForm;
  setWorkoutForm: React.Dispatch<React.SetStateAction<WorkoutForm>>;
  onWorkoutSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteWorkout: (id: string) => void;
}) {
  function update<K extends keyof WorkoutForm>(key: K, value: WorkoutForm[K]) {
    setWorkoutForm(current => ({ ...current, [key]: value }));
  }

  const trainingDays = store.workouts.filter(workout => workout.type !== "Rest").length;
  const totalMinutes = store.workouts.reduce((sum, workout) => sum + workout.durationMinutes, 0);
  const latestWorkout = [...store.workouts].sort((a, b) => b.date.localeCompare(a.date))[0];
  const weeklyGymSessions = store.workouts.filter(workout => workout.type === "Gym").length;

  function loadPlan(plan: (typeof GYM_PLANS)[number]) {
    setWorkoutForm(current => ({
      ...current,
      type: "Gym",
      durationMinutes: String(plan.duration),
      intensity: plan.intensity,
      notes: [
        `${plan.name}: ${plan.goal}`,
        "",
        ...plan.exercises.map(exercise => `- [ ] ${exercise}`),
        "",
        "Track: load, reps completed, RPE, and any pain or form notes.",
      ].join("\n"),
    }));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="grid content-start gap-5">
        <Panel>
          <div className="mb-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: ACCENT.orange }}>
              Apple Watch
            </p>
            <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
              Health-aware training
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {WATCH_METRICS.map(metric => (
              <StatPill key={metric.label} label={metric.label} value={metric.value} color={metric.color} />
            ))}
          </div>
          <div className="mt-4 grid gap-3 rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${ACCENT.green}12`, color: ACCENT.green }}>
                <Activity size={17} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  Integration path
                </p>
                <p className="mt-1 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                  Web apps cannot read Apple Health directly. V1 can import Health export files; native sync later needs an iPhone companion using HealthKit.
                </p>
              </div>
            </div>
            <div className="grid gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} color={ACCENT.green} />
                <span>Read active energy, steps, workout minutes, heart-rate zones, sleep, and body weight.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} color={ACCENT.green} />
                <span>Use watch workouts to adjust carbs and recovery prompts.</span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: ACCENT.blue }}>
              Training signal
            </p>
            <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
              Workout-aware macros
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Sessions" value={`${trainingDays}`} color={ACCENT.green} />
            <StatPill label="Minutes" value={`${totalMinutes}`} color={ACCENT.blue} />
            <StatPill label="Gym" value={`${weeklyGymSessions}`} color={ACCENT.orange} />
            <StatPill label="Protein" value="150g daily" color={ACCENT.teal} />
          </div>
          <p className="mt-4 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
            {latestWorkout
              ? `Last logged: ${latestWorkout.type} on ${formatDate(latestWorkout.date, { month: "short", day: "numeric" })}. Keep the next gym session focused and measurable.`
              : "Log your first session to connect training load with calories, protein, and recovery."}
          </p>
        </Panel>

        <Panel>
          <form onSubmit={onWorkoutSubmit} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date">
                <input className={inputClass} style={inputStyle} type="date" value={workoutForm.date} onChange={event => update("date", event.target.value)} />
              </Field>
              <Field label="Type">
                <select className={inputClass} style={inputStyle} value={workoutForm.type} onChange={event => update("type", event.target.value as WorkoutType)}>
                  {WORKOUT_TYPES.map(type => <option key={type}>{type}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Minutes">
                <input className={inputClass} style={inputStyle} inputMode="numeric" value={workoutForm.durationMinutes} onChange={event => update("durationMinutes", event.target.value)} />
              </Field>
              <Field label="Intensity">
                <select className={inputClass} style={inputStyle} value={workoutForm.intensity} onChange={event => update("intensity", event.target.value as Intensity)}>
                  {INTENSITIES.map(intensity => <option key={intensity}>{intensity}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea className={`${inputClass} min-h-24 py-3`} style={inputStyle} value={workoutForm.notes} onChange={event => update("notes", event.target.value)} />
            </Field>
            <ActionButton type="submit" icon={Plus}>
              Save workout
            </ActionButton>
          </form>
        </Panel>
      </div>

      <div className="grid content-start gap-5">
        <Panel>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: ACCENT.green }}>
                Gym coach
              </p>
              <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
                Suggested sessions
              </h2>
            </div>
            <div className="rounded-lg border px-3 py-2 text-xs font-mono uppercase tracking-[0.12em]" style={{ borderColor: `${ACCENT.green}30`, background: `${ACCENT.green}10`, color: ACCENT.green }}>
              Recomp block
            </div>
          </div>

          <div className="grid gap-3">
            {GYM_PLANS.map(plan => (
              <article key={plan.name} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                      {plan.goal}
                    </p>
                  </div>
                  <ActionButton icon={Dumbbell} variant="secondary" onClick={() => loadPlan(plan)}>
                    Use plan
                  </ActionButton>
                </div>
                <div className="mt-3 grid gap-2">
                  {plan.exercises.map(exercise => (
                    <div key={exercise} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in srgb, var(--border) 22%, transparent)" }}>
                      <span style={{ color: "var(--text)" }}>{exercise}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: ACCENT.orange }}>
              Workout history
            </p>
            <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
              Logged sessions
            </h2>
          </div>
          <div className="grid gap-3">
            {[...store.workouts].sort((a, b) => b.date.localeCompare(a.date)).map(workout => (
              <article key={workout.id} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: `${ACCENT.orange}12`, color: ACCENT.orange }}>
                      <Dumbbell size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {workout.type} · {workout.durationMinutes} min
                      </h3>
                      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatDate(workout.date, { weekday: "short", month: "short", day: "numeric" })} · {workout.intensity} intensity
                      </p>
                      {workout.notes && (
                        <p className="mt-2 whitespace-pre-line text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                          {workout.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <IconButton label="Delete workout" onClick={() => onDeleteWorkout(workout.id)} icon={Trash2} color={ACCENT.red} />
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function InsightsView({
  store,
  today,
  onApplyTarget,
}: {
  store: FitStore;
  today: string;
  onApplyTarget: (target: number) => void;
}) {
  const review = computeWeeklyReview(store, today);
  const weightEntries = [...store.weights].sort((a, b) => a.date.localeCompare(b.date));
  const latest = getLatestWeight(store.weights);
  const weightProgress = latest
    ? percentage(store.profile.startWeightKg - latest.weightKg, store.profile.startWeightKg - store.profile.goalWeightKg)
    : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <Panel>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: ACCENT.green }}>
              Weekly review
            </p>
            <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
              {review.verdict}
            </h2>
          </div>
          <ActionButton icon={Target} onClick={() => onApplyTarget(review.newTarget)} variant={review.newTarget === store.targetCalories ? "secondary" : "primary"}>
            Set {review.newTarget} kcal
          </ActionButton>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <StatPill label="Avg kcal" value={`${Math.round(review.avgCalories)}`} color={ACCENT.green} />
          <StatPill label="Avg protein" value={`${Math.round(review.avgProtein)}g`} color={ACCENT.blue} />
          <StatPill label="Avg weight" value={`${round(review.avgWeight, 1)} kg`} color={ACCENT.orange} />
          <StatPill label="Rate" value={`${round(review.weeklyChange, 2)} kg/wk`} color={review.weeklyChange < -0.8 ? ACCENT.red : ACCENT.teal} />
        </div>

        <p className="mt-5 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
          {review.recommendation}
        </p>

        <div className="mt-5 grid gap-3">
          {review.dailyTotals.map(day => (
            <div key={day.date} className="grid grid-cols-[3.5rem_1fr_4.5rem] items-center gap-3 text-sm">
              <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                {formatWeekday(day.date)}
              </span>
              <ProgressBar value={day.totals.calories} target={store.targetCalories} color={ACCENT.green} />
              <span className="text-right font-medium" style={{ color: "var(--text)" }}>
                {day.totals.calories}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid content-start gap-5">
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <TrendingDown size={18} color={ACCENT.blue} />
            <h2 className="text-lg font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
              Recomp progress
            </h2>
          </div>
          <div className="grid gap-4">
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span style={{ color: "var(--text-muted)" }}>{store.profile.startWeightKg} kg to {store.profile.goalWeightKg} kg</span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {weightProgress}%
                </span>
              </div>
              <ProgressBar value={store.profile.startWeightKg - (latest?.weightKg ?? store.profile.startWeightKg)} target={store.profile.startWeightKg - store.profile.goalWeightKg} color={ACCENT.blue} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatPill label="BMR" value={`~${store.profile.bmr} kcal`} color={ACCENT.teal} />
              <StatPill label="Maintenance" value={store.profile.maintenance} color={ACCENT.orange} />
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={18} color={ACCENT.orange} />
            <h2 className="text-lg font-bold" style={{ color: "var(--text)", fontFamily: font.serif }}>
              Next best moves
            </h2>
          </div>
          <div className="grid gap-3">
            {[
              "Keep calories near target before reducing further.",
              "Add one high-protein fallback meal for busy evenings.",
              "On badminton days, place more carbs before or after play.",
              "Use low-confidence meal estimates as trend data, not truth.",
            ].map(item => (
              <div key={item} className="flex gap-3 rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <CheckCircle2 size={16} color={ACCENT.green} className="mt-0.5 flex-shrink-0" />
                <p className="text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        {weightEntries.length > 1 && (
          <Panel>
            <LineChart points={weightEntries.slice(-7).map(entry => ({ label: formatWeekday(entry.date), value: entry.weightKg }))} color={ACCENT.blue} suffix="kg" />
          </Panel>
        )}
      </div>
    </div>
  );
}

function ProfileChip({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}) {
  return (
    <div
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2"
      style={{
        background: `${color}12`,
        borderColor: `${color}35`,
      }}
    >
      <Icon size={15} color={color} />
      <span className="text-[10px] font-mono uppercase tracking-[0.13em]" style={{ color }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}

function ProfileTags({ profile }: { profile: Profile }) {
  const tags = [
    { label: "Name", value: profile.name, color: ACCENT.green, icon: UserRound },
    { label: "Sex", value: profile.sex, color: ACCENT.blue, icon: UserRound },
    { label: "Age", value: String(profile.age), color: ACCENT.orange, icon: CalendarDays },
    { label: "Height", value: `${profile.heightCm} cm`, color: ACCENT.teal, icon: Scale },
    { label: "Food style", value: profile.dietType, color: ACCENT.pink, icon: Utensils },
    { label: "Training", value: profile.training, color: ACCENT.slate, icon: Dumbbell },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tags.map(tag => <ProfileChip key={tag.label} {...tag} />)}
    </div>
  );
}

function ProfileEditor({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (profile: Profile) => void;
}) {
  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    onChange({ ...profile, [key]: value });
  }

  return (
    <div
      className="mt-4 rounded-lg border p-4"
      style={{ background: "color-mix(in srgb, var(--bg-card) 72%, transparent)", borderColor: "var(--border)" }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name">
          <input className={inputClass} style={inputStyle} value={profile.name} onChange={event => update("name", event.target.value)} />
        </Field>
        <Field label="Sex">
          <input className={inputClass} style={inputStyle} value={profile.sex} onChange={event => update("sex", event.target.value)} />
        </Field>
        <Field label="Age">
          <input className={inputClass} style={inputStyle} inputMode="numeric" value={profile.age} onChange={event => update("age", Math.max(0, Math.round(numberOrZero(event.target.value))))} />
        </Field>
        <Field label="Height cm">
          <input className={inputClass} style={inputStyle} inputMode="numeric" value={profile.heightCm} onChange={event => update("heightCm", Math.max(0, Math.round(numberOrZero(event.target.value))))} />
        </Field>
        <Field label="Start kg">
          <input className={inputClass} style={inputStyle} inputMode="decimal" value={profile.startWeightKg} onChange={event => update("startWeightKg", round(numberOrZero(event.target.value), 1))} />
        </Field>
        <Field label="Goal kg">
          <input className={inputClass} style={inputStyle} inputMode="decimal" value={profile.goalWeightKg} onChange={event => update("goalWeightKg", round(numberOrZero(event.target.value), 1))} />
        </Field>
        <Field label="Food style">
          <input className={inputClass} style={inputStyle} value={profile.dietType} onChange={event => update("dietType", event.target.value)} />
        </Field>
        <Field label="Training">
          <input className={inputClass} style={inputStyle} value={profile.training} onChange={event => update("training", event.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function Header({
  today,
  selectedDate,
  setSelectedDate,
  activeView,
  setActiveView,
  onReset,
  profile,
  onProfileChange,
}: {
  today: string;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  activeView: View;
  setActiveView: (view: View) => void;
  onReset: () => void;
  profile: Profile;
  onProfileChange: (profile: Profile) => void;
}) {
  const [editingProfile, setEditingProfile] = useState(false);

  return (
    <div className="mb-6 space-y-4">
      <section
        className="overflow-hidden rounded-lg border p-4 sm:p-5"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--bg-card) 96%, transparent), color-mix(in srgb, var(--accent) 5%, var(--bg-card)))",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-4">
            <RecompLogo size="lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: ACCENT.green }}>
                self-hosted recomp tracker
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl" style={{ color: "var(--text)", fontFamily: font.serif }}>
                Recomp
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                AI-assisted nutrition, training, and trend-weight tracking for your own setup.
              </p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 rounded-lg border p-1.5 sm:w-auto" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <input
              className={`${inputClass} min-w-0 flex-1 border-0 sm:w-[10.5rem] sm:flex-none`}
              style={inputStyle}
              type="date"
              value={selectedDate}
              onChange={event => setSelectedDate(event.target.value)}
              aria-label="Selected date"
            />
            <IconButton label="Reset demo data" onClick={onReset} icon={RefreshCcw} color={ACCENT.orange} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <ProfileTags profile={profile} />
          <div className="flex flex-wrap gap-2">
            <StatPill label="Start" value={`${profile.startWeightKg} kg`} color={ACCENT.slate} />
            <StatPill label="Goal" value={`${profile.goalWeightKg} kg`} color={ACCENT.green} />
            <StatPill label="Today" value={formatDate(today, { month: "short", day: "numeric" })} color={ACCENT.blue} />
            <IconButton
              label={editingProfile ? "Close profile editor" : "Edit profile"}
              onClick={() => setEditingProfile(open => !open)}
              icon={Pencil}
              color={ACCENT.teal}
            />
          </div>
        </div>

        {editingProfile && <ProfileEditor profile={profile} onChange={onProfileChange} />}
      </section>

      <div
        className="grid grid-cols-5 gap-1 rounded-lg border p-1.5 sm:p-2"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        {VIEW_ITEMS.map(item => {
          const Icon = item.icon;
          const active = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className="inline-flex flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 text-[9px] font-semibold transition sm:min-h-10 sm:flex-row sm:gap-2 sm:px-3 sm:py-0 sm:text-sm"
              style={{
                background: active ? "var(--accent)" : "transparent",
                color: active ? "var(--accent-contrast)" : "var(--text-muted)",
              }}
            >
              <Icon size={16} />
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AppTopBar() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await fetch("/api/access/session", { method: "DELETE" });
      await signOut({ redirectTo: "/login" });
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        background: "color-mix(in srgb, var(--bg) 92%, transparent)",
        borderColor: "var(--border)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <RecompLogo />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
              Recomp
            </p>
            <p className="hidden text-xs sm:block" style={{ color: "var(--text-muted)" }}>
              Self-hosted AI-assisted body recomposition tracker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            aria-label="Sign out"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border transition hover:opacity-75 disabled:cursor-wait disabled:opacity-50"
            disabled={isSigningOut}
            onClick={() => void handleSignOut()}
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            title="Sign out"
            type="button"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}

function RecompLogo({ size = "sm" }: { size?: "sm" | "lg" }) {
  const isLarge = size === "lg";
  const boxClass = isLarge ? "h-16 w-16 rounded-2xl" : "h-10 w-10 rounded-xl";

  return (
    <motion.div
      className={`group relative flex flex-shrink-0 items-center justify-center overflow-hidden border ${boxClass}`}
      style={{
        background:
          "linear-gradient(145deg, color-mix(in srgb, var(--bg-card) 95%, white), var(--bg-card))",
        borderColor: "color-mix(in srgb, var(--border) 78%, transparent)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 34px rgba(0,0,0,0.16)",
      }}
      initial="rest"
      whileHover="active"
      whileFocus="active"
      whileTap={{ scale: 0.98 }}
      variants={{
        rest: { scale: 1 },
        active: { scale: 1.04 },
      }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      aria-label="Recomp"
      tabIndex={0}
    >
      <svg
        viewBox="0 0 64 64"
        className="h-[80%] w-[80%]"
        role="img"
        aria-hidden
      >
        <motion.g
          style={{ originX: "32px", originY: "32px" }}
          variants={{
            rest: { rotate: 0, scale: 1 },
            active: { rotate: -3, scale: 1.03 },
          }}
          transition={{ type: "spring", stiffness: 180, damping: 18 }}
        >
          <path
            d="M32 9.5 C22 9.5 16 16.8 18.2 27.8 C12.2 35.8 16.8 52.4 32 53.2 C47.2 52.4 51.8 35.8 45.8 27.8 C48 16.8 42 9.5 32 9.5 Z"
            fill="none"
            stroke={ACCENT.orange}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.48"
          />
          <path
            d="M32 14.8 C24.7 14.8 20.1 20.3 21.8 28.7 C17.5 35 21 47.2 32 48 C43 47.2 46.5 35 42.2 28.7 C43.9 20.3 39.3 14.8 32 14.8 Z"
            fill="none"
            stroke={ACCENT.blue}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
          <path
            d="M32 20.2 C27.4 20.2 24.3 24 25.5 30.2 C22.8 35 25.5 42.1 32 43 C38.5 42.1 41.2 35 38.5 30.2 C39.7 24 36.6 20.2 32 20.2 Z"
            fill="none"
            stroke={ACCENT.green}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        </motion.g>

        <motion.path
          d="M20.5 31.5 C26.5 28.7 37.5 28.7 43.5 31.5"
          fill="none"
          stroke="color-mix(in srgb, var(--text) 78%, transparent)"
          strokeWidth="3"
          strokeLinecap="round"
          variants={{
            rest: { pathLength: 0.72, opacity: 0.78 },
            active: { pathLength: 1, opacity: 0.95 },
          }}
          transition={{ duration: 0.36, ease: "easeOut" }}
        />
        <motion.path
          d="M24 39 C28.8 42.2 35.2 42.2 40 39"
          fill="none"
          stroke="color-mix(in srgb, var(--text) 70%, transparent)"
          strokeWidth="3"
          strokeLinecap="round"
          variants={{
            rest: { pathLength: 0.62, opacity: 0.58 },
            active: { pathLength: 0.98, opacity: 0.86 },
          }}
          transition={{ duration: 0.36, ease: "easeOut" }}
        />
        <motion.path
          d="M47.5 16.5 C43.5 15.6 39.8 16.4 36.8 19"
          fill="none"
          stroke={ACCENT.green}
          strokeWidth="3"
          strokeLinecap="round"
          variants={{
            rest: { pathLength: 0.72, opacity: 0.7 },
            active: { pathLength: 1, opacity: 1 },
          }}
          transition={{ duration: 0.34, ease: "easeOut" }}
        />
        <motion.path
          d="M16.5 47.5 C21 49 25.5 48.3 29.2 45.4"
          fill="none"
          stroke={ACCENT.orange}
          strokeWidth="3"
          strokeLinecap="round"
          variants={{
            rest: { pathLength: 1, opacity: 0.62 },
            active: { pathLength: 0.58, opacity: 0.34 },
          }}
          transition={{ duration: 0.34, ease: "easeOut" }}
        />

        <motion.circle
          cx="32"
          cy="32"
          r="2.6"
          fill="var(--text)"
          variants={{
            rest: { scale: 0.9, opacity: 0.78 },
            active: { scale: 1.15, opacity: 1 },
          }}
          style={{ originX: "32px", originY: "32px" }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        />
      </svg>
    </motion.div>
  );
}

function AppCredit() {
  return (
    <footer className="mx-auto max-w-7xl px-4 pb-8 pt-2 text-center sm:px-6 lg:px-8">
      <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
        by _ae
      </p>
    </footer>
  );
}

export function RecompApp() {
  const initialToday = toISODate(new Date());
  const [today, setToday] = useState(initialToday);
  const [selectedDate, setSelectedDate] = useState(initialToday);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [store, setStore] = useState<FitStore>(() => createSeedStore(initialToday));
  const [hydrated, setHydrated] = useState(false);
  const [mealForm, setMealForm] = useState<MealForm>(() => createEmptyMealForm(initialToday));
  const [weightForm, setWeightForm] = useState<WeightForm>(() => createEmptyWeightForm(initialToday));
  const [workoutForm, setWorkoutForm] = useState<WorkoutForm>(() => createEmptyWorkoutForm(initialToday));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentDate = toISODate(new Date());
      const stored = parseStoredStore(window.localStorage.getItem(STORAGE_KEY));
      setToday(currentDate);
      setSelectedDate(currentDate);
      setMealForm(createEmptyMealForm(currentDate));
      setWeightForm(createEmptyWeightForm(currentDate));
      setWorkoutForm(createEmptyWorkoutForm(currentDate));
      setStore(stored ?? createSeedStore(currentDate));
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [hydrated, store]);

  const mealsForSelectedDate = useMemo(() => getMealsForDate(store.meals, selectedDate), [store.meals, selectedDate]);
  const totalsForSelectedDate = useMemo(() => sumMeals(mealsForSelectedDate), [mealsForSelectedDate]);
  const workoutsForSelectedDate = useMemo(
    () => store.workouts.filter(workout => workout.date === selectedDate),
    [selectedDate, store.workouts]
  );

  function saveMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const description = mealForm.description.trim();
    if (!description || !mealForm.date) return;

    const mealBase = {
      id: makeId("meal"),
      date: mealForm.date,
      mealType: mealForm.mealType,
      description,
      imageDataUrl: mealForm.imageDataUrl || undefined,
      calories: numberOrZero(mealForm.calories),
      protein: numberOrZero(mealForm.protein),
      carbs: numberOrZero(mealForm.carbs),
      fat: numberOrZero(mealForm.fat),
      fiber: numberOrZero(mealForm.fiber),
      confidence: mealForm.confidence,
      createdAt: new Date().toISOString(),
      feedback: "",
    };

    const meal = {
      ...mealBase,
      feedback: buildMealFeedback(mealBase),
    };

    setStore(current => ({
      ...current,
      meals: [meal, ...current.meals],
    }));
    setSelectedDate(mealForm.date);
    setMealForm(createEmptyMealForm(mealForm.date));
  }

  function applyQuickMeal(quickMeal: typeof QUICK_MEALS[number]) {
    setMealForm(current => ({
      ...current,
      mealType: quickMeal.mealType,
      description: quickMeal.description,
      calories: String(quickMeal.calories),
      protein: String(quickMeal.protein),
      carbs: String(quickMeal.carbs),
      fat: String(quickMeal.fat),
      fiber: String(quickMeal.fiber),
      confidence: quickMeal.confidence,
    }));
  }

  function repeatLatestMeal() {
    const latest = [...store.meals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!latest) return;

    setMealForm(current => ({
      ...current,
      mealType: latest.mealType,
      description: latest.description,
      calories: String(latest.calories),
      protein: String(latest.protein),
      carbs: String(latest.carbs),
      fat: String(latest.fat),
      fiber: String(latest.fiber),
      confidence: latest.confidence,
      imageDataUrl: latest.imageDataUrl ?? "",
    }));
  }

  function deleteMeal(id: string) {
    setStore(current => ({
      ...current,
      meals: current.meals.filter(meal => meal.id !== id),
    }));
  }

  function saveWeight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const weightKg = Number(weightForm.weightKg);
    if (!weightForm.date || !Number.isFinite(weightKg) || weightKg <= 0) return;

    setStore(current => ({
      ...current,
      weights: [
        ...current.weights.filter(entry => entry.date !== weightForm.date),
        { id: makeId("weight"), date: weightForm.date, weightKg: round(weightKg, 1) },
      ],
    }));
    setWeightForm(createEmptyWeightForm(weightForm.date));
  }

  function deleteWeight(id: string) {
    setStore(current => ({
      ...current,
      weights: current.weights.filter(entry => entry.id !== id),
    }));
  }

  function saveWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workoutForm.date) return;

    setStore(current => ({
      ...current,
      workouts: [
        {
          id: makeId("workout"),
          date: workoutForm.date,
          type: workoutForm.type,
          durationMinutes: Math.round(numberOrZero(workoutForm.durationMinutes)),
          intensity: workoutForm.intensity,
          notes: workoutForm.notes.trim(),
        },
        ...current.workouts,
      ],
    }));
    setWorkoutForm(createEmptyWorkoutForm(workoutForm.date));
  }

  function deleteWorkout(id: string) {
    setStore(current => ({
      ...current,
      workouts: current.workouts.filter(workout => workout.id !== id),
    }));
  }

  function applyTarget(target: number) {
    setStore(current => ({ ...current, targetCalories: target }));
  }

  function updateProfile(profile: Profile) {
    setStore(current => ({ ...current, profile }));
  }

  function resetDemoData() {
    const fresh = createSeedStore(today, store.profile);
    setStore(fresh);
    setSelectedDate(today);
    setMealForm(createEmptyMealForm(today));
    setWeightForm(createEmptyWeightForm(today));
    setWorkoutForm(createEmptyWorkoutForm(today));
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--bg) 88%, #eef7f1) 0%, var(--bg) 44%, color-mix(in srgb, var(--bg) 92%, #eef3ff) 100%)",
      }}
    >
      <AppTopBar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <Header
          today={today}
          selectedDate={selectedDate}
          setSelectedDate={(date) => {
            setSelectedDate(date);
            setMealForm(current => ({ ...current, date }));
            setWeightForm(current => ({ ...current, date }));
            setWorkoutForm(current => ({ ...current, date }));
          }}
          activeView={activeView}
          setActiveView={setActiveView}
          onReset={resetDemoData}
          profile={store.profile}
          onProfileChange={updateProfile}
        />

        {activeView === "dashboard" && (
          <DashboardView
            date={selectedDate}
            today={today}
            store={store}
            meals={mealsForSelectedDate}
            totals={totalsForSelectedDate}
            workouts={workoutsForSelectedDate}
            mealForm={mealForm}
            setMealForm={setMealForm}
            onMealSubmit={saveMeal}
            onQuickMeal={applyQuickMeal}
            onRepeatLatest={repeatLatestMeal}
          />
        )}

        {activeView === "meals" && (
          <MealsView
            selectedDate={selectedDate}
            setSelectedDate={(date) => {
              setSelectedDate(date);
              setMealForm(current => ({ ...current, date }));
            }}
            meals={mealsForSelectedDate}
            totals={totalsForSelectedDate}
            targetCalories={store.targetCalories}
            mealForm={mealForm}
            setMealForm={setMealForm}
            onMealSubmit={saveMeal}
            onQuickMeal={applyQuickMeal}
            onRepeatLatest={repeatLatestMeal}
            onDeleteMeal={deleteMeal}
          />
        )}

        {activeView === "weight" && (
          <WeightView
            store={store}
            selectedDate={selectedDate}
            weightForm={weightForm}
            setWeightForm={setWeightForm}
            onWeightSubmit={saveWeight}
            onDeleteWeight={deleteWeight}
          />
        )}

        {activeView === "workouts" && (
          <WorkoutView
            store={store}
            workoutForm={workoutForm}
            setWorkoutForm={setWorkoutForm}
            onWorkoutSubmit={saveWorkout}
            onDeleteWorkout={deleteWorkout}
          />
        )}

        {activeView === "insights" && (
          <InsightsView store={store} today={today} onApplyTarget={applyTarget} />
        )}
      </main>

      <AppCredit />
    </div>
  );
}
