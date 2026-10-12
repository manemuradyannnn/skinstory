import { describe, expect, it } from "vitest";
import type { Concern, Observation } from "../types";
import { createInitialState, reducer } from "./reducer";

function observation(id: string): Observation {
  return {
    id,
    date: "2026-10-10",
    photoSrc: "/samples/demo-1.svg",
    photoKind: "demo",
    symptoms: ["none"],
    notes: "",
    createdAt: "2026-10-10T12:00:00.000Z",
  };
}

describe("reducer", () => {
  it("starts with fictional concerns included in visit prep", () => {
    const state = createInitialState();
    expect(state.concerns.every((concern) => concern.sample)).toBe(true);
    expect(state.includedObservationIds).toHaveLength(6);
  });

  it("adds an observation to an existing concern and includes it", () => {
    const state = createInitialState();
    const next = reducer(state, {
      type: "add-observation",
      concernId: "sample-cheek",
      observation: observation("new-1"),
    });
    const cheek = next.concerns.find((concern) => concern.id === "sample-cheek");
    expect(cheek?.observations).toHaveLength(2);
    expect(next.includedObservationIds).toContain("new-1");
  });

  it("removes a concern when its last observation is deleted", () => {
    const state = createInitialState();
    const next = reducer(state, {
      type: "delete-observation",
      concernId: "sample-cheek",
      observationId: "sample-cheek-1",
    });
    expect(next.concerns.some((concern) => concern.id === "sample-cheek")).toBe(false);
    expect(next.includedObservationIds).not.toContain("sample-cheek-1");
    expect(next.toast?.message).toBe("Concern removed.");
  });

  it("keeps a concern when another observation remains", () => {
    const state = createInitialState();
    const next = reducer(state, {
      type: "delete-observation",
      concernId: "sample-forearm",
      observationId: "sample-forearm-1",
    });
    const forearm = next.concerns.find((concern) => concern.id === "sample-forearm");
    expect(forearm?.observations).toHaveLength(2);
    expect(next.toast?.message).toBe("Observation removed.");
  });

  it("adds a new concern at the top of the list", () => {
    const state = createInitialState();
    const concern: Concern = {
      id: "user-1",
      name: "Left shin",
      regionId: "left-lower-leg",
      regionLabel: "Left lower leg",
      view: "front",
      x: 60,
      y: 80,
      sample: false,
      observations: [observation("user-obs")],
    };
    const next = reducer(state, { type: "add-concern", concern });
    expect(next.concerns[0]?.id).toBe("user-1");
    expect(next.includedObservationIds).toContain("user-obs");
  });

  it("clears and restores visit selection", () => {
    const state = createInitialState();
    const cleared = reducer(state, { type: "set-all-included", included: false });
    expect(cleared.includedObservationIds).toEqual([]);
    const restored = reducer(cleared, { type: "set-concern-included", concernId: "sample-back", included: true });
    expect(restored.includedObservationIds.sort()).toEqual(["sample-back-1", "sample-back-2"]);
  });
});
