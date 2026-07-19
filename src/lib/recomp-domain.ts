export type MacroSet = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type MealSlot = "Breakfast" | "Lunch" | "Snack" | "Dinner";
export type Muscle =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "core"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

export type FoodDefinition = MacroSet & {
  id: string;
  name: string;
  serving: string;
  category: "Everyday" | "Protein" | "Carb" | "Produce" | "Dish";
  quantityStep?: number;
  aliases?: string[];
};

export type MealItem = MacroSet & {
  id: string;
  foodId: string;
  name: string;
  quantity: number;
  quantityStep?: number;
  serving: string;
};

export type MealEntry = {
  id: string;
  date: string;
  slot: MealSlot;
  items: MealItem[];
  photo?: string;
  source: "manual" | "photo";
  recognitionLabel?: string;
  confidence?: number;
  createdAt: string;
};

export type ExerciseDefinition = {
  id: string;
  name: string;
  cue: string;
  primary: Muscle[];
  secondary: Muscle[];
  sets: number;
  reps: string;
};

export type RoutineDefinition = {
  id: string;
  name: string;
  shortName: string;
  duration: number;
  level: "Beginner" | "Regular";
  focus: string;
  why: string;
  exercises: ExerciseDefinition[];
};

export type ExerciseSet = {
  id: string;
  reps: number;
  weightKg: number;
  completed: boolean;
};

export type ExerciseLog = {
  exerciseId: string;
  name: string;
  primary: Muscle[];
  secondary: Muscle[];
  sets: ExerciseSet[];
};

export type StrengthSession = {
  id: string;
  date: string;
  routineId: string;
  routineName: string;
  exercises: ExerciseLog[];
  completedAt: string;
};

export type ActivityType =
  | "Running"
  | "Walking"
  | "Cycling"
  | "Badminton"
  | "Football"
  | "Swimming"
  | "Tennis"
  | "Hiking"
  | "Mobility";

export type ActivityEntry = {
  id: string;
  date: string;
  type: ActivityType;
  durationMinutes: number;
  distanceKm?: number;
  intensity: "Easy" | "Moderate" | "Hard";
};

export type GoalSettings = {
  goal: "Lose fat" | "Build muscle" | "Recompose" | "Maintain";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  trainingDays: number;
  sleepHours: number;
};

export type WeightEntry = {
  id: string;
  date: string;
  weightKg: number;
};

export type SleepQuality = 1 | 2 | 3 | 4 | 5;

export type SleepEntry = {
  id: string;
  date: string;
  bedtime: string;
  wakeTime: string;
  durationMinutes: number;
  quality: SleepQuality;
  interruptions: number;
  note?: string;
  source: "manual" | "apple-health" | "health-connect";
};

export type BodyProfile = {
  createdAt: string;
  frontPhoto: string;
  sidePhoto?: string;
  shoulderScale: number;
  torsoScale: number;
  waistScale: number;
  hipScale: number;
  thighScale: number;
  depthScale: number;
  confidence: "High" | "Medium" | "Low";
};

export type RecompStore = {
  goals: GoalSettings;
  meals: MealEntry[];
  strengthSessions: StrengthSession[];
  activities: ActivityEntry[];
  weights: WeightEntry[];
  sleepEntries: SleepEntry[];
  bodyProfile?: BodyProfile;
  remindersEnabled: boolean;
};

export const EMPTY_MACROS: MacroSet = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

