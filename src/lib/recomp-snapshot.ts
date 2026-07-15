export type RecompSnapshot = {
  generatedAt: string;
  profile: {
    name: string;
    age: number;
    heightCm: number;
    startWeightKg: number;
    goalWeightKg: number;
    foodStyle: string;
    training: string;
  };
  targets: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: { min: number; max: number };
  };
  today: {
    mealsLogged: number;
    nutrition: {
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
      fiberG: number;
    };
    remaining: {
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    };
  };
  trend: {
    latestWeightKg: number;
    sevenDayAverageKg: number;
    goalRateKgPerWeek: number;
  };
  activity: {
    recentWorkouts: Array<{
      date: string;
      type: string;
      durationMinutes: number;
      intensity: "Low" | "Medium" | "High";
    }>;
  };
  capabilities: {
    read: ["snapshot"];
    write: [];
  };
  dataStatus: "seeded";
};

// This is intentionally separate from browser localStorage. It becomes the
// server-side source of truth when persistent storage is introduced.
export function getRecompSnapshot(): RecompSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    profile: {
      name: "Dhandapani",
      age: 31,
      heightCm: 175,
      startWeightKg: 84,
      goalWeightKg: 74,
      foodStyle: "Flexible",
      training: "Gym + badminton, 2-3 days/week",
    },
    targets: {
      calories: 2200,
      proteinG: 150,
      carbsG: 220,
      fatG: 65,
      fiberG: { min: 25, max: 40 },
    },
    today: {
      mealsLogged: 0,
      nutrition: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
      remaining: { calories: 2200, proteinG: 150, carbsG: 220, fatG: 65 },
    },
    trend: {
      latestWeightKg: 84,
      sevenDayAverageKg: 84,
      goalRateKgPerWeek: 0.4,
    },
    activity: {
      recentWorkouts: [],
    },
    capabilities: {
      read: ["snapshot"],
      write: [],
    },
    dataStatus: "seeded",
  };
}
