import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  DailyHealthSummary,
  WorkoutSession,
  getDailyHealthSummary,
  getRecentWorkoutSessions,
} from "./src/health/healthAdapter";

type ViewKey = "dashboard" | "meals" | "weight" | "workouts" | "insights";
type IoniconName = keyof typeof Ionicons.glyphMap;

type Meal = {
  id: string;
  mealType: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

type WeightEntry = {
  date: string;
  weightKg: number;
};

const accent = {
  green: "#16a34a",
  blue: "#2563eb",
  orange: "#ea580c",
  teal: "#14b8a6",
  red: "#dc2626",
  bg: "#0f1110",
  card: "#181714",
  cardAlt: "#111311",
  border: "#332d26",
  text: "#f5efe7",
  muted: "#a99f95",
};

const target = {
  calories: 2200,
  protein: 150,
  carbs: 220,
  fat: 65,
  fiber: 25,
};

const initialMeals: Meal[] = [
  {
    id: "breakfast",
    mealType: "Breakfast",
    description: "Greek yogurt bowl with banana, chia, walnuts, and whey",
    calories: 510,
    protein: 38,
    carbs: 62,
    fat: 15,
    fiber: 9,
  },
  {
    id: "lunch",
    mealType: "Lunch",
    description: "Chicken burrito bowl with rice, beans, corn, and salad",
    calories: 710,
    protein: 44,
    carbs: 92,
    fat: 17,
    fiber: 14,
  },
  {
    id: "snack",
    mealType: "Snack",
    description: "Whey protein shake with an apple",
    calories: 260,
    protein: 27,
    carbs: 28,
    fat: 2,
    fiber: 4,
  },
];

const quickMeals: Meal[] = [
  {
    id: "usual-breakfast",
    mealType: "Breakfast",
    description: "Usual breakfast",
    calories: 510,
    protein: 38,
    carbs: 62,
    fat: 15,
    fiber: 9,
  },
  {
    id: "protein-snack",
    mealType: "Snack",
    description: "Protein snack",
    calories: 260,
    protein: 27,
    carbs: 28,
    fat: 2,
    fiber: 4,
  },
  {
    id: "protein-dinner",
    mealType: "Dinner",
    description: "Lean protein bowl",
    calories: 650,
    protein: 43,
    carbs: 72,
    fat: 20,
    fiber: 12,
  },
];

const gymPlans = [
  {
    name: "Upper strength",
    minutes: 60,
    focus: "Press + pull strength",
    exercises: ["Bench press 4 x 5-8", "Chest-supported row 4 x 8-10", "Lat pulldown 3 x 10-12"],
  },
  {
    name: "Lower strength",
    minutes: 65,
    focus: "Leg strength while cutting",
    exercises: ["Back squat 4 x 5-8", "Romanian deadlift 3 x 8-10", "Leg press 3 x 10-12"],
  },
  {
    name: "Full-body recomp",
    minutes: 55,
    focus: "Default when recovery is average",
    exercises: ["Goblet squat 3 x 10", "Dumbbell bench 3 x 8-10", "Cable row 3 x 10-12"],
  },
];

const tabs: Array<{ key: ViewKey; label: string; icon: IoniconName; activeIcon: IoniconName }> = [
  { key: "dashboard", label: "Today", icon: "today-outline", activeIcon: "today" },
  { key: "meals", label: "Meals", icon: "restaurant-outline", activeIcon: "restaurant" },
  { key: "weight", label: "Weight", icon: "scale-outline", activeIcon: "scale" },
  { key: "workouts", label: "Gym", icon: "barbell-outline", activeIcon: "barbell" },
  { key: "insights", label: "Insights", icon: "sparkles-outline", activeIcon: "sparkles" },
];

function formatSleep(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function sumMeals(meals: Meal[]) {
  return meals.reduce(
    (total, meal) => ({
      calories: total.calories + meal.calories,
      protein: total.protein + meal.protein,
      carbs: total.carbs + meal.carbs,
      fat: total.fat + meal.fat,
      fiber: total.fiber + meal.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [health, setHealth] = useState<DailyHealthSummary | null>(null);
  const [watchWorkouts, setWatchWorkouts] = useState<WorkoutSession[]>([]);
  const [meals, setMeals] = useState(initialMeals);
  const [weights, setWeights] = useState<WeightEntry[]>([
    { date: "Jun 13", weightKg: 83.9 },
    { date: "Jun 15", weightKg: 83.7 },
    { date: "Jun 17", weightKg: 83.5 },
    { date: "Jun 19", weightKg: 83.4 },
  ]);
  const [selectedPlan, setSelectedPlan] = useState(gymPlans[2]);
  const totals = useMemo(() => sumMeals(meals), [meals]);

  useEffect(() => {
    void refreshHealth();
  }, []);

  async function refreshHealth() {
    const [summary, sessions] = await Promise.all([
      getDailyHealthSummary(),
      getRecentWorkoutSessions(),
    ]);
    setHealth(summary);
    setWatchWorkouts(sessions);
  }

  function addQuickMeal(meal: Meal) {
    setMeals((current) => [
      ...current,
      { ...meal, id: `${meal.id}-${current.length + 1}` },
    ]);
  }

  function addWeight() {
    const latest = weights[weights.length - 1]?.weightKg ?? 83.4;
    setWeights((current) => [
      ...current,
      { date: "Today", weightKg: Math.max(70, Number((latest - 0.1).toFixed(1))) },
    ]);
  }

  const platformLabel = useMemo(() => {
    if (Platform.OS === "ios") return "HealthKit";
    if (Platform.OS === "android") return "Health Connect";
    return "Web preview";
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <View style={[styles.contour, styles.contourOuter]} />
            <View style={[styles.contour, styles.contourInner]} />
            <View style={styles.logoCore} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Recomp</Text>
            <Text style={styles.subtitle}>Health, meals, gym, and weekly coaching</Text>
          </View>
        </View>

        {activeView === "dashboard" && (
          <DashboardView
            health={health}
            meals={meals}
            platformLabel={platformLabel}
            refreshHealth={refreshHealth}
            totals={totals}
          />
        )}

        {activeView === "meals" && (
          <MealsView meals={meals} onAddQuickMeal={addQuickMeal} totals={totals} />
        )}

        {activeView === "weight" && (
          <WeightView weights={weights} onAddWeight={addWeight} />
        )}

        {activeView === "workouts" && (
          <WorkoutsView
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            watchWorkouts={watchWorkouts}
          />
        )}

        {activeView === "insights" && (
          <InsightsView health={health} totals={totals} weights={weights} workouts={watchWorkouts} />
        )}
      </ScrollView>
      <BottomTabBar activeView={activeView} onChange={setActiveView} />
    </SafeAreaView>
  );
}

function BottomTabBar({
  activeView,
  onChange,
}: {
  activeView: ViewKey;
  onChange: (view: ViewKey) => void;
}) {
  return (
    <View style={styles.bottomTabShell}>
      <View style={styles.bottomTabs}>
        {tabs.map((tab) => {
          const active = activeView === tab.key;

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={styles.bottomTab}
              onPress={() => onChange(tab.key)}
            >
              <View style={[styles.tabIconBubble, active && styles.tabIconBubbleActive]}>
                <Ionicons
                  name={active ? tab.activeIcon : tab.icon}
                  size={active ? 22 : 21}
                  color={active ? accent.green : accent.muted}
                />
              </View>
              <Text style={[styles.bottomTabText, active && styles.bottomTabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DashboardView({
  health,
  meals,
  platformLabel,
  refreshHealth,
  totals,
}: {
  health: DailyHealthSummary | null;
  meals: Meal[];
  platformLabel: string;
  refreshHealth: () => void;
  totals: ReturnType<typeof sumMeals>;
}) {
  const remaining = target.calories - totals.calories;

  return (
    <>
      <Card eyebrow={platformLabel} title="Today from your phone">
        <Text style={styles.body}>
          Sync watch and phone activity, then use it to shape food, training, and recovery prompts.
        </Text>
        <View style={styles.metricGrid}>
          <Metric label="Steps" value={health ? health.steps.toLocaleString() : "-"} color={accent.blue} />
          <Metric label="Move" value={health ? `${health.activeEnergyKcal} kcal` : "-"} color={accent.orange} />
          <Metric label="Exercise" value={health ? `${health.exerciseMinutes} min` : "-"} color={accent.green} />
          <Metric label="Sleep" value={health ? formatSleep(health.sleepMinutes) : "-"} color={accent.teal} />
        </View>
        <PrimaryButton label="Sync health data" onPress={refreshHealth} />
      </Card>

      <Card eyebrow="Daily targets" title={`${totals.calories} / ${target.calories} kcal`}>
        <Text style={styles.body}>
          {remaining > 0 ? `${remaining} kcal left today.` : `${Math.abs(remaining)} kcal over target.`}
          {" "}Dinner should prioritize protein and easy digestion.
        </Text>
        <View style={styles.metricGrid}>
          <Metric label="Protein" value={`${totals.protein}/${target.protein}g`} color={accent.green} />
          <Metric label="Carbs" value={`${totals.carbs}/${target.carbs}g`} color={accent.blue} />
          <Metric label="Fat" value={`${totals.fat}/${target.fat}g`} color={accent.orange} />
          <Metric label="Fiber" value={`${totals.fiber}/${target.fiber}g`} color={accent.teal} />
        </View>
      </Card>

      <Card eyebrow="Meal state" title={`${meals.length} meals logged`}>
        <View style={styles.stateGrid}>
          {["Breakfast", "Lunch", "Dinner", "Snack"].map((mealType) => {
            const logged = meals.some((meal) => meal.mealType === mealType);
            return (
              <View key={mealType} style={styles.statePill}>
                <Text style={styles.stateLabel}>{mealType}</Text>
                <Text style={[styles.stateValue, { color: logged ? accent.green : accent.muted }]}>
                  {logged ? "Logged" : "Pending"}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>
    </>
  );
}

function MealsView({
  meals,
  onAddQuickMeal,
  totals,
}: {
  meals: Meal[];
  onAddQuickMeal: (meal: Meal) => void;
  totals: ReturnType<typeof sumMeals>;
}) {
  return (
    <>
      <Card eyebrow="Meal logging" title="Quick add">
        <Text style={styles.body}>Fast mobile logging for repeat meals. Full AI/photo estimation can come after native sync.</Text>
        <View style={styles.planTabs}>
          {quickMeals.map((meal) => (
            <Pressable key={meal.id} style={styles.planTab} onPress={() => onAddQuickMeal(meal)}>
              <Text style={styles.planTabText}>{meal.description}</Text>
              <Text style={styles.miniMeta}>{meal.calories} kcal · {meal.protein}g protein</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card eyebrow="Macros" title={`${totals.protein}g protein today`}>
        <View style={styles.metricGrid}>
          <Metric label="Calories" value={`${totals.calories}`} color={accent.green} />
          <Metric label="Carbs" value={`${totals.carbs}g`} color={accent.blue} />
          <Metric label="Fat" value={`${totals.fat}g`} color={accent.orange} />
          <Metric label="Fiber" value={`${totals.fiber}g`} color={accent.teal} />
        </View>
      </Card>

      <Card eyebrow="Log" title="Meals">
        {meals.map((meal) => (
          <View key={meal.id} style={styles.listRow}>
            <View>
              <Text style={styles.rowTitle}>{meal.mealType}</Text>
              <Text style={styles.rowBody}>{meal.description}</Text>
            </View>
            <Text style={styles.rowValue}>{meal.calories}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

function WeightView({
  weights,
  onAddWeight,
}: {
  weights: WeightEntry[];
  onAddWeight: () => void;
}) {
  const latest = weights[weights.length - 1];
  const start = 84;
  const goal = 74;
  const progress = latest ? Math.round(((start - latest.weightKg) / (start - goal)) * 100) : 0;

  return (
    <>
      <Card eyebrow="Weight trend" title={latest ? `${latest.weightKg} kg` : "No weight"}>
        <Text style={styles.body}>
          Seven-day trend belongs here once native sync and manual weigh-ins are persisted.
        </Text>
        <View style={styles.metricGrid}>
          <Metric label="Start" value={`${start} kg`} color={accent.orange} />
          <Metric label="Goal" value={`${goal} kg`} color={accent.green} />
          <Metric label="Progress" value={`${progress}%`} color={accent.blue} />
          <Metric label="Rate" value="0.4 kg/wk" color={accent.teal} />
        </View>
        <PrimaryButton label="Add weigh-in" onPress={onAddWeight} />
      </Card>

      <Card eyebrow="Entries" title="Recent weigh-ins">
        {weights.map((entry, index) => (
          <View key={`${entry.date}-${index}`} style={styles.listRow}>
            <Text style={styles.rowTitle}>{entry.date}</Text>
            <Text style={styles.rowValue}>{entry.weightKg} kg</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

function WorkoutsView({
  selectedPlan,
  setSelectedPlan,
  watchWorkouts,
}: {
  selectedPlan: (typeof gymPlans)[number];
  setSelectedPlan: (plan: (typeof gymPlans)[number]) => void;
  watchWorkouts: WorkoutSession[];
}) {
  return (
    <>
      <Card eyebrow="Gym coach" title="Suggested session">
        <Text style={styles.body}>Pick a plan, track sets on mobile, and sync the workout back to Recomp.</Text>
        <View style={styles.planTabs}>
          {gymPlans.map((plan) => (
            <Pressable
              key={plan.name}
              style={[styles.planTab, selectedPlan.name === plan.name && styles.planTabActive]}
              onPress={() => setSelectedPlan(plan)}
            >
              <Text style={[styles.planTabText, selectedPlan.name === plan.name && styles.planTabTextActive]}>
                {plan.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sessionBox}>
          <Text style={styles.sessionTitle}>{selectedPlan.focus}</Text>
          <Text style={styles.sessionMeta}>{selectedPlan.minutes} min</Text>
          {selectedPlan.exercises.map((exercise) => (
            <View key={exercise} style={styles.exerciseRow}>
              <View style={styles.checkbox} />
              <Text style={styles.exerciseText}>{exercise}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card eyebrow="Imported workouts" title="Watch history">
        {watchWorkouts.map((workout) => (
          <View key={workout.id} style={styles.listRow}>
            <View>
              <Text style={styles.rowTitle}>{workout.type}</Text>
              <Text style={styles.rowBody}>
                {workout.durationMinutes} min · {workout.calories} kcal
                {workout.averageHeartRate ? ` · ${workout.averageHeartRate} bpm` : ""}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

function InsightsView({
  health,
  totals,
  weights,
  workouts,
}: {
  health: DailyHealthSummary | null;
  totals: ReturnType<typeof sumMeals>;
  weights: WeightEntry[];
  workouts: WorkoutSession[];
}) {
  const latest = weights[weights.length - 1];
  const trained = workouts.length > 0 || (health?.exerciseMinutes ?? 0) > 30;

  return (
    <>
      <Card eyebrow="Coach" title="Next best moves">
        <Insight text={trained ? "Training signal is high. Keep dinner protein-forward and do not undershoot carbs." : "No strong training signal yet. Keep calories steady and log the next meal."} />
        <Insight text={totals.protein < 120 ? "Protein is still below the useful threshold. Add a reliable protein snack before reducing calories." : "Protein is on track. Keep food choices simple and repeatable."} />
        <Insight text={latest ? `Latest weight is ${latest.weightKg} kg. Use trend weight, not one weigh-in, for calorie changes.` : "Add weigh-ins to unlock adaptive calorie decisions."} />
      </Card>

      <Card eyebrow="Weekly adjustment" title="Keep target steady">
        <Text style={styles.body}>
          Mobile should send health and workout context. The backend/web dashboard can combine that with meals and trend weight for weekly calorie changes.
        </Text>
        <View style={styles.metricGrid}>
          <Metric label="Target" value="2200 kcal" color={accent.green} />
          <Metric label="Protein" value="150g" color={accent.blue} />
          <Metric label="Loss" value="0.4 kg/wk" color={accent.orange} />
          <Metric label="Sync" value={health ? "Ready" : "Pending"} color={accent.teal} />
        </View>
      </Card>
    </>
  );
}

function Card({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Insight({ text }: { text: string }) {
  return (
    <View style={styles.insight}>
      <View style={styles.insightDot} />
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.metric, { borderColor: `${color}55`, backgroundColor: `${color}14` }]}>
      <Text style={[styles.metricLabel, { color }]}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: accent.bg,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 118,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingTop: 8,
  },
  headerCopy: {
    flex: 1,
  },
  logo: {
    alignItems: "center",
    backgroundColor: accent.card,
    borderColor: accent.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    overflow: "hidden",
    width: 54,
  },
  contour: {
    borderRadius: 999,
    position: "absolute",
  },
  contourOuter: {
    borderColor: accent.orange,
    borderWidth: 2,
    height: 35,
    opacity: 0.55,
    width: 28,
  },
  contourInner: {
    borderColor: accent.green,
    borderWidth: 2.5,
    height: 24,
    opacity: 0.95,
    width: 18,
  },
  logoCore: {
    backgroundColor: accent.text,
    borderRadius: 999,
    height: 5,
    width: 5,
  },
  title: {
    color: accent.text,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: accent.muted,
    fontSize: 13,
    marginTop: 2,
  },
  bottomTabShell: {
    backgroundColor: "rgba(15, 17, 16, 0.86)",
    borderTopColor: "rgba(255,255,255,0.07)",
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    paddingBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    position: "absolute",
    right: 0,
  },
  bottomTabs: {
    backgroundColor: "rgba(24, 23, 20, 0.96)",
    borderColor: accent.border,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: 2,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
  },
  bottomTab: {
    alignItems: "center",
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 58,
  },
  tabIconBubble: {
    alignItems: "center",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 42,
  },
  tabIconBubbleActive: {
    backgroundColor: `${accent.green}18`,
  },
  bottomTabText: {
    color: accent.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  bottomTabTextActive: {
    color: accent.text,
  },
  card: {
    backgroundColor: accent.card,
    borderColor: accent.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  eyebrow: {
    color: accent.green,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: accent.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
  body: {
    color: accent.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  metric: {
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    padding: 12,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  metricValue: {
    color: accent.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 5,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: accent.green,
    borderRadius: 12,
    marginTop: 16,
    padding: 13,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  stateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  statePill: {
    backgroundColor: accent.cardAlt,
    borderColor: accent.border,
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    padding: 12,
  },
  stateLabel: {
    color: accent.muted,
    fontSize: 12,
  },
  stateValue: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  planTabs: {
    gap: 8,
    marginTop: 16,
  },
  planTab: {
    borderColor: accent.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  planTabActive: {
    backgroundColor: `${accent.green}18`,
    borderColor: `${accent.green}66`,
  },
  planTabText: {
    color: accent.muted,
    fontWeight: "700",
  },
  planTabTextActive: {
    color: accent.text,
  },
  miniMeta: {
    color: accent.muted,
    fontSize: 12,
    marginTop: 4,
  },
  sessionBox: {
    backgroundColor: accent.cardAlt,
    borderColor: accent.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  sessionTitle: {
    color: accent.text,
    fontSize: 16,
    fontWeight: "800",
  },
  sessionMeta: {
    color: accent.orange,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "uppercase",
  },
  exerciseRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  checkbox: {
    borderColor: accent.green,
    borderRadius: 5,
    borderWidth: 1.5,
    height: 18,
    width: 18,
  },
  exerciseText: {
    color: accent.muted,
    flex: 1,
    fontSize: 14,
  },
  listRow: {
    backgroundColor: accent.cardAlt,
    borderColor: accent.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  rowTitle: {
    color: accent.text,
    fontSize: 14,
    fontWeight: "800",
  },
  rowBody: {
    color: accent.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  rowValue: {
    color: accent.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  insight: {
    alignItems: "flex-start",
    backgroundColor: accent.cardAlt,
    borderColor: accent.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    padding: 12,
  },
  insightDot: {
    backgroundColor: accent.green,
    borderRadius: 999,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  insightText: {
    color: accent.muted,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
});
