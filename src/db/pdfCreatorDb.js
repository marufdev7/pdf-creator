import Dexie from "dexie";

export const db = new Dexie("folioforge-db");

db.version(1).stores({
    projects: "id, updatedAt",
    assets: "id, projectId, createdAt",
    settings: "key",
});

export async function saveProject(project) {
    await db.projects.put(project);
    await db.settings.put({ key: "lastProjectId", value: project.id });
}

export async function loadLastProject() {
    const setting = await db.settings.get("lastProjectId");
    if (setting?.value) {
        const project = await db.projects.get(setting.value);
        if (project) return project;
    }
    return db.projects.orderBy("updatedAt").last();
}

export async function saveAsset(asset) {
    await db.assets.put(asset);
}

export async function getProjectAssets(projectId) {
    return db.assets.where("projectId").equals(projectId).toArray();
}

export async function deleteAsset(assetId) {
    await db.assets.delete(assetId);
}

export async function deleteProjectAssets(projectId) {
    await db.assets.where("projectId").equals(projectId).delete();
}
