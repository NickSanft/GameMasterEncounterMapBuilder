import { gridDistance, type DiagonalRule, type DistanceUnit } from '../state/distance.js';
import { formatRulerLabel } from '../state/ruler.js';

export interface MeasurementOverlay {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface MeasurementRenderOptions {
  diagonalRule: DiagonalRule;
  distanceUnit: DistanceUnit;
  feetPerSquare: number;
  /** Active ruler-preset target in feet, or null for freeform. */
  targetFeet: number | null;
}

const DEFAULT_OPTS: MeasurementRenderOptions = {
  diagonalRule: 'chebyshev',
  distanceUnit: 'squares',
  feetPerSquare: 5,
  targetFeet: null,
};

export function drawMeasurement(
  ctx: CanvasRenderingContext2D,
  overlay: MeasurementOverlay,
  cellSize: number,
  options: MeasurementRenderOptions = DEFAULT_OPTS,
): void {
  const dx = overlay.endX - overlay.startX;
  const dy = overlay.endY - overlay.startY;
  const gridDx = dx / cellSize;
  const gridDy = dy / cellSize;
  const cells = gridDistance(gridDx, gridDy, options.diagonalRule);
  const euclidean = Math.hypot(gridDx, gridDy);

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

  // Preset ring — when a clamp target is active, draw a faint circle at
  // that radius so the GM can see *where* valid endpoints lie.
  if (options.targetFeet !== null) {
    const fps =
      Number.isFinite(options.feetPerSquare) && options.feetPerSquare > 0
        ? options.feetPerSquare
        : 5;
    const radius = (options.targetFeet / fps) * cellSize;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 217, 102, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(overlay.startX, overlay.startY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Label near end.
  const baseLabel = formatRulerLabel(
    cells,
    options.distanceUnit,
    options.feetPerSquare,
    options.targetFeet,
  );
  const euLabel = `${euclidean.toFixed(1)} sq diag`;
  const text = `${baseLabel} · ${euLabel}`;

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
