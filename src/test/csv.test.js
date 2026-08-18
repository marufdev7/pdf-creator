import { describe, expect, it } from "vitest";
import { parseChartCsv } from "../services/project/csv";

describe("chart CSV parsing", () => {
  it("returns headers and typed rows", () => {
    const result = parseChartCsv("month,revenue\nJan,12\nFeb,18");
    expect(result.fields).toEqual(["month", "revenue"]);
    expect(result.rows[0]).toEqual({ month: "Jan", revenue: 12 });
  });

  it("rejects single-column data", () => {
    expect(() => parseChartCsv("month\nJan")).toThrow(/label column/i);
  });
});
