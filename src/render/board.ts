/**
 * Canvas renderer — flat candy-bolt / hardware geometric art (original).
 */
import {
  BOARD_H,
  BOARD_W,
  COLOR_HEX,
  SCREW_RADIUS,
  type ScrewColor,
} from '../game/types';
import type { GameState } from '../game/types';
import { isFree } from '../game/engine';

export interface BoardLayout {
  scale: number;
  offsetX: number;
  offsetY: number;
  canvasW: number;
  canvasH: number;
  dockY: number;
}

const DOCK_H = 72;

export function computeLayout(cssW: number, cssH: number): BoardLayout {
  const usableH = Math.max(200, cssH - DOCK_H - 8);
  const scale = Math.min(cssW / BOARD_W, usableH / BOARD_H);
  const boardDrawW = BOARD_W * scale;
  const boardDrawH = BOARD_H * scale;
  return {
    scale,
    offsetX: (cssW - boardDrawW) / 2,
    offsetY: 4,
    canvasW: cssW,
    canvasH: cssH,
    dockY: boardDrawH + 12,
  };
}

export function screenToBoard(
  layout: BoardLayout,
  sx: number,
  sy: number,
): { x: number; y: number } {
  return {
    x: (sx - layout.offsetX) / layout.scale,
    y: (sy - layout.offsetY) / layout.scale,
  };
}

function drawBolt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: ScrewColor,
  opts: { free: boolean; hint: boolean; dim: boolean },
): void {
  const hex = COLOR_HEX[color];
  ctx.save();
  ctx.translate(x, y);

  if (opts.hint) {
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff8a0';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Shadow
  ctx.beginPath();
  ctx.arc(2, 3, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();

  // Outer ring (washer)
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
  grad.addColorStop(0, lighten(hex, 0.25));
  grad.addColorStop(0.55, hex);
  grad.addColorStop(1, darken(hex, 0.25));
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = darken(hex, 0.35);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hex head
  const hr = r * 0.55;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = Math.cos(a) * hr;
    const py = Math.sin(a) * hr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = lighten(hex, 0.12);
  ctx.fill();
  ctx.strokeStyle = darken(hex, 0.4);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center hole
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = darken(hex, 0.45);
  ctx.fill();

  if (opts.dim || !opts.free) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,28,40,0.38)';
    ctx.fill();
  }

  ctx.restore();
}

function lighten(hex: string, amt: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgb(${clamp(r + 255 * amt)},${clamp(g + 255 * amt)},${clamp(b + 255 * amt)})`;
}
function darken(hex: string, amt: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgb(${clamp(r * (1 - amt))},${clamp(g * (1 - amt))},${clamp(b * (1 - amt))})`;
}
function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  layout: BoardLayout,
  hintId: string | null,
): void {
  const { scale, offsetX, offsetY, canvasW, canvasH, dockY } = layout;
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Board panel
  const bw = BOARD_W * scale;
  const bh = BOARD_H * scale;
  roundRect(ctx, offsetX, offsetY, bw, bh, 16);
  ctx.fillStyle = '#243044';
  ctx.fill();
  ctx.strokeStyle = '#3a4d66';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Soft grid dots
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let gx = 30; gx < BOARD_W; gx += 40) {
    for (let gy = 30; gy < BOARD_H; gy += 40) {
      ctx.beginPath();
      ctx.arc(offsetX + gx * scale, offsetY + gy * scale, 1.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Screws by z ascending (paint low first)
  const ordered = [...state.screws].sort((a, b) => a.z - b.z);
  for (const s of ordered) {
    const free = isFree(state, s.id);
    drawBolt(
      ctx,
      offsetX + s.x * scale,
      offsetY + s.y * scale,
      SCREW_RADIUS * scale,
      s.color,
      { free, hint: hintId === s.id, dim: !free },
    );
  }

  // Dock
  const dockTop = dockY;
  const slotW = Math.min(56, (canvasW - 24) / state.dockSize);
  const dockW = slotW * state.dockSize + 8;
  const dockX = (canvasW - dockW) / 2;
  roundRect(ctx, dockX, dockTop, dockW, DOCK_H - 8, 12);
  ctx.fillStyle = '#1a2433';
  ctx.fill();
  ctx.strokeStyle = state.status === 'failed' ? '#e85d5d' : '#3a4d66';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#8a9bb0';
  ctx.font = `${Math.max(11, 12 * scale)}px system-ui,sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(
    `Dock ${state.dock.length}/${state.dockSize} · match ${state.matchSize}`,
    canvasW / 2,
    dockTop - 4,
  );

  for (let i = 0; i < state.dockSize; i++) {
    const cx = dockX + 4 + slotW * i + slotW / 2;
    const cy = dockTop + (DOCK_H - 8) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, slotW * 0.32, 0, Math.PI * 2);
    ctx.strokeStyle = '#3a4d66';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const item = state.dock[i];
    if (item) {
      drawBolt(ctx, cx, cy, slotW * 0.3, item.color, {
        free: true,
        hint: false,
        dim: false,
      });
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
