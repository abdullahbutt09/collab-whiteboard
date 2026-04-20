const TOOLS = [
  { key: "pencil", label: "Pencil" },
  { key: "rectangle", label: "Rectangle" },
  { key: "line", label: "Line" },
  { key: "eraser", label: "Eraser" },
  { key: "select", label: "Move" },
];

export function Toolbar({
  selectedTool,
  setSelectedTool,
  color,
  setColor,
  onUndo,
  onRedo,
  onClear,
  onSave,
}) {
  return (
    <div className="toolbar-panel flex w-full flex-wrap items-center gap-2 rounded-2xl border border-zinc-700/30 bg-zinc-950/80 p-3 text-zinc-100 shadow-xl backdrop-blur">
      {TOOLS.map((tool) => (
        <button
          key={tool.key}
          type="button"
          onClick={() => setSelectedTool(tool.key)}
          className={`rounded-lg px-3 py-2 text-sm transition ${
            selectedTool === tool.key ? "bg-emerald-400 text-zinc-950" : "bg-zinc-800 hover:bg-zinc-700"
          }`}
        >
          {tool.label}
        </button>
      ))}

      <div className="ml-auto flex items-center gap-2">
        <input
          aria-label="Pick drawing color"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="h-10 w-10 cursor-pointer rounded border border-zinc-600 bg-transparent p-1"
        />
        <button type="button" onClick={onUndo} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700">
          Undo
        </button>
        <button type="button" onClick={onRedo} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700">
          Redo
        </button>
        <button type="button" onClick={onClear} className="rounded-lg bg-rose-500 px-3 py-2 text-sm text-white hover:bg-rose-400">
          Clear
        </button>
        <button type="button" onClick={onSave} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm text-zinc-900 hover:bg-emerald-400">
          Save
        </button>
      </div>
    </div>
  );
}
