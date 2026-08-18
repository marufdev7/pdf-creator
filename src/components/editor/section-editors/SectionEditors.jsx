import { useMemo, useState } from "react";
import { FileUp, Plus, Trash2, Upload } from "lucide-react";
import {
  CHART_TYPES,
  CODE_LANGUAGES,
  DEFAULT_CHART_COLORS,
} from "../../../config/sectionTypes";
import { parseChartCsv } from "../../../services/project/csv";
import { prepareImageFile } from "../../../utils/files";

const inputClass =
  "w-full border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-[#9aa39f]";
const labelClass = "block text-[11px] font-bold uppercase text-muted";

function TextEditor({ section, update }) {
  return (
    <label className={labelClass}>
      Text or Markdown
      <textarea
        value={section.data.body}
        onChange={(event) => update({ data: { body: event.target.value } })}
        placeholder="Write an explanation, notes, or Markdown..."
        rows={8}
        className={`${inputClass} mt-2 resize-y leading-6`}
      />
    </label>
  );
}

function CodeEditor({ section, update }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Language
          <select
            value={section.data.language}
            onChange={(event) =>
              update({ data: { language: event.target.value } })
            }
            className={`${inputClass} mt-2 normal-case`}
          >
            {CODE_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Filename
          <input
            value={section.data.filename || ""}
            onChange={(event) =>
              update({ data: { filename: event.target.value } })
            }
            placeholder="example.js"
            className={`${inputClass} mt-2 normal-case`}
          />
        </label>
      </div>
      <label className={labelClass}>
        Source code
        <textarea
          value={section.data.code}
          onChange={(event) => update({ data: { code: event.target.value } })}
          placeholder="Paste source code..."
          rows={10}
          spellCheck={false}
          className={`${inputClass} mt-2 resize-y font-mono normal-case leading-5`}
        />
      </label>
      <label className={labelClass}>
        Optional output
        <textarea
          value={section.data.output || ""}
          onChange={(event) => update({ data: { output: event.target.value } })}
          placeholder="Paste the result here..."
          rows={4}
          spellCheck={false}
          className={`${inputClass} mt-2 resize-y font-mono normal-case leading-5`}
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-semibold text-muted">
        <input
          type="checkbox"
          checked={section.data.showLineNumbers}
          onChange={(event) =>
            update({ data: { showLineNumbers: event.target.checked } })
          }
          className="accent-accent"
        />{" "}
        Show line numbers
      </label>
    </div>
  );
}

