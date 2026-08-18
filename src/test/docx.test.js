import { describe, expect, it } from "vitest";
import { markdownLines } from "../services/docx/generateDocx";

describe("Word markdown conversion", () => {
    it("classifies headings, bullets, quotes, and paragraphs", () => {
        expect(markdownLines("# Title\n- Item\n> Quote\nBody")).toEqual([
            { kind: "heading1", text: "Title" },
            { kind: "bullet", text: "Item" },
            { kind: "quote", text: "Quote" },
            { kind: "paragraph", text: "Body" },
        ]);
    });
});
