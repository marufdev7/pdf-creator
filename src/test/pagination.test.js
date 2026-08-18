import { describe, expect, it } from "vitest";
import { createProject, createSection } from "../models/projectModel";
import { getPageDimensions, paginateSections, splitOversizedSection } from "../services/pdf/pagination";

describe("PDF pagination", () => {
    it("swaps dimensions for landscape pages", () => {
        expect(getPageDimensions({ format: "a4", orientation: "portrait" })).toEqual({ width: 794, height: 1123 });
        expect(getPageDimensions({ format: "a4", orientation: "landscape" })).toEqual({ width: 1123, height: 794 });
    });

    it("honors explicit page breaks", () => {
        const project = createProject();
        const first = createSection("text");
        first.data.body = "First page";
        const second = createSection("text");
        second.data.body = "Second page";
        second.style.pageBreakBefore = true;
        project.sections = [first, second];
        const result = paginateSections(project);
        expect(result.pages).toHaveLength(2);
        expect(result.pages[1][0].id).toBe(second.id);
    });

    it("splits long output by lines", () => {
        const output = createSection("output");
        output.data.body = Array.from({ length: 90 }, (_, index) => `line ${index}`).join("\n");
        const pieces = splitOversizedSection(output, 600);
        expect(pieces.length).toBeGreaterThan(1);
        expect(pieces[1].continuation).toBe(true);
    });

    it("uses remaining page space for the first part of a code section", () => {
        const project = createProject();
        const output = createSection("output");
        output.data.body = Array.from({ length: 26 }, (_, index) => `result ${index}`).join("\n");
        const code = createSection("code");
        code.data.code = Array.from({ length: 40 }, (_, index) => `const value${index} = ${index};`).join("\n");
        project.sections = [output, code];
        const result = paginateSections(project);
        expect(result.pages[0]).toHaveLength(2);
        expect(result.pages[0][1].type).toBe("code");
        expect(result.pages[1][0].continuation).toBe(true);
        expect(result.pages[1].filter((section) => section.type === "code")).toHaveLength(1);
        expect(result.pages[1][0].data.lineStart).toBeGreaterThan(1);
    });

    it("moves a complete image to the next page when its proportional size does not fit", () => {
        const project = createProject();
        const output = createSection("output");
        output.data.body = Array.from({ length: 30 }, (_, index) => `result ${index}`).join("\n");
        const image = createSection("image");
        image.data.assetId = "asset-1";
        project.sections = [output, image];
        const assets = { "asset-1": { id: "asset-1", width: 1000, height: 1300 } };
        const result = paginateSections(project, assets);
        expect(result.pages[0]).toHaveLength(1);
        expect(result.pages[1][0].type).toBe("image");
        expect(result.pages[1][0].layoutMaxHeight).toBeLessThanOrEqual(455);
    });

    it("fits two large images on the same page", () => {
        const project = createProject();
        const first = createSection("image");
        first.data.assetId = "asset-1";
        const second = createSection("image");
        second.data.assetId = "asset-2";
        project.sections = [first, second];
        const assets = {
            "asset-1": { id: "asset-1", width: 1000, height: 1600 },
            "asset-2": { id: "asset-2", width: 1000, height: 1600 },
        };
        const result = paginateSections(project, assets);
        expect(result.pages).toHaveLength(1);
        expect(result.pages[0]).toHaveLength(2);
        expect(result.pages[0][0].layoutMaxHeight).toBeLessThanOrEqual(455);
        expect(result.pages[0][1].layoutMaxHeight).toBeLessThanOrEqual(455);
    });

    it("charges a landscape image pair as one row and keeps following text nearby", () => {
        const project = createProject();
        project.page.orientation = "landscape";
        const first = createSection("image");
        first.data.assetId = "asset-1";
        const second = createSection("image");
        second.data.assetId = "asset-2";
        const text = createSection("text");
        text.title = "Next experiment";
        text.data.body = "This content should follow the image row without a large blank area.";
        project.sections = [first, second, text];
        const assets = {
            "asset-1": { id: "asset-1", width: 1200, height: 800 },
            "asset-2": { id: "asset-2", width: 1200, height: 800 },
        };
        const result = paginateSections(project, assets);
        expect(result.pages).toHaveLength(1);
        expect(result.pages[0].map((section) => section.type)).toEqual(["image", "image", "text"]);
    });
});
