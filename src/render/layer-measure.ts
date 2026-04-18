export interface MeasurementOverlay {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function drawMeasurement(
  ctx: CanvasRenderingContext2D,
  overlay: MeasurementOverlay,
  cellSize: number,
): void {
  const dx = overlay.endX - overlay.startX;
  const dy = overlay.endY - overlay.startY;
  const gridDx = Math.abs(dx) / cellSize;
  const gridDy = Math.abs(dy) / cellSize;
  const chebyshev = Math.max(gridDx, gridDy);
  const euclidean = Math.sqrt(gridDx * gridDx + gridDy * gridDy);

  ctx.save();

  // Line
  ctx.strokeStyle = '#ffd966';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(overlay.startX, overlay.startY);
  ctx.lineTo(overlay.endX, overlay.endY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Endpoint dots
  ctx.fillStyle = '#ffd966';
  ctx.beginPath();
  ctx.arc(overlay.startX, overlay.startY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(overlay.endX, overlay.endY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Label near end
  const sq = chebyshev.toFixed(1);
  const ft = (chebyshev * 5).toFixed(0);
  const eu = euclidean.toFixed(1);
  const text = `${sq} sq · ${ft} ft · ${eu} sq diag`;
  const fontSize = 13;
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const metrics = ctx.measureText(text);
  const padX = 8;
  const padY = 4;
  const labelW = metrics.width + padX * 2;
  const labelH = fontSize + padY * 2;
  // Offset the label away from the line's end
  const offsetX = dx >= 0 ? 14 : -labelW - 14;
  const labelX = overlay.endX + offsetX;
  const labelY = overlay.endY - labelH / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(labelX, labelY, labelW, labelH);
  ctx.fillStyle = '#ffd966';
  ctx.fillText(text, labelX + padX, labelY + labelH / 2);

  ctx.restore();
}
