function colorFromId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 90%, 55%)`;
}

export function CursorLayer({ cursors }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Object.entries(cursors).map(([socketId, cursor]) => (
        <div
          key={socketId}
          className="absolute"
          style={{ left: cursor.x, top: cursor.y, transform: "translate(-2px, -2px)" }}
        >
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colorFromId(socketId) }} />
          <div
            className="mt-1 rounded px-1 py-0.5 text-[10px] text-white"
            style={{ backgroundColor: colorFromId(socketId) }}
          >
            {socketId.slice(0, 6)}
          </div>
        </div>
      ))}
    </div>
  );
}
