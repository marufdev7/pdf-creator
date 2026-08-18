import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Layers3 } from "lucide-react";
import AddSectionMenu from "./AddSectionMenu";
import DocumentSettings from "./DocumentSettings";
import SectionCard from "./SectionCard";

export default function EditorPane({ project, assets, actions }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function handleDragEnd(event) {
    if (event.over && event.active.id !== event.over.id)
      actions.reorderSections(event.active.id, event.over.id);
  }
  return (
    <section className="min-w-0" aria-label="Document editor">
      <div className="sticky top-16 z-30 -mx-1 mb-3 flex items-end justify-between gap-3 bg-canvas/95 px-1 py-2 backdrop-blur sm:-mx-2 sm:px-2">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase text-accent">
            Document outline
          </p>
          <p className="m-0 mt-1 text-xs text-muted">
            {project.sections.length}{" "}
            {project.sections.length === 1 ? "section" : "sections"}
          </p>
        </div>
        <AddSectionMenu onAdd={actions.addSection} />
      </div>
      <div className="border border-line bg-[#f1f3f1]">
        <DocumentSettings page={project.page} onChange={actions.updatePage} />
        <div className="space-y-3 p-3 sm:p-4">
          {project.sections.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center border border-dashed border-[#b8c1bc] bg-white px-6 text-center">
              <Layers3 size={28} className="mb-3 text-accent" />
              <h2 className="m-0 text-base font-semibold text-ink">
                Build your document in sections
              </h2>
              <p className="mb-0 mt-2 max-w-sm text-sm leading-6 text-muted">
                Add text, code, screenshots, outputs, or chart data. Each
                section stays editable and can be reordered.
              </p>
              <p className="mb-0 mt-2 text-xs font-semibold text-accent">
                Tip: copy an image or screenshot and press Ctrl+V to add it
                instantly.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={project.sections.map((section) => section.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {project.sections.map((section, index) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      index={index}
                      assets={assets}
                      {...actions}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </section>
  );
}
