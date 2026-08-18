export const PAGE_SIZES = {
    a4: { width: 794, height: 1123, label: "A4" },
    letter: { width: 816, height: 1056, label: "Letter" },
};

export function getPageDimensions(page) {
    const size = PAGE_SIZES[page.format] ?? PAGE_SIZES.a4;
    return page.orientation === "landscape"
        ? { width: size.height, height: size.width }
        : { width: size.width, height: size.height };
}

function countWrappedLines(value, charactersPerLine) {
    return String(value || "")
        .split("\n")
        .reduce(
            (total, line) =>
                total + Math.max(1, Math.ceil(line.length / charactersPerLine)),
            0,
        );
}

const SECTION_GAP = 24;
const FIRST_PAGE_HEADER_HEIGHT = 56;

export function estimateSectionHeight(section, contentWidth) {
    const title = section.title ? 38 : 0;
    const charactersPerLine = Math.max(34, Math.floor(contentWidth / 8.3));
    switch (section.type) {
        case "text":
            return (
                title +
                countWrappedLines(section.data.body, charactersPerLine) * 25 +
                30
            );
        case "code":
            return (
                title +
                countWrappedLines(
                    section.data.code,
                    Math.floor(charactersPerLine * 0.85),
                ) *
                21 +
                (section.data.output
                    ? countWrappedLines(section.data.output, charactersPerLine) * 20 + 52
                    : 0) +
                46
            );
        case "output":
            return (
                title +
                countWrappedLines(section.data.body, charactersPerLine) * 21 +
                62
            );
        case "image":
            return (
                title +
                (section.layoutMaxHeight || 430) +
                (section.data.caption ? 34 : 0)
            );
        case "chart":
            return title + (section.layoutMaxHeight || 405);
        default:
            return title + 100;
    }
}

function splitLinesOnce(section, key, maxLines) {
    const lines = String(section.data[key] || "").split("\n");
    if (lines.length <= maxLines) return [section];
    const lineStart = section.data.lineStart || 1;
    const firstLines = lines.slice(0, maxLines);
    const remainingLines = lines.slice(maxLines);
    return [
        {
            ...section,
            id: `${section.id}-page-part`,
            data: {
                ...section.data,
                [key]: firstLines.join("\n"),
                lineStart,
                output: "",
            },
        },
        {
            ...section,
            id: `${section.id}-remainder`,
            title: "",
            style: { ...section.style, pageBreakBefore: false },
            data: {
                ...section.data,
                [key]: remainingLines.join("\n"),
                lineStart: lineStart + firstLines.length,
                output: section.data.output || "",
            },
            continuation: true,
        },
    ];
}

function chunkText(section, maxCharacters) {
    const body = String(section.data.body || "");
    if (body.length <= maxCharacters) return [section];
    const paragraphs = body.split(/\n\s*\n/);
    const chunks = [];
    let current = "";
    paragraphs.forEach((paragraph) => {
        if (current && current.length + paragraph.length + 2 > maxCharacters) {
            chunks.push(current);
            current = paragraph;
        } else {
            current = current ? `${current}\n\n${paragraph}` : paragraph;
        }
    });
    if (current) chunks.push(current);
    if (chunks.length === 1 && chunks[0].length > maxCharacters) {
        const words = body.split(/\s+/);
        chunks.length = 0;
        current = "";
        words.forEach((word) => {
            if (current && current.length + word.length + 1 > maxCharacters) {
                chunks.push(current);
                current = word;
            } else current = current ? `${current} ${word}` : word;
        });
        if (current) chunks.push(current);
    }
    return chunks.map((chunk, index) => ({
        ...section,
        id: `${section.id}-part-${index + 1}`,
        title: index === 0 ? section.title : "",
        data: { ...section.data, body: chunk },
        continuation: index > 0,
    }));
}

export function splitOversizedSection(
    section,
    availableHeight,
    contentWidth = 618,
) {
    if (section.type === "text") {
        const charactersPerLine = Math.max(34, Math.floor(contentWidth / 8.3));
        const maxCharacters = Math.max(
            140,
            Math.floor(
                (Math.max(120, availableHeight - 72) / 25) * charactersPerLine,
            ),
        );
        return chunkText(section, maxCharacters);
    }
    if (section.type === "code")
        return splitLinesOnce(
            section,
            "code",
            Math.max(5, Math.floor(Math.max(120, availableHeight - 115) / 21)),
        );
    if (section.type === "output")
        return splitLinesOnce(
            section,
            "body",
            Math.max(5, Math.floor(Math.max(120, availableHeight - 62) / 21)),
        );
    if (section.type === "chart" && availableHeight >= 260) {
        return [
            {
                ...section,
                layoutMaxHeight: Math.max(
                    260,
                    Math.min(405, availableHeight - (section.title ? 38 : 0) - 12),
                ),
            },
        ];
    }
    return [section];
}

