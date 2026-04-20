function normalizeRect(x, y, width, height) {
  const left = width < 0 ? x + width : x;
  const top = height < 0 ? y + height : y;
  const right = width < 0 ? x : x + width;
  const bottom = height < 0 ? y : y + height;

  return { left, top, right, bottom };
}

function pointToSegmentDistance(point, start, end) {
  const l2 = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;

  if (l2 === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / l2
    )
  );

  const projection = {
    x: start.x + t * (end.x - start.x),
    y: start.y + t * (end.y - start.y),
  };

  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

export function drawElement(ctx, element) {
  ctx.strokeStyle = element.color;
  ctx.lineWidth = element.strokeWidth || 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (element.type === "rectangle") {
    ctx.strokeRect(element.x, element.y, element.width, element.height);
    return;
  }

  if (element.type === "line") {
    ctx.beginPath();
    ctx.moveTo(element.x, element.y);
    ctx.lineTo(element.x + element.width, element.y + element.height);
    ctx.stroke();
    return;
  }

  if (element.type === "pencil") {
    if (!element.points || element.points.length < 2) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(element.points[0].x, element.points[0].y);

    for (let i = 1; i < element.points.length; i += 1) {
      ctx.lineTo(element.points[i].x, element.points[i].y);
    }

    ctx.stroke();
  }
}

export function getElementAtPosition(elements, x, y) {
  const tolerance = 8;

  for (let i = elements.length - 1; i >= 0; i -= 1) {
    const element = elements[i];

    if (element.type === "rectangle") {
      const rect = normalizeRect(element.x, element.y, element.width, element.height);
      const inside =
        x >= rect.left - tolerance &&
        x <= rect.right + tolerance &&
        y >= rect.top - tolerance &&
        y <= rect.bottom + tolerance;

      if (inside) {
        return element;
      }
    }

    if (element.type === "line") {
      const start = { x: element.x, y: element.y };
      const end = { x: element.x + element.width, y: element.y + element.height };
      if (pointToSegmentDistance({ x, y }, start, end) <= tolerance) {
        return element;
      }
    }

    if (element.type === "pencil" && element.points.length > 1) {
      for (let pointIndex = 0; pointIndex < element.points.length - 1; pointIndex += 1) {
        const start = element.points[pointIndex];
        const end = element.points[pointIndex + 1];

        if (pointToSegmentDistance({ x, y }, start, end) <= tolerance) {
          return element;
        }
      }
    }
  }

  return null;
}

export function translateElement(element, dx, dy) {
  if (element.type === "pencil") {
    return {
      ...element,
      x: element.x + dx,
      y: element.y + dy,
      points: element.points.map((point) => ({
        x: point.x + dx,
        y: point.y + dy,
      })),
    };
  }

  return {
    ...element,
    x: element.x + dx,
    y: element.y + dy,
  };
}
