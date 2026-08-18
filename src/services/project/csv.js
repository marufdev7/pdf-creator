import Papa from "papaparse";

export function parseChartCsv(text) {
  const result = Papa.parse(text.trim(), { header: true, skipEmptyLines: true, dynamicTyping: true });
  const fatalError = result.errors.find((error) => error.type !== "Delimiter");
  if (fatalError) throw new Error(fatalError.message);
  const fields = result.meta.fields ?? [];
  if (fields.length < 2) throw new Error("CSV data needs a label column and at least one value column.");
  if (!result.data.length) throw new Error("The CSV file does not contain any data rows.");
  return { fields, rows: result.data };
}