export const FOOD_LIBRARY: FoodDefinition[] = [
  { id: "banana", name: "Banana", serving: "1 medium", category: "Produce", quantityStep: 1, calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1 },
  { id: "apple", name: "Apple", serving: "1 medium", category: "Produce", quantityStep: 1, calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4 },
  { id: "egg", name: "Egg", serving: "1 large", category: "Protein", quantityStep: 1, calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0 },
  { id: "greek-yogurt", name: "Greek yogurt", serving: "200 g", category: "Protein", calories: 146, protein: 20, carbs: 8, fat: 4, fiber: 0 },
  { id: "whey", name: "Whey protein", serving: "1 scoop", category: "Protein", calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0 },
  { id: "chicken", name: "Chicken breast", serving: "150 g cooked", category: "Protein", calories: 248, protein: 46, carbs: 0, fat: 5.4, fiber: 0 },
  { id: "salmon", name: "Salmon", serving: "150 g cooked", category: "Protein", calories: 312, protein: 33, carbs: 0, fat: 18, fiber: 0 },
  { id: "tofu", name: "Firm tofu", serving: "150 g", category: "Protein", calories: 216, protein: 23, carbs: 4, fat: 13, fiber: 3 },
  { id: "lentils", name: "Lentils", serving: "1 cup cooked", category: "Protein", calories: 230, protein: 18, carbs: 40, fat: 0.8, fiber: 15.6 },
  { id: "cottage-cheese", name: "Cottage cheese", serving: "200 g", category: "Protein", calories: 196, protein: 24, carbs: 7, fat: 8, fiber: 0 },
  { id: "rice", name: "Cooked rice", serving: "1 cup", category: "Carb", calories: 205, protein: 4.3, carbs: 45, fat: 0.4, fiber: 0.6 },
  { id: "oats", name: "Oats", serving: "60 g dry", category: "Carb", calories: 228, protein: 7.5, carbs: 40, fat: 4.5, fiber: 6 },
  { id: "bread", name: "Wholegrain bread", serving: "2 slices", category: "Carb", calories: 190, protein: 8, carbs: 32, fat: 3, fiber: 6 },
  { id: "potato", name: "Potato", serving: "250 g cooked", category: "Carb", calories: 193, protein: 5, carbs: 43, fat: 0.3, fiber: 4.5 },
  { id: "milk", name: "Semi-skimmed milk", serving: "250 ml", category: "Everyday", calories: 118, protein: 8.5, carbs: 12, fat: 4.5, fiber: 0 },
  { id: "olive-oil", name: "Olive oil", serving: "1 tbsp", category: "Everyday", calories: 119, protein: 0, carbs: 0, fat: 13.5, fiber: 0 },
  { id: "peanut-butter", name: "Peanut butter", serving: "1 tbsp", category: "Everyday", calories: 95, protein: 3.6, carbs: 3.5, fat: 8, fiber: 1 },
  { id: "mixed-vegetables", name: "Mixed vegetables", serving: "200 g", category: "Produce", calories: 110, protein: 6, carbs: 20, fat: 1, fiber: 7 },
  { id: "avocado", name: "Avocado", serving: "1/2 fruit", category: "Produce", calories: 161, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7 },
  { id: "omelette", name: "Vegetable omelette", serving: "1 plate", category: "Dish", calories: 390, protein: 27, carbs: 11, fat: 26, fiber: 3, aliases: ["omelette", "eggs benedict", "huevos rancheros"] },
  { id: "chicken-curry", name: "Chicken curry", serving: "1 bowl", category: "Dish", calories: 430, protein: 38, carbs: 18, fat: 23, fiber: 4, aliases: ["chicken curry"] },
  { id: "fried-rice", name: "Fried rice", serving: "1 plate", category: "Dish", calories: 520, protein: 16, carbs: 78, fat: 16, fiber: 5, aliases: ["fried rice", "bibimbap", "paella", "risotto"] },
  { id: "pizza", name: "Pizza", serving: "2 slices", category: "Dish", calories: 560, protein: 24, carbs: 66, fat: 22, fiber: 5, aliases: ["pizza"] },
  { id: "greek-salad", name: "Greek salad", serving: "1 bowl", category: "Dish", calories: 310, protein: 9, carbs: 18, fat: 23, fiber: 6, aliases: ["greek salad", "caesar salad", "beet salad"] },
  { id: "grilled-salmon", name: "Grilled salmon meal", serving: "1 plate", category: "Dish", calories: 610, protein: 42, carbs: 48, fat: 27, fiber: 6, aliases: ["grilled salmon"] },
  { id: "pancakes", name: "Pancakes", serving: "3 medium", category: "Dish", calories: 470, protein: 13, carbs: 75, fat: 13, fiber: 3, aliases: ["pancakes", "waffles", "french toast"] },
  { id: "sushi", name: "Sushi", serving: "8 pieces", category: "Dish", calories: 420, protein: 22, carbs: 65, fat: 9, fiber: 4, aliases: ["sushi", "sashimi"] },
  { id: "ramen", name: "Ramen", serving: "1 bowl", category: "Dish", calories: 620, protein: 28, carbs: 82, fat: 21, fiber: 5, aliases: ["ramen", "pho"] },
  { id: "burger", name: "Burger", serving: "1 burger", category: "Dish", calories: 610, protein: 32, carbs: 49, fat: 31, fiber: 3, aliases: ["hamburger", "club sandwich", "pulled pork sandwich"] },
  { id: "tacos", name: "Tacos", serving: "3 tacos", category: "Dish", calories: 540, protein: 28, carbs: 58, fat: 23, fiber: 8, aliases: ["tacos"] },
  { id: "falafel", name: "Falafel plate", serving: "1 plate", category: "Dish", calories: 570, protein: 21, carbs: 68, fat: 24, fiber: 13, aliases: ["falafel", "hummus"] },
];

