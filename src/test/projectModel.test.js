import { describe, expect, it } from "vitest";
import { createProject, createSection, normalizeProject } from "../models/projectModel";

describe("project model", () => {
    it("creates a local project with supported page defaults", () => {
        const project = createProject("Report");
        expect(project.name).toBe("Report");
        expect(project.page).toMatchObject({ format: "a4", orientation: "portrait", showPageNumbers: true });
        expect(project.sections).toEqual([]);
    });

    it("creates type-specific section data", () => {
        expect(createSection("code").data).toMatchObject({ language: "javascript", showLineNumbers: true });
        expect(createSection("chart").data.rows).toHaveLength(3);
        expect(createSection("image").data.assetId).toBeNull();
    });

    it("normalizes missing page settings", () => {
        const normalized = normalizeProject({ id: "p1", name: "Imported", page: { format: "letter" } });
        expect(normalized.page.format).toBe("letter");
        expect(normalized.page.margins.top).toBe(52);
        expect(normalized.sections).toEqual([]);
    });
});
