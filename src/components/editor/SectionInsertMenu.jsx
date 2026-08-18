import { useState } from "react";
import { ChartNoAxesCombined, Code2, Image, Plus, TerminalSquare, Type } from "lucide-react";
import { SECTION_TYPES } from "../../config/sectionTypes";

const ICONS = { Type, Code2, Image, TerminalSquare, ChartNoAxesCombined };

export default function SectionInsertMenu({ onAdd, compact = false }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        title={compact ? "Add section below" : "Add section"}
        aria-label={compact ? "Add section below" : "Add section"}
        onClick={() => setOpen((value) => !value)}
        className={compact ? "inline-flex h-8 w-8 items-center justify-center text-muted transition hover:bg-accent-soft hover:text-accent" : "inline-flex h-10 items-center gap-2 bg-accent px-4 text-sm font-semibold text-white transition hover:bg-[#0f5945]"}
      >
        <Plus size={compact ? 16 : 17} />{!compact && "Add section"}
      </button>
      {open && (
        <div className={`absolute top-10 z-40 w-[285px] border border-line bg-white p-2 shadow-xl ${compact ? "right-0" : "left-0"}`}>
          {Object.entries(SECTION_TYPES).map(([type, config]) => {
            const Icon = ICONS[config.icon];
            return (
              <button key={type} type="button" onClick={() => { onAdd(type); setOpen(false); }} className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-accent-soft">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center bg-[#edf1ef] text-accent"><Icon size={17} /></span>
                <span><strong className="block text-sm text-ink">{config.label}</strong><span className="mt-0.5 block text-xs leading-5 text-muted">{config.description}</span></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
