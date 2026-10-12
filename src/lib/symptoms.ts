import type { SymptomId } from "../types";

export const SYMPTOMS: { id: SymptomId; label: string }[] = [
  { id: "itching", label: "Itching" },
  { id: "tenderness", label: "Tenderness" },
  { id: "dryness", label: "Dryness" },
  { id: "bleeding", label: "Bleeding" },
  { id: "none", label: "None" },
];

const PRIMARY = SYMPTOMS.filter((symptom) => symptom.id !== "none");

export function primarySymptoms() {
  return PRIMARY;
}

export function toggleSymptom(current: SymptomId[], symptom: SymptomId): SymptomId[] {
  if (symptom === "none") {
    return current.length === 1 && current[0] === "none" ? [] : ["none"];
  }
  const withoutNone = current.filter((item) => item !== "none");
  if (withoutNone.includes(symptom)) {
    return withoutNone.filter((item) => item !== symptom);
  }
  return [...withoutNone, symptom];
}

export function symptomLabels(ids: SymptomId[]): string {
  if (ids.length === 0) return "No symptoms recorded";
  if (ids.length === 1 && ids[0] === "none") return "None noted";
  const order = SYMPTOMS.map((symptom) => symptom.id);
  return [...ids]
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((id) => SYMPTOMS.find((symptom) => symptom.id === id)?.label ?? id)
    .join(", ");
}
