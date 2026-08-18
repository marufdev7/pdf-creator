import { CHART_TYPES, CODE_LANGUAGES, DEFAULT_CHART_COLORS } from "../config/sectionTypes";

export function createId(prefix = "id") {
    const value = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${value}`;
}

export function createSection(type) {
    const base = {
        id: createId("section"),
        type,
        title: "",
        style: {
            align: "left",
            accent: "#146b54",
            pageBreakBefore: false,
        },
    };

    const dataByType = {
        text: { body: "", markdown: true },
        code: { language: CODE_LANGUAGES[0], code: "", showLineNumbers: true, wrap: false, output: "" },
        image: { assetId: null, caption: "", fit: "contain", width: "full" },
        output: { body: "", label: "Output", tone: "neutral" },
        chart: {
            chartType: CHART_TYPES[0],
            title: "",
            xKey: "label",
            series: [{ key: "value", label: "Value", color: DEFAULT_CHART_COLORS[0] }],
            rows: [
                { label: "Alpha", value: 24 },
                { label: "Beta", value: 38 },
                { label: "Gamma", value: 31 },
            ],
        },
    };

    return { ...base, data: dataByType[type] ?? dataByType.text };
}

export function createProject(name = "Untitled PDF") {
    const now = new Date().toISOString();
    return {
        id: createId("project"),
        name,
        page: {
            format: "a4",
            orientation: "portrait",
            margins: { top: 52, right: 52, bottom: 52, left: 52 },
            showPageNumbers: true,
        },
        sections: [],
        createdAt: now,
        updatedAt: now,
    };
}

export function normalizeProject(project) {
    const fallback = createProject();
    if (!project || typeof project !== "object") return fallback;
    return {
        ...fallback,
        ...project,
        page: { ...fallback.page, ...(project.page ?? {}), margins: { ...fallback.page.margins, ...(project.page?.margins ?? {}) } },
        sections: Array.isArray(project.sections) ? project.sections : [],
    };
}