const bench: ExerciseDefinition = {
  id: "bench-press",
  name: "Bench press",
  cue: "Lower with control; press while keeping shoulder blades set.",
  primary: ["chest"],
  secondary: ["triceps", "shoulders"],
  sets: 3,
  reps: "6-10",
};

const row: ExerciseDefinition = {
  id: "cable-row",
  name: "Seated cable row",
  cue: "Drive elbows back without leaning or shrugging.",
  primary: ["back"],
  secondary: ["biceps"],
  sets: 3,
  reps: "8-12",
};

const squat: ExerciseDefinition = {
  id: "goblet-squat",
  name: "Goblet squat",
  cue: "Sit between the hips and keep the whole foot planted.",
  primary: ["quads", "glutes"],
  secondary: ["core"],
  sets: 3,
  reps: "8-12",
};

const hinge: ExerciseDefinition = {
  id: "romanian-deadlift",
  name: "Romanian deadlift",
  cue: "Push hips back and keep the weight close to the legs.",
  primary: ["hamstrings", "glutes"],
  secondary: ["back", "core"],
  sets: 3,
  reps: "8-10",
};

const pulldown: ExerciseDefinition = {
  id: "lat-pulldown",
  name: "Lat pulldown",
  cue: "Pull elbows toward your pockets; avoid swinging.",
  primary: ["back"],
  secondary: ["biceps"],
  sets: 3,
  reps: "8-12",
};

const shoulderPress: ExerciseDefinition = {
  id: "shoulder-press",
  name: "Dumbbell shoulder press",
  cue: "Stack wrists over elbows and finish without arching.",
  primary: ["shoulders"],
  secondary: ["triceps", "core"],
  sets: 3,
  reps: "8-12",
};

const splitSquat: ExerciseDefinition = {
  id: "split-squat",
  name: "Split squat",
  cue: "Drop straight down and drive through the front foot.",
  primary: ["quads", "glutes"],
  secondary: ["hamstrings", "core"],
  sets: 3,
  reps: "8 each",
};

const plank: ExerciseDefinition = {
  id: "plank",
  name: "Plank",
  cue: "Brace as if preparing for a punch; keep ribs down.",
  primary: ["core"],
  secondary: ["shoulders"],
  sets: 3,
  reps: "30-45 sec",
};

