import { describe, expect, it } from "vitest";
import { isValidObservationDate, todayISO } from "./dates";

const now = new Date(2026, 9, 12, 15, 0, 0);

describe("isValidObservationDate", () => {
  it("accepts today and earlier dates", () => {
    expect(isValidObservationDate("2026-10-12", now)).toBe(true);
    expect(isValidObservationDate("2026-01-02", now)).toBe(true);
  });

  it("rejects future dates, impossible days, and blank values", () => {
    expect(isValidObservationDate("2026-10-13", now)).toBe(false);
    expect(isValidObservationDate("2026-02-31", now)).toBe(false);
    expect(isValidObservationDate("", now)).toBe(false);
    expect(isValidObservationDate("12-10-2026", now)).toBe(false);
  });

  it("formats today in local calendar order", () => {
    expect(todayISO(now)).toBe("2026-10-12");
  });
});
