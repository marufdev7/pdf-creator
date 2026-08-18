import { downloadBlob, sanitizeFilename } from "../../utils/files";

const PAGE_SIZES_TWIPS = {
    a4: { width: 11906, height: 16838 },
    letter: { width: 12240, height: 15840 },
};

function inlineTokens(value, TextRun) {
    const runs = [];
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let cursor = 0;
    for (const match of value.matchAll(pattern)) {
        if (match.index > cursor) runs.push(new TextRun(value.slice(cursor, match.index)));
        const token = match[0];
        if (token.startsWith("**")) runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
        else if (token.startsWith("`")) runs.push(new TextRun({ text: token.slice(1, -1), font: "Consolas", shading: { fill: "EEF1EF" } }));
        else runs.push(new TextRun({ text: token.slice(1, -1), italics: true }));
        cursor = match.index + token.length;
    }
    if (cursor < value.length) runs.push(new TextRun(value.slice(cursor)));
    return runs.length ? runs : [new TextRun("")];
}

export function markdownLines(value) {
    return String(value || "").split("\n").map((line) => {
        const heading = line.match(/^(#{1,3})\s+(.*)$/);
        if (heading) return { kind: `heading${heading[1].length}`, text: heading[2] };
        const bullet = line.match(/^[-*+]\s+(.*)$/);
        if (bullet) return { kind: "bullet", text: bullet[1] };
        const quote = line.match(/^>\s?(.*)$/);
        if (quote) return { kind: "quote", text: quote[1] };
        return { kind: line.trim() ? "paragraph" : "blank", text: line };
    });
}

async function normalizeImage(asset) {
    const supported = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/bmp": "bmp" };
    if (supported[asset.mimeType]) return { type: supported[asset.mimeType], blob: asset.blob };
    const bitmap = await createImageBitmap(asset.blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error(`Could not convert ${asset.name || "the image"} for Word.`);
    return { type: "png", blob };
}

function imageDimensions(asset, maxWidth, maxHeight) {
    const width = asset.width || maxWidth;
    const height = asset.height || maxHeight;
    const ratio = Math.min(1, maxWidth / width, maxHeight / height);
    return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

function noTableBorders(BorderStyle) {
    const border = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    return { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
}

export async function generateDocx(project, assets) {
    const docx = await import("docx");
    const {
        AlignmentType,
        BorderStyle,
        Document,
        Footer,
        HeadingLevel,
        ImageRun,
        PageBreak,
        PageNumber,
        PageOrientation,
        Packer,
        Paragraph,
        ShadingType,
        Table,
        TableCell,
        TableRow,
        TextRun,
        VerticalAlign,
        WidthType,
    } = docx;

    const pageSize = PAGE_SIZES_TWIPS[project.page.format] || PAGE_SIZES_TWIPS.a4;
    const landscape = project.page.orientation === "landscape";
    const margins = Object.fromEntries(Object.entries(project.page.margins).map(([key, value]) => [key, Math.round(value * 15)]));
    const children = [
        new Paragraph({ text: project.name, heading: HeadingLevel.TITLE, spacing: { after: 320 } }),
    ];

    const sectionTitle = (section) => section.title
        ? [new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 180, after: 100 } })]
        : [];

    const imageContent = async (section, maxWidth, maxHeight) => {
        const asset = assets[section.data.assetId];
        if (!asset) return [new Paragraph({ text: "[Missing image]", italics: true })];
        const normalized = await normalizeImage(asset);
        const dimensions = imageDimensions(asset, maxWidth, maxHeight);
        const image = new ImageRun({
            type: normalized.type,
            data: new Uint8Array(await normalized.blob.arrayBuffer()),
            transformation: dimensions,
            altText: { title: section.title || asset.name || "Image", description: section.data.caption || "Document image", name: asset.name || "Image" },
        });
        const result = [new Paragraph({ alignment: AlignmentType.CENTER, children: [image], spacing: { after: section.data.caption ? 80 : 160 } })];
        if (section.data.caption) result.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: section.data.caption, italics: true, color: "65706B", size: 18 })], spacing: { after: 160 } }));
        return result;
    };

    for (let index = 0; index < project.sections.length; index += 1) {
        const section = project.sections[index];
        if (section.style?.pageBreakBefore) children.push(new Paragraph({ children: [new PageBreak()] }));

        const nextSection = project.sections[index + 1];
        if (landscape && section.type === "image" && nextSection?.type === "image" && !nextSection.style?.pageBreakBefore) {
            const firstCell = [...sectionTitle(section), ...(await imageContent(section, 390, 330))];
            const secondCell = [...sectionTitle(nextSection), ...(await imageContent(nextSection, 390, 330))];
            children.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnWidths: [5000, 5000],
                borders: noTableBorders(BorderStyle),
                rows: [new TableRow({
                    children: [
                        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.TOP, margins: { right: 120 }, children: firstCell }),
                        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.TOP, margins: { left: 120 }, children: secondCell }),
                    ]
                })],
            }));
            index += 1;
            continue;
        }

        children.push(...sectionTitle(section));
        if (section.type === "text") {
            for (const line of markdownLines(section.data.body)) {
                if (line.kind === "blank") children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
                else if (line.kind.startsWith("heading")) {
                    const levels = { heading1: HeadingLevel.HEADING_1, heading2: HeadingLevel.HEADING_2, heading3: HeadingLevel.HEADING_3 };
                    children.push(new Paragraph({ children: inlineTokens(line.text, TextRun), heading: levels[line.kind], spacing: { before: 160, after: 80 } }));
                } else if (line.kind === "bullet") children.push(new Paragraph({ children: inlineTokens(line.text, TextRun), bullet: { level: 0 }, spacing: { after: 60 } }));
                else if (line.kind === "quote") children.push(new Paragraph({ children: inlineTokens(line.text, TextRun), indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, color: "146B54", size: 12, space: 10 } }, spacing: { after: 80 } }));
                else children.push(new Paragraph({ children: inlineTokens(line.text, TextRun), spacing: { after: 100, line: 300 } }));
            }
        } else if (section.type === "code" || section.type === "output") {
            const source = section.type === "code" ? section.data.code : section.data.body;
            const start = section.data.lineStart || 1;
            const codeRuns = String(source || "").split("\n").flatMap((line, lineIndex, lines) => {
                const prefix = section.type === "code" && section.data.showLineNumbers ? `${String(start + lineIndex).padStart(3, " ")}  ` : "";
                return [new TextRun({ text: `${prefix}${line}`, font: "Consolas", size: 18 }), ...(lineIndex < lines.length - 1 ? [new TextRun({ break: 1 })] : [])];
            });
            children.push(new Paragraph({ children: codeRuns, shading: { type: ShadingType.CLEAR, fill: "F4F6F4", color: "auto" }, border: { top: { style: BorderStyle.SINGLE, color: "D9DDDA", size: 4 }, bottom: { style: BorderStyle.SINGLE, color: "D9DDDA", size: 4 }, left: { style: BorderStyle.SINGLE, color: "D9DDDA", size: 4 }, right: { style: BorderStyle.SINGLE, color: "D9DDDA", size: 4 } }, spacing: { before: 80, after: 160, line: 260 }, indent: { left: 120, right: 120 } }));
            if (section.type === "code" && section.data.output) {
                children.push(new Paragraph({ children: [new TextRun({ text: "Output", bold: true, color: "146B54" }), new TextRun({ break: 1 }), new TextRun({ text: section.data.output, font: "Consolas", size: 18 })], shading: { type: ShadingType.CLEAR, fill: "E5F3ED", color: "auto" }, spacing: { after: 160 }, indent: { left: 120, right: 120 } }));
            }
        } else if (section.type === "image") {
            children.push(...await imageContent(section, landscape ? 760 : 560, landscape ? 460 : 390));
        } else if (section.type === "chart") {
            if (section.data.title) children.push(new Paragraph({ text: section.data.title, heading: HeadingLevel.HEADING_3, spacing: { after: 100 } }));
            const columns = [section.data.xKey, ...section.data.series.map((series) => series.key)];
            const rows = [
                new TableRow({ tableHeader: true, children: columns.map((column) => new TableCell({ shading: { fill: "E5F3ED" }, children: [new Paragraph({ children: [new TextRun({ text: column, bold: true })] })] })) }),
                ...section.data.rows.map((row) => new TableRow({ children: columns.map((column) => new TableCell({ children: [new Paragraph(String(row[column] ?? ""))] })) })),
            ];
            children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
            children.push(new Paragraph({ text: "Chart data is exported as an editable table.", italics: true, color: "65706B", spacing: { before: 80, after: 160 } }));
        }
    }

    const footer = project.page.showPageNumbers
        ? new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("Page "), PageNumber.CURRENT, new TextRun(" of "), PageNumber.TOTAL_PAGES] })] })
        : undefined;
    const documentFile = new Document({
        creator: "FolioForge",
        title: project.name,
        description: "Editable document exported from FolioForge",
        styles: { default: { document: { run: { font: "Aptos", size: 22 }, paragraph: { spacing: { line: 276 } } } } },
        sections: [{
            properties: {
                page: {
                    size: { width: landscape ? pageSize.height : pageSize.width, height: landscape ? pageSize.width : pageSize.height, orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
                    margin: margins,
                },
            },
            footers: footer ? { default: footer } : undefined,
            children,
        }],
    });
    const blob = await Packer.toBlob(documentFile);
    downloadBlob(blob, `${sanitizeFilename(project.name)}.docx`);
}