export const ROUTINES: RoutineDefinition[] = [
  {
    id: "full-body-a",
    name: "Full body essentials",
    shortName: "Full body",
    duration: 45,
    level: "Beginner",
    focus: "The fewest movements that still train the whole body.",
    why: "A strong default for recomposition: every major muscle gets a useful signal without making recovery difficult.",
    exercises: [squat, bench, row, hinge, plank],
  },
  {
    id: "upper",
    name: "Upper body strength",
    shortName: "Upper",
    duration: 50,
    level: "Regular",
    focus: "Pressing, pulling, shoulders and arms.",
    why: "Balances push and pull volume so posture and shoulder health improve alongside strength.",
    exercises: [bench, row, pulldown, shoulderPress],
  },
  {
    id: "lower",
    name: "Lower body strength",
    shortName: "Lower",
    duration: 45,
    level: "Regular",
    focus: "Quads, glutes, hamstrings and trunk.",
    why: "Builds the large lower-body muscles while keeping the exercise list short enough to progress consistently.",
    exercises: [squat, hinge, splitSquat, plank],
  },
  {
    id: "quick",
    name: "Quick full body",
    shortName: "30 minute",
    duration: 30,
    level: "Beginner",
    focus: "Three compound movements for busy days.",
    why: "Maintains training consistency when time is limited; a short completed session beats a perfect skipped one.",
    exercises: [squat, bench, row],
  },
];

export const MEAL_SCHEDULE: Array<{ slot: MealSlot; time: string; hour: number }> = [
  { slot: "Breakfast", time: "08:00", hour: 8 },
  { slot: "Lunch", time: "13:00", hour: 13 },
  { slot: "Snack", time: "16:30", hour: 16.5 },
  { slot: "Dinner", time: "20:00", hour: 20 },
];

export const ACTIVITY_TYPES: ActivityType[] = [
  "Running",
  "Walking",
  "Cycling",
  "Badminton",
  "Football",
  "Swimming",
  "Tennis",
  "Hiking",
  "Mobility",
];

export const DEFAULT_STORE: RecompStore = {
  goals: {
    goal: "Recompose",
    calories: 2200,
    protein: 150,
    carbs: 220,
    fat: 65,
    fiber: 30,
    trainingDays: 3,
    sleepHours: 8,
  },
  meals: [],
  strengthSessions: [],
  activities: [],
  weights: [],
  sleepEntries: [],
  remindersEnabled: false,
};

export function roundMacro(value: number) {
  return Math.round(value * 10) / 10;
}

export function scaleMacros(food: MacroSet, quantity: number): MacroSet {
  return {
    calories: Math.round(food.calories * quantity),
    protein: roundMacro(food.protein * quantity),
    carbs: roundMacro(food.carbs * quantity),
    fat: roundMacro(food.fat * quantity),
    fiber: roundMacro(food.fiber * quantity),
  };
}

export function sumMacros(items: MacroSet[]): MacroSet {
  return items.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      protein: roundMacro(total.protein + item.protein),
      carbs: roundMacro(total.carbs + item.carbs),
      fat: roundMacro(total.fat + item.fat),
      fiber: roundMacro(total.fiber + item.fiber),
    }),
    { ...EMPTY_MACROS },
  );
}

export function mealMacros(meal: MealEntry) {
  return sumMacros(meal.items);
}

export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMealItem(food: FoodDefinition, quantity = 1): MealItem {
  return {
    id: uid("item"),
    foodId: food.id,
    name: food.name,
    serving: food.serving,
    quantity,
    quantityStep: food.quantityStep,
    ...scaleMacros(food, quantity),
  };
}

export function createExerciseLogs(routine: RoutineDefinition): ExerciseLog[] {
  return routine.exercises.map((exercise) => ({
    exerciseId: exercise.id,
    name: exercise.name,
    primary: exercise.primary,
    secondary: exercise.secondary,
    sets: Array.from({ length: exercise.sets }, () => ({
      id: uid("set"),
      reps: Number.parseInt(exercise.reps, 10) || 8,
      weightKg: 0,
      completed: false,
    })),
  }));
}

export function foodForRecognition(label: string) {
  const normalized = label.replaceAll("_", " ").toLowerCase();
  return FOOD_LIBRARY.find((food) =>
    food.aliases?.some((alias) => normalized.includes(alias.toLowerCase())),
  );
}
