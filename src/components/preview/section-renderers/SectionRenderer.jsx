import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Highlight, themes } from "prism-react-renderer";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = [
  "#146b54",
  "#c2693d",
  "#4a6e8a",
  "#b9943f",
  "#7a6496",
  "#65877a",
];

function SectionHeading({ title, continuation }) {
  if (!title) return null;
  return (
    <div className="mb-3 flex items-center gap-2">
      <h3 className="m-0 text-[17px] font-semibold text-ink">{title}</h3>
      {continuation && (
        <span className="text-[10px] font-medium uppercase text-muted">
          continued
        </span>
      )}
    </div>
  );
}

function TextRenderer({ section }) {
  const alignment =
    section.style?.align === "center"
      ? "text-center"
      : section.style?.align === "right"
        ? "text-right"
        : "";
  return (
    <div
      className={`document-prose text-[14px] leading-7 text-ink ${alignment}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {section.data.body || ""}
      </ReactMarkdown>
    </div>
  );
}

function CodeRenderer({ section }) {
  const language = section.data.language || "plaintext";
  return (
    <div className="space-y-3">
      <div className="overflow-hidden border border-[#d9e0dc] bg-[#f5f7f6]">
        <div className="flex items-center justify-between border-b border-[#d9e0dc] px-3 py-2 text-[10px] font-semibold uppercase text-muted">
          <span>
            {language}
            {section.continuation ? " · continued" : ""}
          </span>
          {section.data.filename && (
            <span className="normal-case">{section.data.filename}</span>
          )}
        </div>
        <Highlight
          theme={themes.github}
          code={section.data.code || ""}
          language={language}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`${className} m-0 overflow-x-auto p-4 text-[12px] leading-5`}
              style={{ ...style, background: "#f5f7f6" }}
            >
              {tokens.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  {...getLineProps({ line })}
                  className="table-row"
                >
                  {section.data.showLineNumbers && (
                    <span className="table-cell select-none pr-4 text-right text-[#99a49e]">
                      {(section.data.lineStart || 1) + lineIndex}
                    </span>
                  )}
                  <span className="table-cell">
                    {line.map((token, tokenIndex) => (
                      <span key={tokenIndex} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
      {section.data.output && (
        <div className="border-l-2 border-accent bg-accent-soft px-4 py-3">
          <div className="mb-1 text-[10px] font-bold uppercase text-accent">
            Output
          </div>
          <pre className="m-0 whitespace-pre-wrap font-mono text-[12px] leading-5 text-ink">
            {section.data.output}
          </pre>
        </div>
      )}
    </div>
  );
}

function ImageRenderer({ section, assets }) {
  const asset = section.data.assetId ? assets[section.data.assetId] : null;
  if (!asset?.url)
    return (
      <div className="flex h-32 items-center justify-center border border-dashed border-line bg-[#fafbfa] text-sm text-muted">
        Select an image to display it here.
      </div>
    );
  return (
    <figure className="m-0">
      <img
        className="mx-auto h-auto w-auto max-w-full object-contain"
        style={{ maxHeight: `${section.layoutMaxHeight || 430}px` }}
        src={asset.url}
        alt={section.title || asset.name}
      />
      {section.data.caption && (
        <figcaption className="mt-2 text-center text-xs text-muted">
          {section.data.caption}
        </figcaption>
      )}
    </figure>
  );
}

function ChartRenderer({ section }) {
  const { data } = section;
  const rows = useMemo(
    () =>
      (data.rows || []).map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            key === data.xKey ? value : Number(value) || 0,
          ]),
        ),
      ),
    [data],
  );
  const series = data.series?.length
    ? data.series
    : [{ key: "value", label: "Value", color: "#146b54" }];
  const common = {
    data: rows,
    margin: { top: 12, right: 16, bottom: 8, left: 0 },
  };
  const axes = (
    <>
      <CartesianGrid stroke="#e5e9e6" vertical={false} />
      <XAxis
        dataKey={data.xKey || "label"}
        tick={{ fontSize: 11, fill: "#65706b" }}
      />
      <YAxis tick={{ fontSize: 11, fill: "#65706b" }} width={35} />
      <Tooltip />
      <Legend />
    </>
  );
  let chart;
  if (data.chartType === "line")
    chart = (
      <LineChart {...common}>
        {axes}
        {series.map((item) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={item.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    );
  else if (data.chartType === "area")
    chart = (
      <AreaChart {...common}>
        {axes}
        {series.map((item) => (
          <Area
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={item.color}
            fill={item.color}
            fillOpacity={0.18}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    );
  else if (data.chartType === "pie")
    chart = (
      <PieChart>
        <Tooltip />
        <Legend />
        <Pie
          data={rows}
          dataKey={series[0].key}
          nameKey={data.xKey || "label"}
          cx="50%"
          cy="50%"
          outerRadius={110}
          isAnimationActive={false}
          label
        >
          {rows.map((_row, index) => (
            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    );
  else
    chart = (
      <BarChart {...common}>
        {axes}
        {series.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.label}
            fill={item.color}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    );
  const chartHeight = section.layoutMaxHeight || 330;
  return (
    <div className="w-full" style={{ height: chartHeight }}>
      {data.title && (
        <div className="mb-2 text-center text-sm font-semibold text-ink">
          {data.title}
        </div>
      )}
      <ResponsiveContainer width="100%" height="92%">
        {chart}
      </ResponsiveContainer>
    </div>
  );
}

export default function SectionRenderer({ section, assets }) {
  return (
    <section
      className="break-inside-avoid border-b border-[#edf0ee] pb-6 last:border-b-0 last:pb-0"
      data-section-renderer={section.id}
    >
      <SectionHeading
        title={section.title}
        continuation={section.continuation}
      />
      {section.type === "text" && <TextRenderer section={section} />}
      {section.type === "code" && <CodeRenderer section={section} />}
      {section.type === "image" && (
        <ImageRenderer section={section} assets={assets} />
      )}
      {section.type === "output" && (
        <pre className="m-0 whitespace-pre-wrap border border-line bg-[#f7f8f7] p-4 font-mono text-[12px] leading-5 text-ink">
          {section.data.body || ""}
        </pre>
      )}
      {section.type === "chart" && <ChartRenderer section={section} />}
    </section>
  );
}
