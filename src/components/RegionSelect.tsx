import { REGIONS } from "../lib/regions";
import { fieldClass } from "./Button";

type RegionSelectProps = {
  id: string;
  value: string;
  onChange: (regionId: string) => void;
  describedBy?: string;
  invalid?: boolean;
};

export function RegionSelect({ id, value, onChange, describedBy, invalid }: RegionSelectProps) {
  const front = REGIONS.filter((region) => region.view === "front");
  const back = REGIONS.filter((region) => region.view === "back");
  return (
    <select
      id={id}
      className={`${fieldClass} scroll-mt-28`}
      value={value}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Choose a region</option>
      <optgroup label="Front">
        {front.map((region) => (
          <option key={region.id} value={region.id}>
            {region.label} (front)
          </option>
        ))}
      </optgroup>
      <optgroup label="Back">
        {back.map((region) => (
          <option key={region.id} value={region.id}>
            {region.label} (back)
          </option>
        ))}
      </optgroup>
    </select>
  );
}
