import { describe, expect, it } from "vitest";
import { parseReviewInput } from "../src/lib/review-input";
import { formatRating, formatReviewDate } from "../src/lib/booking-ui";

describe("customer reviews", () => {
  it("requires a 1–5 star rating and a short written note", () => {
    expect(() => parseReviewInput({ rating: 0, body: "Great treatment overall" })).toThrow(/1 to 5/);
    expect(() => parseReviewInput({ rating: 5, body: "short" })).toThrow(/10 characters/);
    expect(parseReviewInput({ rating: 5, body: "  Excellent deep tissue, will book again.  " })).toEqual({
      rating: 5,
      body: "Excellent deep tissue, will book again."
    });
  });

  it("formats ratings without throwing on non-number values", () => {
    expect(formatRating(4.66)).toBe("4.7");
    expect(formatRating("5")).toBe("5.0");
    expect(formatRating(0)).toBe("");
    expect(formatRating(undefined)).toBe("");
    expect(formatReviewDate("not-a-date")).toBe("");
  });
});
