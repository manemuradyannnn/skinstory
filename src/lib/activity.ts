import { compareByDate } from "./dates";
import type { Concern, Observation, SymptomId } from "../types";

export function latestObservation(concern: Concern): Observation | undefined {
  return [...concern.observations].sort(compareByDate).at(-1);
}

export function chronological(concern: Concern): Observation[] {
  return [...concern.observations].sort(compareByDate);
}

export type ActivityItem = {
  observationId: string;
  concernId: string;
  concernName: string;
  date: string;
  createdAt: string;
  symptoms: SymptomId[];
  sample: boolean;
};

export function recentActivity(concerns: Concern[], limit = 4): ActivityItem[] {
  return concerns
    .flatMap((concern) =>
      concern.observations.map((observation) => ({
        observationId: observation.id,
        concernId: concern.id,
        concernName: concern.name,
        date: observation.date,
        createdAt: observation.createdAt,
        symptoms: observation.symptoms,
        sample: concern.sample,
      })),
    )
    .sort((a, b) => compareByDate(b, a))
    .slice(0, limit);
}
