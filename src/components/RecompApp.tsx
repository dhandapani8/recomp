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
  ImagePlus,
  Info,
  Minus,
  Plus,
  Save,
  Search,
  Sparkles,
  Target,
  Timer,
  Trash2,
  Trophy,
  Utensils,
  Weight,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { BodyHeatmap } from "@/components/BodyHeatmap";
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
  StrengthSession,
  sumMacros,
  todayIso,
  uid,
} from "@/lib/recomp-domain";

type View = "today" | "food" | "training" | "progress";
type RecognitionState = "idle" | "loading" | "ready" | "error";

const STORE_KEY = "recomp-v2";
const DAY_MS = 86_400_000;

const NAV_ITEMS = [
  { id: "today" as const, label: "Today", icon: CircleGauge },
  { id: "food" as const, label: "Food", icon: Utensils },
  { id: "training" as const, label: "Training", icon: Dumbbell },
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

function getMuscleScores(sessions: StrengthSession[]) {
  const scores: Partial<Record<Muscle, number>> = {};
  const cutoff = Date.now() - 7 * DAY_MS;

  sessions
    .filter((session) => new Date(`${session.date}T12:00:00`).getTime() >= cutoff)
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
  const proteinLeft = Math.max(0, store.goals.protein - totals.protein);
  const caloriesLeft = Math.max(0, store.goals.calories - totals.calories);
  const latestTraining = store.strengthSessions[0];
  const todayActivities = store.activities.filter((entry) => entry.date === todayIso());

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
          <Card className="coach-card">
            <div className="coach-icon"><Sparkles size={19} /></div>
            <p>Next best move</p>
            <h2>
              {proteinLeft > 20
                ? `Find ${Math.round(proteinLeft)}g protein inside ${Math.round(caloriesLeft)} kcal`
                : caloriesLeft > 100
                  ? "Protein is covered. Keep the rest flexible."
                  : "Targets are covered for today."}
            </h2>
            <span>
              {todayMeals.length < 2
                ? "Logging the next meal early makes the evening easier to manage."
                : "Use a familiar protein source and add carbs around training."}
            </span>
          </Card>

          <Card>
            <SectionHeading eyebrow="7-day training" title="Muscles worked" />
            <BodyHeatmap scores={muscleScores} compact />
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

function ProgressView({
  store,
  muscleScores,
  saveGoals,
  addWeight,
}: {
  store: RecompStore;
  muscleScores: Partial<Record<Muscle, number>>;
  saveGoals: (goals: GoalSettings) => void;
  addWeight: (weight: number) => void;
}) {
  const dates = recentDates(7);
  const dailyCalories = dates.map((date) => ({
    id: date,
    label: new Intl.DateTimeFormat("en", { weekday: "narrow" }).format(new Date(`${date}T12:00:00`)),
    value: sumMacros(store.meals.filter((meal) => meal.date === date).map(mealMacros)).calories,
  }));
  const averageCalories = dailyCalories.reduce((total, day) => total + day.value, 0) / 7;
  const loggedDays = dailyCalories.filter((day) => day.value > 0).length;
  const weeklySets = Object.values(muscleScores).reduce((total, value) => total + (value ?? 0), 0);
  const activityMinutes = store.activities
    .filter((entry) => dates.includes(entry.date))
    .reduce((total, entry) => total + entry.durationMinutes, 0);
  const sortedWeights = [...store.weights].sort((a, b) => a.date.localeCompare(b.date));
  const weightChange = sortedWeights.length > 1
    ? roundMacro(sortedWeights.at(-1)!.weightKg - sortedWeights[0].weightKg)
    : null;

  return (
    <div className="view-stack">
      <div className="view-heading">
        <div><p>Progress</p><h1>See what your habits are building</h1></div>
      </div>

      <div className="insight-stats">
        <div><span><Utensils size={17} /></span><strong>{loggedDays}/7</strong><small>days logged</small></div>
        <div><span><Target size={17} /></span><strong>{Math.round(averageCalories)}</strong><small>avg kcal</small></div>
        <div><span><Dumbbell size={17} /></span><strong>{Math.round(weeklySets)}</strong><small>muscle sets</small></div>
        <div><span><Activity size={17} /></span><strong>{activityMinutes}</strong><small>activity min</small></div>
      </div>

      <div className="progress-layout">
        <Card className="large-heatmap">
          <SectionHeading eyebrow="Training balance" title="7-day muscle heat map" />
          <BodyHeatmap scores={muscleScores} />
          <p className="panel-note">Primary muscles receive a full set; secondary muscles receive half. The map reflects completed sets, not camera guesses.</p>
        </Card>

        <div className="progress-side">
          <Card>
            <SectionHeading eyebrow="Nutrition consistency" title="Calories by day" />
            <MiniBars target={store.goals.calories} values={dailyCalories} />
            <div className="target-line"><span>Daily target</span><strong>{store.goals.calories} kcal</strong></div>
          </Card>

          <Card>
            <SectionHeading eyebrow="Recomp signal" title="What to do next" />
            <div className="insight-list">
              <div><Check size={15} /><span><strong>Log consistently before adjusting.</strong><small>{loggedDays < 5 ? "More complete days will make the weekly trend useful." : "Your logging coverage is strong enough to compare against weight."}</small></span></div>
              <div><Dumbbell size={15} /><span><strong>Keep strength measurable.</strong><small>{weeklySets < 20 ? "Complete two or three simple sessions this week." : "Training volume is in a useful range; progress load or reps slowly."}</small></span></div>
              <div><Weight size={15} /><span><strong>Use the weight trend.</strong><small>{weightChange === null ? "Add two or more weigh-ins to see direction." : `Current recorded change: ${weightChange > 0 ? "+" : ""}${weightChange} kg.`}</small></span></div>
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
          <div><strong>recomp</strong><small>nutrition + training</small></div>
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
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
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
        {view === "progress" ? (
          <ProgressView
            addWeight={(weightKg) => setStore((current) => ({
              ...current,
              weights: [{ id: uid("weight"), date: todayIso(), weightKg }, ...current.weights.filter((entry) => entry.date !== todayIso())],
            }))}
            muscleScores={muscleScores}
            saveGoals={(goals) => setStore((current) => ({ ...current, goals }))}
            store={store}
          />
        ) : null}
      </main>
      <MobileNav setView={navigate} view={view} />
      <footer className="re-footer">by _ae</footer>
    </div>
  );
}
