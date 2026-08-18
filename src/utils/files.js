const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function sanitizeFilename(value, fallback = "document") {
    const printable = [...value].filter((character) => character.charCodeAt(0) > 31).join("");
    const cleaned = printable
        .trim()
        .replace(/[<>:"/\\|?*]/g, "-")
        .replace(/\s+/g, " ")
        .replace(/[. ]+$/g, "")
        .slice(0, 100);
    return cleaned || fallback;
}

export async function prepareImageFile(file) {
    if (!IMAGE_TYPES.has(file.type)) throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
    if (file.size > 20 * 1024 * 1024) throw new Error("Images must be smaller than 20 MB.");
    if (file.type === "image/gif" || file.size < 3 * 1024 * 1024) return file;

    const bitmap = await createImageBitmap(file);
    const maxDimension = 2400;
    const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (ratio === 1) {
        bitmap.close();
        return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
}

export async function getImageDimensions(file) {
    try {
        const bitmap = await createImageBitmap(file);
        const dimensions = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        return dimensions;
    } catch {
        return { width: null, height: null };
    }
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
