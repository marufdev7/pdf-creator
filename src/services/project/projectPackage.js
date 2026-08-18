import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { normalizeProject } from "../../models/projectModel";

const PACKAGE_VERSION = 1;

export async function createProjectPackage(project, assets) {
  const assetMetadata = Object.values(assets).map(({ blob: _blob, url: _url, ...asset }) => asset);
  const files = {
    "manifest.json": strToU8(JSON.stringify({ version: PACKAGE_VERSION, project, assets: assetMetadata }, null, 2)),
  };
  for (const asset of Object.values(assets)) {
    files[`assets/${asset.id}`] = new Uint8Array(await asset.blob.arrayBuffer());
  }
  return new Blob([zipSync(files, { level: 6 })], { type: "application/octet-stream" });
}

export async function readProjectPackage(file) {
  if (file.size > 100 * 1024 * 1024) throw new Error("Project packages must be smaller than 100 MB.");
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  if (!files["manifest.json"]) throw new Error("This file is not a valid FolioForge project.");
  const manifest = JSON.parse(strFromU8(files["manifest.json"]));
  if (manifest.version !== PACKAGE_VERSION) throw new Error("This project version is not supported.");
  const project = normalizeProject(manifest.project);
  const assets = [];
  for (const section of project.sections) {
    if (section.type !== "image" || !section.data.assetId) continue;
    const bytes = files[`assets/${section.data.assetId}`];
    if (!bytes) continue;
    const mimeType = section.data.mimeType || "image/png";
    const metadata = manifest.assets?.find((asset) => asset.id === section.data.assetId) ?? {};
    assets.push({
      ...metadata,
      id: section.data.assetId,
      projectId: project.id,
      name: section.data.fileName || section.data.assetId,
      mimeType,
      size: bytes.byteLength,
      blob: new Blob([bytes], { type: mimeType }),
      createdAt: new Date().toISOString(),
    });
  }
  return { project, assets };
}
