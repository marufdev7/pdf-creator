import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "../utils/files";

describe("filename sanitization", () => {
    it("removes characters that are invalid on Windows", () => {
        expect(sanitizeFilename("  Q3: Sales / Europe?  ")).toBe("Q3- Sales - Europe-");
    });

    it("uses a fallback for an empty name", () => {
        expect(sanitizeFilename("   ")).toBe("document");
    });
});
