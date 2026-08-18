import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  ScissorsLineDashed,
  Trash2,
} from "lucide-react";
import { SECTION_TYPES } from "../../config/sectionTypes";
import IconButton from "../ui/IconButton";
import SectionInsertMenu from "./SectionInsertMenu";
import SectionEditor from "./section-editors/SectionEditors";

export default function SectionCard({
  section,
  index,
  updateSection,
  duplicateSection,
  removeSection,
  addSectionAfter,
  addImageAsset,
  removeUnusedAsset,
  assets,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const update = (patch) => updateSection(section.id, patch);
  return (
    <article
      ref={setNodeRef}
      style={style}
      data-section-id={section.id}
      className={`border border-line bg-white shadow-sm ${isDragging ? "relative z-20 opacity-70" : ""}`}
    >
      <header className="flex min-h-12 items-center border-b border-line bg-[#fafbfa] px-2">
        <button
          type="button"
          title="Drag to reorder"
          aria-label="Drag to reorder"
          className="flex h-9 w-8 cursor-grab items-center justify-center text-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={17} />
        </button>
        <div className="min-w-0 flex-1 px-2">
          <span className="text-[10px] font-bold uppercase text-accent">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="ml-2 text-sm font-semibold text-ink">
            {SECTION_TYPES[section.type]?.label}
          </span>
        </div>
        <IconButton
          label={
            section.style?.pageBreakBefore
              ? "Remove page break"
              : "Start on new page"
          }
          onClick={() =>
            update({
              style: { pageBreakBefore: !section.style?.pageBreakBefore },
            })
          }
          className={section.style?.pageBreakBefore ? "text-accent" : ""}
        >
          <ScissorsLineDashed size={16} />
        </IconButton>
        <IconButton
          label="Duplicate section"
          onClick={() => duplicateSection(section.id)}
        >
          <Copy size={16} />
        </IconButton>
        <SectionInsertMenu
          compact
          onAdd={(type) => addSectionAfter(section.id, type)}
        />
        <IconButton
          label="Delete section"
          onClick={() => removeSection(section.id)}
          className="hover:text-[#a33a2c]"
        >
          <Trash2 size={16} />
        </IconButton>
        <IconButton
          label={collapsed ? "Expand section" : "Collapse section"}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </IconButton>
      </header>
      {!collapsed && (
        <div className="space-y-4 p-4">
          <label className="block text-[11px] font-bold uppercase text-muted">
            Section title
            <input
              value={section.title}
              onChange={(event) => update({ title: event.target.value })}
              placeholder="Optional heading"
              className="mt-2 w-full border border-line bg-white px-3 py-2 text-sm font-normal normal-case text-ink"
            />
          </label>
          <SectionEditor
            section={section}
            update={update}
            addImageAsset={addImageAsset}
            removeUnusedAsset={removeUnusedAsset}
            assets={assets}
          />
        </div>
      )}
    </article>
  );
}