function ImageEditor({
  section,
  update,
  addImageAsset,
  removeUnusedAsset,
  asset,
}) {
  const [error, setError] = useState("");
  async function handleFile(file) {
    if (!file) return;
    setError("");
    try {
      const prepared = await prepareImageFile(file);
      const previousAssetId = section.data.assetId;
      const assetId = await addImageAsset(prepared);
      update({
        data: { assetId, fileName: prepared.name, mimeType: prepared.type },
      });
      await removeUnusedAsset(previousAssetId);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not read the image.",
      );
    }
  }
  return (
    <div className="space-y-4">
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center border border-dashed border-[#aeb8b3] bg-[#fafbfa] px-4 text-center transition hover:border-accent hover:bg-accent-soft">
        {asset ? (
          <>
            <FileUp size={22} className="mb-2 text-accent" />
            <span className="text-sm font-semibold text-ink">
              Replace {asset.name}
            </span>
          </>
        ) : (
          <>
            <Upload size={22} className="mb-2 text-accent" />
            <span className="text-sm font-semibold text-ink">
              Choose a screenshot or image
            </span>
            <span className="mt-1 text-xs text-muted">
              JPEG, PNG, WebP, or GIF up to 20 MB
            </span>
            <span className="mt-1 text-xs font-medium text-accent">
              You can also copy an image and press Ctrl+V
            </span>
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </label>
      {error && (
        <p className="m-0 text-xs font-medium text-[#a33a2c]">{error}</p>
      )}
      <label className={labelClass}>
        Caption
        <input
          value={section.data.caption || ""}
          onChange={(event) =>
            update({ data: { caption: event.target.value } })
          }
          className={`${inputClass} mt-2 normal-case`}
        />
      </label>
    </div>
  );
}

function OutputEditor({ section, update }) {
  return (
    <label className={labelClass}>
      Output
      <textarea
        value={section.data.body}
        onChange={(event) => update({ data: { body: event.target.value } })}
        placeholder="Paste terminal output, logs, or generated results..."
        rows={8}
        spellCheck={false}
        className={`${inputClass} mt-2 resize-y font-mono normal-case leading-5`}
      />
    </label>
  );
}

function ChartEditor({ section, update }) {
  const [error, setError] = useState("");
  const columns = useMemo(
    () => [section.data.xKey, ...section.data.series.map((item) => item.key)],
    [section.data.xKey, section.data.series],
  );
  function updateRow(index, key, value) {
    const rows = section.data.rows.map((row, rowIndex) =>
      rowIndex === index
        ? { ...row, [key]: key === section.data.xKey ? value : Number(value) }
        : row,
    );
    update({ data: { rows } });
  }
  async function importCsv(file) {
    if (!file) return;
    setError("");
    try {
      const { fields, rows } = parseChartCsv(await file.text());
      update({
        data: {
          xKey: fields[0],
          rows,
          series: fields
            .slice(1)
            .map((key, index) => ({
              key,
              label: key,
              color: DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length],
            })),
        },
      });
    } catch (csvError) {
      setError(
        csvError instanceof Error
          ? csvError.message
          : "Could not import the CSV file.",
      );
    }
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Chart type
          <select
            value={section.data.chartType}
            onChange={(event) =>
              update({ data: { chartType: event.target.value } })
            }
            className={`${inputClass} mt-2 normal-case`}
          >
            {CHART_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Chart title
          <input
            value={section.data.title || ""}
            onChange={(event) =>
              update({ data: { title: event.target.value } })
            }
            className={`${inputClass} mt-2 normal-case`}
          />
        </label>
      </div>
      <div className="overflow-x-auto border border-line">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f4f6f4]">
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-line px-2 py-2 text-left text-xs font-semibold text-muted"
                >
                  {column}
                </th>
              ))}
              <th className="w-9 border-b border-line" />
            </tr>
          </thead>
          <tbody>
            {section.data.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td key={column} className="border-b border-line p-1">
                    <input
                      value={row[column] ?? ""}
                      onChange={(event) =>
                        updateRow(rowIndex, column, event.target.value)
                      }
                      className="w-full border-0 bg-transparent px-2 py-1.5 text-sm outline-none"
                    />
                  </td>
                ))}
                <td className="border-b border-line">
                  <button
                    type="button"
                    title="Remove row"
                    aria-label="Remove row"
                    onClick={() =>
                      update({
                        data: {
                          rows: section.data.rows.filter(
                            (_row, index) => index !== rowIndex,
                          ),
                        },
                      })
                    }
                    className="text-muted hover:text-[#a33a2c]"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            update({
              data: {
                rows: [
                  ...section.data.rows,
                  Object.fromEntries(
                    columns.map((column) => [
                      column,
                      column === section.data.xKey ? "Label" : 0,
                    ]),
                  ),
                ],
              },
            })
          }
          className="inline-flex h-8 items-center gap-2 border border-line bg-white px-3 text-xs font-semibold text-ink"
        >
          <Plus size={14} /> Add row
        </button>
        <label className="inline-flex h-8 cursor-pointer items-center gap-2 border border-line bg-white px-3 text-xs font-semibold text-ink">
          <Upload size={14} /> Import CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => importCsv(event.target.files?.[0])}
          />
        </label>
      </div>
      {error && (
        <p className="m-0 text-xs font-medium text-[#a33a2c]">{error}</p>
      )}
    </div>
  );
}

export default function SectionEditor({
  section,
  update,
  addImageAsset,
  removeUnusedAsset,
  assets,
}) {
  if (section.type === "text")
    return <TextEditor section={section} update={update} />;
  if (section.type === "code")
    return <CodeEditor section={section} update={update} />;
  if (section.type === "image")
    return (
      <ImageEditor
        section={section}
        update={update}
        addImageAsset={addImageAsset}
        removeUnusedAsset={removeUnusedAsset}
        asset={assets[section.data.assetId]}
      />
    );
  if (section.type === "output")
    return <OutputEditor section={section} update={update} />;
  if (section.type === "chart")
    return <ChartEditor section={section} update={update} />;
  return null;
}
