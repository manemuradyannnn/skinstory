import { primarySymptoms, SYMPTOMS, toggleSymptom } from "../lib/symptoms";
import type { SymptomId } from "../types";

type SymptomFieldProps = {
  value: SymptomId[];
  onChange: (value: SymptomId[]) => void;
  error?: string;
};

export function SymptomField({ value, onChange, error }: SymptomFieldProps) {
  const errorId = "symptom-error";
  const hintId = "symptom-hint";
  const describedBy = error ? `${hintId} ${errorId}` : hintId;

  function renderChip(id: SymptomId, label: string) {
    const pressed = value.includes(id);
    return (
      <button
        key={id}
        type="button"
        aria-pressed={pressed}
        aria-describedby={describedBy}
        onClick={() => onChange(toggleSymptom(value, id))}
        className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${
          pressed ? "border-forest bg-forest text-paper" : "border-line bg-paper text-ink hover:bg-ivory-deep"
        }`}
      >
        <span aria-hidden="true" className="inline-block w-4 text-center">
          {pressed ? "✓" : ""}
        </span>
        {label}
      </button>
    );
  }

  return (
    <fieldset id="symptoms" tabIndex={-1} className="outline-none">
      <legend className="text-sm font-semibold">Symptoms</legend>
      <p id={hintId} className="mt-1 text-sm text-muted">
        Choose any that apply. None clears the others, and choosing another symptom clears None.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {primarySymptoms().map((symptom) => renderChip(symptom.id, symptom.label))}
      </div>
      <div className="mt-3">{renderChip("none", SYMPTOMS.find((symptom) => symptom.id === "none")!.label)}</div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
