import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileArchive, FilePlus2, FileText, FolderOpen, LoaderCircle, PanelLeft } from "lucide-react";
import EditorPane from "../components/editor/EditorPane";
import DocumentPages from "../components/preview/DocumentPages";
import PreviewPane from "../components/preview/PreviewPane";
import { createProjectPackage, readProjectPackage } from "../services/project/projectPackage";
import { generatePdf } from "../services/pdf/generatePdf";
import { generateDocx } from "../services/docx/generateDocx";
import { useProjectStore } from "../store/useProjectStore";
import { downloadBlob, prepareImageFile, sanitizeFilename } from "../utils/files";

export default function App() {
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const isHydrated = useProjectStore((state) => state.isHydrated);
  const isSaving = useProjectStore((state) => state.isSaving);
  const saveError = useProjectStore((state) => state.saveError);
  const lastSavedAt = useProjectStore((state) => state.lastSavedAt);
  const exportState = useProjectStore((state) => state.exportState);
  const hydrate = useProjectStore((state) => state.hydrate);
  const saveNow = useProjectStore((state) => state.saveNow);
  const setProjectName = useProjectStore((state) => state.setProjectName);
  const createNewProject = useProjectStore((state) => state.createNewProject);
  const replaceProject = useProjectStore((state) => state.replaceProject);
  const setExportState = useProjectStore((state) => state.setExportState);
  const [mobileView, setMobileView] = useState("editor");
  const [notice, setNotice] = useState("");
  const [wordExporting, setWordExporting] = useState(false);
  const importInputRef = useRef(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return undefined;
    const timer = setTimeout(() => saveNow(), 750);
    return () => clearTimeout(timer);
  }, [project.updatedAt, isHydrated, saveNow]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    async function handleClipboardPaste(event) {
      const directFiles = [...(event.clipboardData?.files ?? [])];
      const itemFiles = [...(event.clipboardData?.items ?? [])]
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter(Boolean);
      const clipboardFiles = directFiles.length ? directFiles : itemFiles;
      if (!clipboardFiles.length) return;
      const imageFiles = clipboardFiles.filter((file) => file.type.startsWith("image/"));
      if (!imageFiles.length) {
        setNotice("Only image files can currently be pasted as sections.");
        return;
      }

      event.preventDefault();
      try {
        for (const file of imageFiles) {
          const namedFile = file.name
            ? file
            : new File([file], `pasted-image-${Date.now()}.${file.type.split("/")[1] || "png"}`, { type: file.type });
          const prepared = await prepareImageFile(namedFile);
          const store = useProjectStore.getState();
          const assetId = await store.addImageAsset(prepared);
          const sectionId = store.addSection("image");
          store.updateSection(sectionId, {
            data: {
              assetId,
              fileName: prepared.name || "Pasted image",
              mimeType: prepared.type,
            },
          });
        }
        setNotice(`${imageFiles.length === 1 ? "Image" : `${imageFiles.length} images`} pasted as ${imageFiles.length === 1 ? "a new section" : "new sections"}.`);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not paste the image.");
      }
    }

    window.addEventListener("paste", handleClipboardPaste);
    return () => window.removeEventListener("paste", handleClipboardPaste);
  }, []);

  const actions = {
    addSection: useProjectStore((state) => state.addSection),
    addSectionAfter: useProjectStore((state) => state.addSectionAfter),
    updatePage: useProjectStore((state) => state.updatePage),
    updateSection: useProjectStore((state) => state.updateSection),
    duplicateSection: useProjectStore((state) => state.duplicateSection),
    removeSection: useProjectStore((state) => state.removeSection),
    reorderSections: useProjectStore((state) => state.reorderSections),
    addImageAsset: useProjectStore((state) => state.addImageAsset),
    removeUnusedAsset: useProjectStore((state) => state.removeUnusedAsset),
  };

  async function handleGeneratePdf() {
    if (!project.sections.length) {
      setNotice("Add at least one section before generating a PDF.");
      return;
    }
    try {
      await generatePdf(project, setExportState);
      setTimeout(() => setExportState({ status: "idle", progress: 0, message: "" }), 2500);
    } catch (error) {
      setExportState({ status: "failed", progress: 0, message: error instanceof Error ? error.message : "PDF generation failed." });
    }
  }

  async function handleProjectExport() {
    try {
      const blob = await createProjectPackage(project, assets);
      downloadBlob(blob, `${sanitizeFilename(project.name)}.pdfproj`);
      setNotice("Project package downloaded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not export the project.");
    }
  }

  async function handleWordExport() {
    if (!project.sections.length) {
      setNotice("Add at least one section before exporting a Word document.");
      return;
    }
    setWordExporting(true);
    try {
      await generateDocx(project, assets);
      setNotice("Editable Word document downloaded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not export the Word document.");
    } finally {
      setWordExporting(false);
    }
  }

  async function handleProjectImport(file) {
    if (!file) return;
    try {
      const imported = await readProjectPackage(file);
      await replaceProject(imported.project, imported.assets);
      setNotice("Project imported successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import the project.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function handleNewProject() {
    if (project.sections.length && !window.confirm("Start a new project? The current project remains saved in this browser.")) return;
    await createNewProject();
    setNotice("New project created.");
  }

  if (!isHydrated) return <main className="flex min-h-screen items-center justify-center bg-canvas text-ink"><LoaderCircle className="animate-spin text-accent" size={28} /><span className="ml-3 text-sm font-medium">Opening your workspace</span></main>;

  const exporting = !["idle", "completed", "failed"].includes(exportState.status);
  const saveLabel = saveError ? "Save failed" : isSaving ? "Saving..." : lastSavedAt ? "Saved locally" : "Local project";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1800px] items-center gap-3 px-4 sm:px-6">
          <div className="mr-2 flex shrink-0 items-center gap-2"><img src="/pdf-icon.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" /><span className="hidden text-sm font-bold sm:block">FolioForge</span></div>
          <input value={project.name} onChange={(event) => setProjectName(event.target.value)} aria-label="Project name" className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm font-semibold text-ink outline-none sm:max-w-md" />
          <span className={`hidden text-xs sm:block ${saveError ? "text-[#a33a2c]" : "text-muted"}`}>{saveLabel}</span>
          <div className="flex items-center gap-1 border-l border-line pl-2">
            <button type="button" title="New project" aria-label="New project" onClick={handleNewProject} className="header-icon"><FilePlus2 size={17} /></button>
            <button type="button" title="Import project" aria-label="Import project" onClick={() => importInputRef.current?.click()} className="header-icon"><FolderOpen size={17} /></button>
            <input ref={importInputRef} type="file" accept=".pdfproj,application/octet-stream" onChange={(event) => handleProjectImport(event.target.files?.[0])} className="sr-only" />
            <button type="button" title="Export editable project" aria-label="Export editable project" onClick={handleProjectExport} className="header-icon"><FileArchive size={17} /></button>
            <button type="button" title="Export editable Word document" aria-label="Export editable Word document" disabled={wordExporting} onClick={handleWordExport} className="header-icon">{wordExporting ? <LoaderCircle size={17} className="animate-spin" /> : <FileText size={17} />}</button>
          </div>
          <button type="button" disabled={exporting} onClick={handleGeneratePdf} className="inline-flex h-10 items-center gap-2 bg-accent px-3 text-sm font-semibold text-white transition hover:bg-[#0f5945] disabled:cursor-wait disabled:opacity-60 sm:px-4">
            {exporting ? <LoaderCircle size={17} className="animate-spin" /> : <Download size={17} />}<span className="hidden sm:inline">Generate PDF</span><span className="sm:hidden">PDF</span>
          </button>
        </div>
        {exportState.status !== "idle" && <div className={`border-t px-4 py-2 text-center text-xs font-medium ${exportState.status === "failed" ? "border-[#e6b7ae] bg-[#fff1ee] text-[#a33a2c]" : "border-[#cce3d9] bg-accent-soft text-accent"}`}><span>{exportState.message}</span>{exporting && <span className="ml-2">{exportState.progress}%</span>}</div>}
      </header>

      <div className="mx-auto max-w-[1800px] px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-4 flex border border-line bg-white lg:hidden">
          <button type="button" onClick={() => setMobileView("editor")} className={`flex h-10 flex-1 items-center justify-center gap-2 text-sm font-semibold ${mobileView === "editor" ? "bg-accent text-white" : "text-muted"}`}><PanelLeft size={16} /> Editor</button>
          <button type="button" onClick={() => setMobileView("preview")} className={`flex h-10 flex-1 items-center justify-center gap-2 text-sm font-semibold ${mobileView === "preview" ? "bg-accent text-white" : "text-muted"}`}><Eye size={16} /> Preview</button>
        </div>
        <main className="grid items-start gap-7 lg:grid-cols-[minmax(430px,0.9fr)_minmax(520px,1.1fr)]">
          <div className={mobileView === "preview" ? "hidden lg:block" : "block"}><EditorPane project={project} assets={assets} actions={actions} /></div>
          <div className={mobileView === "editor" ? "hidden lg:block" : "block"}><PreviewPane project={project} assets={assets} /></div>
        </main>
      </div>
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 border border-line bg-ink px-4 py-3 text-sm font-medium text-white shadow-xl">{notice}</div>}
      <DocumentPages project={project} assets={assets} rootId="pdf-export-root" exportMode />
    </div>
  );
}
