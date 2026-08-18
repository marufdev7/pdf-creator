import { sanitizeFilename } from "../../utils/files";

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

export async function generatePdf(project, onProgress) {
  onProgress({ status: "preparing", progress: 5, message: "Preparing document" });
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  await document.fonts?.ready;
  document.documentElement.dataset.exporting = "true";
  await nextFrame();

  try {
    const pageNodes = [...document.querySelectorAll("#pdf-export-root [data-pdf-page]")];
    if (!pageNodes.length) throw new Error("The export preview is not ready.");
    const orientation = project.page.orientation === "landscape" ? "landscape" : "portrait";
    const pdf = new jsPDF({ orientation, unit: "mm", format: project.page.format, compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let index = 0; index < pageNodes.length; index += 1) {
      onProgress({
        status: "rendering",
        progress: 10 + Math.round(((index + 1) / pageNodes.length) * 80),
        message: `Rendering page ${index + 1} of ${pageNodes.length}`,
      });
      const canvas = await html2canvas(pageNodes[index], {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
      });
      if (index > 0) pdf.addPage(project.page.format, orientation);
      const image = canvas.toDataURL("image/jpeg", 0.94);
      pdf.addImage(image, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
      canvas.width = 1;
      canvas.height = 1;
      await nextFrame();
    }

    onProgress({ status: "finalizing", progress: 96, message: "Finalizing PDF" });
    pdf.save(`${sanitizeFilename(project.name)}.pdf`);
    onProgress({ status: "completed", progress: 100, message: "PDF downloaded" });
  } finally {
    delete document.documentElement.dataset.exporting;
  }
}
