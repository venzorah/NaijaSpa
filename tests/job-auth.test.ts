import { afterEach, expect, it } from "vitest";
import { jobRequestAuthorized } from "../src/lib/job-auth";

afterEach(() => {
  delete process.env.INTERNAL_JOB_SECRET;
  delete process.env.CRON_SECRET;
});

it("rejects missing or empty job secrets", () => {
  const req = new Request("https://naijaspa.test/api/jobs/x", { headers: { authorization: "Bearer secret" } });
  expect(jobRequestAuthorized(req)).toBe(false);
});

it("accepts either configured job secret", () => {
  process.env.CRON_SECRET = "cron-token-value";
  const req = new Request("https://naijaspa.test/api/jobs/x", { headers: { authorization: "Bearer cron-token-value" } });
  expect(jobRequestAuthorized(req)).toBe(true);
  expect(jobRequestAuthorized(new Request("https://naijaspa.test/api/jobs/x", { headers: { authorization: "Bearer other" } }))).toBe(false);
});
