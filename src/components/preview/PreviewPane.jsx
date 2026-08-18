import DocumentPages from "./DocumentPages";

export default function PreviewPane({ project, assets }) {
  return (
    <section className="min-w-0" aria-label="Document preview">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase text-accent">Live preview</p>
          <p className="m-0 mt-1 text-xs text-muted">{project.page.format.toUpperCase()} · {project.page.orientation}</p>
        </div>
        <span className="text-xs text-muted">Updates as you edit</span>
      </div>
      <div className="preview-scroll overflow-auto border border-line bg-[#e9ece9] p-4 sm:p-8">
        <div className="preview-scale origin-top-left" style={{ width: "fit-content" }}>
          <DocumentPages project={project} assets={assets} rootId="preview-document" />
        </div>
      </div>
    </section>
  );
}
