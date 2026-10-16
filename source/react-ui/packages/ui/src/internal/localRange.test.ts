import { LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import { isOrdered } from "./localRange";

describe("isOrdered", () => {
  const early = LocalDate.of(2024, 3, 1);
  const late = LocalDate.of(2024, 3, 9);

  it("accepts an ordered date range", () => {
    expect(isOrdered({ start: early, end: late })).toBe(true);
  });

  it("accepts a date range whose ends are equal", () => {
    expect(isOrdered({ start: early, end: LocalDate.of(2024, 3, 1) })).toBe(true);
  });

  it("rejects a reversed date range", () => {
    expect(isOrdered({ start: late, end: early })).toBe(false);
  });

  it("accepts an ordered time range", () => {
    expect(isOrdered({ start: LocalTime.of(9, 0), end: LocalTime.of(17, 30) })).toBe(true);
  });

  it("accepts a time range whose ends are equal", () => {
    expect(isOrdered({ start: LocalTime.of(9, 0), end: LocalTime.of(9, 0) })).toBe(true);
  });

  it("rejects a reversed time range", () => {
    expect(isOrdered({ start: LocalTime.of(17, 30), end: LocalTime.of(9, 0) })).toBe(false);
  });

  it("accepts an ordered date-time range", () => {
    expect(isOrdered({ start: LocalDateTime.of(early, LocalTime.of(9, 0)), end: LocalDateTime.of(early, LocalTime.of(10, 0)) })).toBe(true);
  });

  it("accepts a date-time range whose ends are equal", () => {
    expect(isOrdered({ start: LocalDateTime.of(early, LocalTime.of(9, 0)), end: LocalDateTime.of(early, LocalTime.of(9, 0)) })).toBe(true);
  });

  it("rejects a reversed date-time range", () => {
    expect(isOrdered({ start: LocalDateTime.of(late, LocalTime.of(9, 0)), end: LocalDateTime.of(early, LocalTime.of(10, 0)) })).toBe(false);
  });
});
