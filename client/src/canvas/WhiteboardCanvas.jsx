import { useEffect, useMemo, useRef } from "react";
import throttle from "lodash.throttle";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

function getSceneSignature(elements) {
  return JSON.stringify(
    elements.map((item) => [item.id, item.version, item.versionNonce, item.isDeleted ? 1 : 0])
  );
}

function normalizeSceneElements(elements) {
  if (!Array.isArray(elements)) {
    return [];
  }

  // Skip legacy custom-shape data and keep only Excalidraw-like scene elements.
  return elements.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.type === "string" &&
      typeof item.version === "number" &&
      typeof item.versionNonce === "number"
  );
}

export function WhiteboardCanvas({
  elements,
  roomId,
  socket,
  setElements,
}) {
  const excalidrawApiRef = useRef(null);
  const lastLocalSignatureRef = useRef("");
  const appliedRemoteSignatureRef = useRef("");

  const emitCursor = useMemo(
    () =>
      throttle((x, y) => {
        if (!socket) {
          return;
        }

        socket.emit("CURSOR_MOVE", {
          roomId,
          cursor: { x, y },
        });
      }, 60),
    [roomId, socket]
  );

  const emitSceneChange = useMemo(
    () =>
      throttle((nextElements) => {
        if (!socket || !roomId) {
          return;
        }

        socket.emit("SCENE_CHANGE", { roomId, elements: nextElements });
      }, 120),
    [roomId, socket]
  );

  useEffect(() => {
    return () => {
      emitCursor.cancel();
      emitSceneChange.cancel();
    };
  }, [emitCursor, emitSceneChange]);

  useEffect(() => {
    const api = excalidrawApiRef.current;
    if (!api) {
      return;
    }

    const normalized = normalizeSceneElements(elements);
    const incomingSignature = getSceneSignature(normalized);

    if (incomingSignature === lastLocalSignatureRef.current) {
      return;
    }

    appliedRemoteSignatureRef.current = incomingSignature;
    api.updateScene({ elements: normalized });
  }, [elements]);

  function handleChange(nextElements) {
    const normalized = normalizeSceneElements(nextElements);
    const signature = getSceneSignature(normalized);

    if (signature === appliedRemoteSignatureRef.current) {
      return;
    }

    if (signature === lastLocalSignatureRef.current) {
      return;
    }

    lastLocalSignatureRef.current = signature;
    setElements(normalized, { record: false });
    emitSceneChange(normalized);
  }

  function handlePointerUpdate(pointerPayload) {
    const pointer = pointerPayload?.pointer || pointerPayload;

    if (!pointer || typeof pointer.x !== "number" || typeof pointer.y !== "number") {
      return;
    }

    emitCursor(pointer.x, pointer.y);
  }

  return (
    <div className="relative h-[calc(100vh-180px)] w-full overflow-hidden rounded-2xl border border-zinc-700/30 bg-white">
      <Excalidraw
        excalidrawAPI={(api) => {
          excalidrawApiRef.current = api;
        }}
        initialData={{ elements: normalizeSceneElements(elements) }}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
      />
    </div>
  );
}