function prepareImageSection(
    section,
    assets,
    renderedWidth,
    availableHeight,
    layout = "portrait",
) {
    if (section.type !== "image") return section;
    const asset = assets[section.data.assetId];
    const titleHeight = section.title ? 38 : 0;
    const captionHeight = section.data.caption ? 34 : 0;
    const portraitBudget = Math.max(
        220,
        Math.min(
            455,
            (availableHeight - SECTION_GAP - FIRST_PAGE_HEADER_HEIGHT) / 2,
        ),
    );
    const pairedLandscapeBudget = Math.max(
        220,
        Math.min(360, availableHeight * 0.54),
    );
    const singleLandscapeBudget = Math.max(
        300,
        Math.min(520, availableHeight * 0.72),
    );
    const sectionBudget =
        layout === "landscape-pair"
            ? pairedLandscapeBudget
            : layout === "landscape-single"
                ? singleLandscapeBudget
                : portraitBudget;
    const maximumHeight = Math.max(
        140,
        sectionBudget - titleHeight - captionHeight,
    );
    if (!asset?.width || !asset?.height)
        return { ...section, layoutMaxHeight: Math.min(390, maximumHeight) };
    const displayWidth = Math.min(asset.width, renderedWidth);
    const proportionalHeight = displayWidth * (asset.height / asset.width);
    return {
        ...section,
        layoutMaxHeight: Math.min(proportionalHeight, maximumHeight),
    };
}

function prepareSections(project, assets, contentWidth, availableHeight) {
    const prepared = [];
    for (let index = 0; index < project.sections.length; index += 1) {
        const section = project.sections[index];
        const nextSection = project.sections[index + 1];
        const canPair =
            project.page.orientation === "landscape" &&
            section.type === "image" &&
            nextSection?.type === "image" &&
            !nextSection.style?.pageBreakBefore;
        if (canPair) {
            const columnWidth = (contentWidth - SECTION_GAP) / 2;
            prepared.push(
                prepareImageSection(
                    section,
                    assets,
                    columnWidth,
                    availableHeight,
                    "landscape-pair",
                ),
            );
            prepared.push(
                prepareImageSection(
                    nextSection,
                    assets,
                    columnWidth,
                    availableHeight,
                    "landscape-pair",
                ),
            );
            index += 1;
        } else {
            const layout =
                project.page.orientation === "landscape"
                    ? "landscape-single"
                    : "portrait";
            prepared.push(
                prepareImageSection(
                    section,
                    assets,
                    contentWidth,
                    availableHeight,
                    layout,
                ),
            );
        }
    }
    return prepared;
}

export function paginateSections(project, assets = {}) {
    const dimensions = getPageDimensions(project.page);
    const { margins } = project.page;
    const contentWidth = dimensions.width - margins.left - margins.right;
    const availableHeight =
        dimensions.height -
        margins.top -
        margins.bottom -
        (project.page.showPageNumbers ? 24 : 0);
    const pages = [];
    let current = [];
    let used = project.name ? FIRST_PAGE_HEADER_HEIGHT : 0;

    const startPage = () => {
        if (current.length) pages.push(current);
        current = [];
        used = 0;
    };

    const queue = prepareSections(project, assets, contentWidth, availableHeight);
    while (queue.length) {
        const original = queue.shift();
        const requestedBreak =
            !original.continuation && original.style?.pageBreakBefore;
        if (requestedBreak && current.length) startPage();

        const gap = current.length ? SECTION_GAP : 0;
        const remaining = availableHeight - used - gap;
        const pairedImage =
            project.page.orientation === "landscape" &&
            original.type === "image" &&
            queue[0]?.type === "image" &&
            !queue[0].style?.pageBreakBefore;
        if (pairedImage) {
            const partner = queue[0];
            const rowHeight = Math.max(
                estimateSectionHeight(original, contentWidth),
                estimateSectionHeight(partner, contentWidth),
            );
            if (rowHeight <= remaining) {
                queue.shift();
                current.push(original, partner);
                used += gap + rowHeight;
                continue;
            }
            if (current.length) {
                startPage();
                queue.unshift(original);
                continue;
            }
            queue.shift();
            current.push(original, partner);
            used = Math.min(availableHeight, rowHeight);
            continue;
        }
        const originalHeight = estimateSectionHeight(original, contentWidth);
        if (originalHeight <= remaining) {
            current.push(original);
            used += gap + originalHeight;
            continue;
        }

        const pieces = splitOversizedSection(
            original,
            Math.max(remaining, 0),
            contentWidth,
        );
        const first = pieces[0];
        const firstHeight = estimateSectionHeight(first, contentWidth);
        if (first !== original || pieces.length > 1) {
            if (current.length && firstHeight > remaining) {
                startPage();
                queue.unshift(original);
                continue;
            }
            current.push(first);
            used +=
                (current.length > 1 ? SECTION_GAP : 0) +
                Math.min(availableHeight, firstHeight);
            queue.unshift(...pieces.slice(1));
            continue;
        }

        if (current.length) {
            startPage();
            queue.unshift(original);
            continue;
        }

        // A single unsplittable block gets the full page rather than creating an empty page.
        current.push(original);
        used = Math.min(availableHeight, originalHeight);
    }
    if (current.length || pages.length === 0) pages.push(current);
    return { pages, dimensions, contentWidth, availableHeight };
}
