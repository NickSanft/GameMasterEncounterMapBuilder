/**
 * Phase 158 — render persistent travel-route polylines.
 *
 * Each route renders as a thick colored line connecting its
 * world-space points, with a circular pip at every waypoint and a
 * total-distance label at the last point. GM-only routes are
 * skipped on the Spectator canvas (mirrors `DrawStroke.visibility`
 * semantics).
 */

import type { TravelRoute, ViewMode } from '../state/types.js';
import {
  formatRouteDistance,
  routeTotalWorldPx,
} from '../state/travel-routes.js';
import type { DistanceUnit } from '../state/distance.js';

export interface TravelLayerOptions {
  mode: ViewMode;
  cellSize: number;
  feetPerSquare: number;
  distanceUnit: DistanceUnit;
  /**
   * Optional in-progress route preview. When a non-null value is
   * supplied, it renders alongside committed routes at lower
   * opacity so the GM can see the polyline grow as they click
   * points.
   */
  preview?: TravelRoute | null;
}

const ROUTE_LINE_WIDTH_PX = 3;
const WAYPOINT_RADIUS_PX = 5;
const LABEL_FONT_PX = 13;

export function drawTravelRoutes(
  ctx: CanvasRenderingContext2D,
  routes: readonly TravelRoute[],
  options: TravelLayerOptions,
): void {
  for (const r of routes) {
    if (options.mode === 'spectator' && r.visibility === 'gm') continue;
    drawSingleRoute(ctx, r, options, /* preview */ false);
  }
  if (options.preview && options.preview.points.length >= 1) {
    drawSingleRoute(ctx, options.preview, options, /* preview */ true);
  }
}

function drawSingleRoute(
  ctx: CanvasRenderingContext2D,
  route: TravelRoute,
  options: TravelLayerOptions,
  isPreview: boolean,
): void {
  const pts = route.points;
  if (pts.length === 0) return;

  ctx.save();
  ctx.globalAlpha = isPreview ? 0.7 : 0.95;
  ctx.strokeStyle = route.color;
  ctx.fillStyle = route.color;
  ctx.lineWidth = ROUTE_LINE_WIDTH_PX;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (isPreview) {
    ctx.setLineDash([8, 6]);
  }

  // GM-only halo so the GM sees at a glance which routes are hidden
  // from players (mirrors `DrawStroke.visibility` GM dashes).
  if (options.mode === 'gm' && route.visibility === 'gm' && !isPreview) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = ROUTE_LINE_WIDTH_PX + 3;
    drawPolylinePath(ctx, pts);
    ctx.restore();
  }

  // Polyline body.
  drawPolylinePath(ctx, pts);
  ctx.setLineDash([]);

  // Waypoint pips — small filled circles at every point so the
  // route's joints are visually clear.
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, WAYPOINT_RADIUS_PX, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.strokeStyle = route.color;
    ctx.lineWidth = ROUTE_LINE_WIDTH_PX;
  }

  // Total-distance label at the last point.
  if (pts.length >= 2 && options.cellSize > 0) {
    const total = routeTotalWorldPx(route);
    const text = formatRouteDistance(
      total,
      options.cellSize,
      options.feetPerSquare,
      options.distanceUnit,
    );
    if (text) {
      const last = pts[pts.length - 1]!;
      ctx.font = `600 ${LABEL_FONT_PX}px system-ui, sans-serif`;
      const metrics = ctx.measureText(text);
      const padX = 6;
      const padY = 3;
      const w = metrics.width + padX * 2;
      const h = LABEL_FONT_PX + padY * 2;
      const tx = last.x + WAYPOINT_RADIUS_PX + 4;
      const ty = last.y - h / 2;
      ctx.fillStyle = 'rgba(20, 20, 20, 0.85)';
      ctx.fillRect(tx, ty, w, h);
      ctx.strokeStyle = route.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tx, ty, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, tx + padX, ty + h / 2);
    }
  }

  ctx.restore();
}

function drawPolylinePath(
  ctx: CanvasRenderingContext2D,
  points: readonly { x: number; y: number }[],
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}
