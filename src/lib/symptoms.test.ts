import { describe, expect, it } from "vitest";
import { symptomLabels, toggleSymptom } from "./symptoms";

describe("toggleSymptom", () => {
  it("selects a symptom", () => {
    expect(toggleSymptom([], "itching")).toEqual(["itching"]);
  });

  it("adds another symptom", () => {
    expect(toggleSymptom(["itching"], "dryness")).toEqual(["itching", "dryness"]);
  });

  it("removes a selected symptom", () => {
    expect(toggleSymptom(["itching", "dryness"], "itching")).toEqual(["dryness"]);
  });

  it("clears other symptoms when None is chosen", () => {
    expect(toggleSymptom(["itching", "bleeding"], "none")).toEqual(["none"]);
  });

  it("clears None when another symptom is chosen", () => {
    expect(toggleSymptom(["none"], "tenderness")).toEqual(["tenderness"]);
  });

  it("toggles None off", () => {
    expect(toggleSymptom(["none"], "none")).toEqual([]);
  });
});

describe("symptomLabels", () => {
  it("describes an empty selection and None", () => {
    expect(symptomLabels([])).toBe("No symptoms recorded");
    expect(symptomLabels(["none"])).toBe("None noted");
  });

  it("keeps a stable order", () => {
    expect(symptomLabels(["bleeding", "itching"])).toBe("Itching, Bleeding");
  });
});
