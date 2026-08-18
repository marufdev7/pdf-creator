import { useMemo } from "react";
import { paginateSections } from "../../services/pdf/pagination";
import SectionRenderer from "./section-renderers/SectionRenderer";

export default function DocumentPages({
  project,
  assets,
  exportMode = false,
  rootId,
}) {
  const layout = useMemo(
    () => paginateSections(project, assets),
    [project, assets],
  );
  const { dimensions, pages } = layout;
  function renderSections(sections) {
    const rendered = [];
    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index];
      const nextSection = sections[index + 1];
      if (
        project.page.orientation === "landscape" &&
        section.type === "image" &&
        nextSection?.type === "image"
      ) {
        rendered.push(
          <div
            key={`${section.id}-${nextSection.id}`}
            data-image-row
            className="grid grid-cols-2 items-start gap-6"
          >
            <SectionRenderer section={section} assets={assets} />
            <SectionRenderer section={nextSection} assets={assets} />
          </div>,
        );
        index += 1;
      } else {
        rendered.push(
          <SectionRenderer
            key={section.id}
            section={section}
            assets={assets}
          />,
        );
      }
    }
    return rendered;
  }
  return (
    <div
      id={rootId}
      className={
        exportMode
          ? "pointer-events-none absolute left-[-100000px] top-0"
          : "space-y-8 pb-10"
      }
      aria-hidden={exportMode}
    >
      {pages.map((sections, pageIndex) => (
        <article
          key={pageIndex}
          data-pdf-page
          className={`pdf-page relative bg-white text-ink ${exportMode ? "" : "shadow-[0_18px_45px_rgba(23,39,32,0.09)]"}`}
          style={{
            width: dimensions.width,
            height: dimensions.height,
            padding: `${project.page.margins.top}px ${project.page.margins.right}px ${project.page.margins.bottom + (project.page.showPageNumbers ? 24 : 0)}px ${project.page.margins.left}px`,
          }}
        >
          <div className="flex h-full flex-col gap-6 overflow-hidden">
            {pageIndex === 0 && project.name && (
              <div className="border-b-2 border-accent pb-4 text-[11px] font-bold uppercase text-accent">
                {project.name}
              </div>
            )}
            {renderSections(sections)}
          </div>
          {project.page.showPageNumbers && (
            <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-muted">
              {pageIndex + 1} / {pages.length}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
