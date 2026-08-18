import { create } from "zustand";
import { createId, createProject, createSection, normalizeProject } from "../models/projectModel";
import {
  deleteAsset,
  deleteProjectAssets,
  getProjectAssets,
  loadLastProject,
  saveAsset,
  saveProject,
} from "../db/pdfCreatorDb";
import { getImageDimensions } from "../utils/files";

function touch(project) {
  return { ...project, updatedAt: new Date().toISOString() };
}

function revokeAssetUrls(assets) {
  Object.values(assets).forEach((asset) => {
    if (asset.url) URL.revokeObjectURL(asset.url);
  });
}

export const useProjectStore = create((set, get) => ({
  project: createProject(),
  assets: {},
  isHydrated: false,
  isHydrating: false,
  isSaving: false,
  saveError: null,
  lastSavedAt: null,
  exportState: { status: "idle", progress: 0, message: "" },

  hydrate: async () => {
    if (get().isHydrating || get().isHydrated) return;
    set({ isHydrating: true });
    try {
      const stored = await loadLastProject();
      const project = normalizeProject(stored ?? createProject());
      const storedAssets = stored ? await getProjectAssets(project.id) : [];
      const assets = Object.fromEntries(
        storedAssets.map((asset) => [asset.id, { ...asset, url: URL.createObjectURL(asset.blob) }]),
      );
      if (!stored) await saveProject(project);
      set({ project, assets, isHydrated: true, isHydrating: false, saveError: null });
    } catch (error) {
      set({ isHydrated: true, isHydrating: false, saveError: error instanceof Error ? error.message : "Could not load the project." });
    }
  },

  saveNow: async () => {
    const { project } = get();
    set({ isSaving: true, saveError: null });
    try {
      await saveProject(project);
      set({ isSaving: false, lastSavedAt: new Date().toISOString() });
    } catch (error) {
      set({ isSaving: false, saveError: error instanceof Error ? error.message : "Autosave failed." });
    }
  },

  createNewProject: async () => {
    const previous = get();
    revokeAssetUrls(previous.assets);
    const project = createProject();
    set({ project, assets: {}, saveError: null });
    await saveProject(project);
  },

  setProjectName: (name) => set((state) => ({ project: touch({ ...state.project, name }) })),

  updatePage: (patch) => set((state) => ({
    project: touch({
      ...state.project,
      page: {
        ...state.project.page,
        ...patch,
        margins: patch.margins ? { ...state.project.page.margins, ...patch.margins } : state.project.page.margins,
      },
    }),
  })),

  addSection: (type) => {
    const section = createSection(type);
    set((state) => ({
      project: touch({ ...state.project, sections: [...state.project.sections, section] }),
    }));
    return section.id;
  },

  addSectionAfter: (sectionId, type) => {
    const section = createSection(type);
    set((state) => {
      const index = state.project.sections.findIndex((item) => item.id === sectionId);
      if (index < 0) return state;
      const sections = [...state.project.sections];
      sections.splice(index + 1, 0, section);
      return { project: touch({ ...state.project, sections }) };
    });
    return section.id;
  },

  updateSection: (sectionId, patch) => set((state) => ({
    project: touch({
      ...state.project,
      sections: state.project.sections.map((section) => section.id === sectionId
        ? {
            ...section,
            ...patch,
            data: patch.data ? { ...section.data, ...patch.data } : section.data,
            style: patch.style ? { ...section.style, ...patch.style } : section.style,
          }
        : section),
    }),
  })),

  duplicateSection: (sectionId) => set((state) => {
    const index = state.project.sections.findIndex((section) => section.id === sectionId);
    if (index < 0) return state;
    const source = state.project.sections[index];
    const duplicate = structuredClone(source);
    duplicate.id = createId("section");
    duplicate.title = source.title ? `${source.title} copy` : "";
    const sections = [...state.project.sections];
    sections.splice(index + 1, 0, duplicate);
    return { project: touch({ ...state.project, sections }) };
  }),

  removeSection: async (sectionId) => {
    const section = get().project.sections.find((item) => item.id === sectionId);
    const assetId = section?.type === "image" ? section.data.assetId : null;
    set((state) => ({
      project: touch({ ...state.project, sections: state.project.sections.filter((item) => item.id !== sectionId) }),
    }));
    const assetStillUsed = assetId && get().project.sections.some((item) => item.type === "image" && item.data.assetId === assetId);
    if (assetId && !assetStillUsed) {
      const asset = get().assets[assetId];
      if (asset?.url) URL.revokeObjectURL(asset.url);
      set((state) => {
        const assets = { ...state.assets };
        delete assets[assetId];
        return { assets };
      });
      await deleteAsset(assetId);
    }
  },

  reorderSections: (activeId, overId) => set((state) => {
    const oldIndex = state.project.sections.findIndex((section) => section.id === activeId);
    const newIndex = state.project.sections.findIndex((section) => section.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return state;
    const sections = [...state.project.sections];
    const [moved] = sections.splice(oldIndex, 1);
    sections.splice(newIndex, 0, moved);
    return { project: touch({ ...state.project, sections }) };
  }),

  addImageAsset: async (file) => {
    const projectId = get().project.id;
    const id = createId("asset");
    const dimensions = await getImageDimensions(file);
    const asset = {
      id,
      projectId,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      width: dimensions.width,
      height: dimensions.height,
      blob: file,
      createdAt: new Date().toISOString(),
    };
    await saveAsset(asset);
    set((state) => ({ assets: { ...state.assets, [id]: { ...asset, url: URL.createObjectURL(file) } } }));
    return id;
  },

  removeUnusedAsset: async (assetId) => {
    if (!assetId || get().project.sections.some((section) => section.type === "image" && section.data.assetId === assetId)) return;
    const asset = get().assets[assetId];
    if (asset?.url) URL.revokeObjectURL(asset.url);
    set((state) => {
      const assets = { ...state.assets };
      delete assets[assetId];
      return { assets };
    });
    await deleteAsset(assetId);
  },

  replaceProject: async (incomingProject, incomingAssets = []) => {
    const previous = get();
    revokeAssetUrls(previous.assets);
    const project = normalizeProject(incomingProject);
    await deleteProjectAssets(project.id);
    const assets = {};
    for (const asset of incomingAssets) {
      await saveAsset(asset);
      assets[asset.id] = { ...asset, url: URL.createObjectURL(asset.blob) };
    }
    await saveProject(project);
    set({ project, assets, saveError: null });
  },

  setExportState: (exportState) => set({ exportState }),
}));
