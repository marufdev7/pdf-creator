import { Monitor, RectangleHorizontal, RectangleVertical } from "lucide-react";

const MARGIN_PRESETS = { compact: 36, normal: 52, roomy: 72 };

export default function DocumentSettings({ page, onChange }) {
  const currentMargin = page.margins.top;
  const marginPreset = Object.entries(MARGIN_PRESETS).find(([, value]) => value === currentMargin)?.[0] || "normal";
  return (
    <section className="border-y border-line bg-[#f8f9f7] px-4 py-3" aria-label="Page settings">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">
          <Monitor size={15} />
          <select value={page.format} onChange={(event) => onChange({ format: event.target.value })} className="h-8 border border-line bg-white px-2 text-sm font-medium text-ink">
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </label>
        <div className="flex border border-line bg-white" aria-label="Page orientation">
          <button type="button" title="Portrait" aria-label="Portrait" onClick={() => onChange({ orientation: "portrait" })} className={`flex h-8 w-9 items-center justify-center ${page.orientation === "portrait" ? "bg-accent text-white" : "text-muted"}`}><RectangleVertical size={16} /></button>
          <button type="button" title="Landscape" aria-label="Landscape" onClick={() => onChange({ orientation: "landscape" })} className={`flex h-8 w-9 items-center justify-center ${page.orientation === "landscape" ? "bg-accent text-white" : "text-muted"}`}><RectangleHorizontal size={16} /></button>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">Margins
          <select value={marginPreset} onChange={(event) => { const value = MARGIN_PRESETS[event.target.value]; onChange({ margins: { top: value, right: value, bottom: value, left: value } }); }} className="h-8 border border-line bg-white px-2 text-sm font-medium text-ink">
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="roomy">Roomy</option>
          </select>
        </label>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
          <input type="checkbox" checked={page.showPageNumbers} onChange={(event) => onChange({ showPageNumbers: event.target.checked })} className="h-4 w-4 accent-accent" /> Page numbers
        </label>
      </div>
    </section>
  );
}
