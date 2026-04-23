export function Toolbar({
  onClear,
  onSave,
}) {
  return (
    <div className="toolbar-panel flex w-full flex-wrap items-center gap-2 rounded-2xl border border-zinc-700/30 bg-zinc-950/80 p-3 text-zinc-100 shadow-xl backdrop-blur">
      <p className="text-sm text-zinc-300">Use the Excalidraw toolbar inside the canvas for tools, colors, and undo/redo.</p>

      <div className="ml-auto flex items-center gap-2">
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
