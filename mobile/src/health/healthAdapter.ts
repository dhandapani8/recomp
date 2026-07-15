import { Platform } from "react-native";

export type HealthPlatform = "ios-healthkit" | "android-health-connect" | "manual";

export type DailyHealthSummary = {
  date: string;
  platform: HealthPlatform;
  steps: number;
  activeEnergyKcal: number;
  exerciseMinutes: number;
  sleepMinutes: number;
  restingHeartRate: number;
  lastSyncedAt: string;
};

export type WorkoutSession = {
  id: string;
  source: HealthPlatform | "manual-gym";
  type: string;
  durationMinutes: number;
  calories: number;
  averageHeartRate?: number;
  startedAt: string;
};

function platformSource(): HealthPlatform {
  if (Platform.OS === "ios") return "ios-healthkit";
  if (Platform.OS === "android") return "android-health-connect";
  return "manual";
}

export async function getDailyHealthSummary(): Promise<DailyHealthSummary> {
  // Native adapters will replace this mock:
  // iOS: HealthKit permissions + HKStatisticsQuery / workouts.
  // Android: Health Connect permissions + aggregate records.
  return {
    date: new Date().toISOString().slice(0, 10),
    platform: platformSource(),
    steps: 8420,
    activeEnergyKcal: 640,
    exerciseMinutes: 46,
    sleepMinutes: 432,
    restingHeartRate: 58,
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function getRecentWorkoutSessions(): Promise<WorkoutSession[]> {
  return [
    {
      id: "watch-gym-1",
      source: platformSource(),
      type: "Traditional strength training",
      durationMinutes: 55,
      calories: 310,
      averageHeartRate: 118,
      startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "watch-badminton-1",
      source: platformSource(),
      type: "Badminton",
      durationMinutes: 74,
      calories: 620,
      averageHeartRate: 142,
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

