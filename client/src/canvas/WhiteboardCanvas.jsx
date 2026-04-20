import { useEffect, useMemo, useRef, useState } from "react";
import throttle from "lodash.throttle";
import { createElement, updateDraftElement } from "../utils/elementFactory";
import { drawElement, getElementAtPosition, translateElement } from "../utils/geometry";

export function WhiteboardCanvas({
  elements,
  roomId,
  selectedTool,
  color,
  strokeWidth,
  userId,
  socket,
  addOrUpdateElement,
  setElements,
  deleteElement,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const [draftElement, setDraftElement] = useState(null);
  const [movingElementId, setMovingElementId] = useState(null);
  const [lastPointer, setLastPointer] = useState(null);

  const throttledCursor = useMemo(
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * ratio;
    canvas.height = container.clientHeight * ratio;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, container.clientWidth, container.clientHeight);

    elements.forEach((element) => drawElement(ctx, element));

    if (draftElement) {
      drawElement(ctx, draftElement);
    }
  }, [draftElement, elements]);

  useEffect(() => {
    return () => {
      throttledCursor.cancel();
    };
  }, [throttledCursor]);

  function getCoordinates(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handlePointerDown(event) {
    const { x, y } = getCoordinates(event);

    if (selectedTool === "eraser") {
      const found = getElementAtPosition(elements, x, y);
      if (!found) {
        return;
      }

      deleteElement(found.id);
      socket?.emit("DELETE_ELEMENT", { roomId, elementId: found.id });
      return;
    }

    if (selectedTool === "select") {
      const found = getElementAtPosition(elements, x, y);
      if (!found) {
        return;
      }

      setMovingElementId(found.id);
      setLastPointer({ x, y });
      return;
    }

    const nextDraft = createElement({
      tool: selectedTool,
      startX: x,
      startY: y,
      x,
      y,
      color,
      strokeWidth,
      userId,
    });

    setDraftElement(nextDraft);
  }

  function handlePointerMove(event) {
    const { x, y } = getCoordinates(event);
    throttledCursor(x, y);

    if (movingElementId && lastPointer) {
      const dx = x - lastPointer.x;
      const dy = y - lastPointer.y;

      const nextElements = elements.map((element) =>
        element.id === movingElementId ? translateElement(element, dx, dy) : element
      );

      setElements(nextElements, { record: false });
      setLastPointer({ x, y });
      return;
    }

    if (!draftElement) {
      return;
    }

    setDraftElement((current) => updateDraftElement(current, x, y));
  }

  function handlePointerUp() {
    if (movingElementId) {
      const movedElement = elements.find((element) => element.id === movingElementId);
      if (movedElement) {
        setElements(elements, { record: true });
        socket?.emit("UPDATE_ELEMENT", { roomId, element: movedElement });
      }

      setMovingElementId(null);
      setLastPointer(null);
      return;
    }

    if (!draftElement) {
      return;
    }

    addOrUpdateElement(draftElement);
    socket?.emit("DRAW", { roomId, element: draftElement });
    setDraftElement(null);
  }

  return (
    <div ref={containerRef} className="relative h-[calc(100vh-180px)] w-full overflow-hidden rounded-2xl border border-zinc-700/30 bg-white">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
}
