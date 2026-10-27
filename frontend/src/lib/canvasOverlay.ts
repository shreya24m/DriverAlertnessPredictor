/**
 * Canvas drawing utilities for rendering facial landmarks and HUD overlays.
 */

import {
  type NormalizedLandmark,
  LEFT_EYE_CONTOUR,
  RIGHT_EYE_CONTOUR,
  LEFT_EYE_EAR_INDICES,
  RIGHT_EYE_EAR_INDICES,
  LEFT_IRIS_CENTER,
  RIGHT_IRIS_CENTER,
  LIPS_OUTER_CONTOUR,
  LIPS_INNER_CONTOUR,
  FACE_OVAL,
  MESH_TESSELLATION_KEY_PAIRS,
} from "./landmarks";

export type OverlayMode = "full" | "features" | "off";

export interface DrawOverlayOptions {
  landmarks: NormalizedLandmark[];
  hasFace: boolean;
  mode: OverlayMode;
  mirrored?: boolean;
}

/**
 * Draw landmark contours and HUD elements onto the target 2D canvas.
 */
export function drawLandmarkOverlay(
  canvas: HTMLCanvasElement,
  options: DrawOverlayOptions
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { landmarks, hasFace, mode, mirrored = true } = options;
  const width = canvas.width;
  const height = canvas.height;

  // Clear previous frame
  ctx.clearRect(0, 0, width, height);

  if (mode === "off") {
    return;
  }

  // Coordinate converter accounting for mirroring
  const toScreen = (pt: NormalizedLandmark): [number, number] => {
    const x = mirrored ? (1 - pt.x) * width : pt.x * width;
    const y = pt.y * height;
    return [x, y];
  };

  if (!hasFace || landmarks.length === 0) {
    // Render dashed guide box when no face is detected
    drawSearchingGuide(ctx, width, height);
    return;
  }

  // 1. Draw Mesh Tessellation (if in 'full' mode)
  if (mode === "full") {
    ctx.strokeStyle = "rgba(56, 189, 248, 0.22)"; // Cyan subtle
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [i1, i2] of MESH_TESSELLATION_KEY_PAIRS) {
      if (landmarks[i1] && landmarks[i2]) {
        const [x1, y1] = toScreen(landmarks[i1]);
        const [x2, y2] = toScreen(landmarks[i2]);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
    }
    ctx.stroke();

    // Draw subtle Face Oval
    drawContour(ctx, landmarks, FACE_OVAL, "rgba(96, 165, 250, 0.35)", 1.2, toScreen);
  }

  // 2. Draw Eyes (Contours and EAR Keypoints)
  // Left Eye Contour
  drawContour(ctx, landmarks, LEFT_EYE_CONTOUR, "#38bdf8", 1.8, toScreen);
  // Right Eye Contour
  drawContour(ctx, landmarks, RIGHT_EYE_CONTOUR, "#38bdf8", 1.8, toScreen);

  // Key EAR Points on Eyes (glowing emerald dots)
  for (const idx of [...LEFT_EYE_EAR_INDICES, ...RIGHT_EYE_EAR_INDICES]) {
    if (landmarks[idx]) {
      const [x, y] = toScreen(landmarks[idx]);
      drawPoint(ctx, x, y, 2.5, "#34d399", "#059669");
    }
  }

  // 3. Draw Irises
  if (landmarks[LEFT_IRIS_CENTER]) {
    const [lx, ly] = toScreen(landmarks[LEFT_IRIS_CENTER]);
    drawPoint(ctx, lx, ly, 3.5, "#a855f7", "#7c3aed");
  }
  if (landmarks[RIGHT_IRIS_CENTER]) {
    const [rx, ry] = toScreen(landmarks[RIGHT_IRIS_CENTER]);
    drawPoint(ctx, rx, ry, 3.5, "#a855f7", "#7c3aed");
  }

  // 4. Draw Lips / Mouth Contours
  drawContour(ctx, landmarks, LIPS_OUTER_CONTOUR, "rgba(245, 158, 11, 0.75)", 1.6, toScreen);
  drawContour(ctx, landmarks, LIPS_INNER_CONTOUR, "rgba(251, 191, 36, 0.85)", 1.2, toScreen);
}

/**
 * Connect sequential landmark indices with a stroke.
 */
function drawContour(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  indices: readonly number[],
  strokeColor: string,
  lineWidth: number,
  toScreen: (pt: NormalizedLandmark) => [number, number]
): void {
  if (indices.length === 0) return;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();

  let started = false;
  for (const idx of indices) {
    const pt = landmarks[idx];
    if (pt) {
      const [x, y] = toScreen(pt);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  }
  ctx.stroke();
}

/**
 * Draw a single landmark coordinate dot.
 */
function drawPoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fillColor: string,
  strokeColor?: string
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = fillColor;
  ctx.fill();
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * Render HUD searching guide when face is not yet detected.
 */
function drawSearchingGuide(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const boxWidth = Math.min(width * 0.45, 260);
  const boxHeight = Math.min(height * 0.65, 340);
  const cx = width / 2;
  const cy = height / 2;

  ctx.save();
  ctx.strokeStyle = "rgba(234, 179, 8, 0.4)"; // Amber dashed guide
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);

  // Rounded rectangle
  const rx = cx - boxWidth / 2;
  const ry = cy - boxHeight / 2;
  const radius = 24;

  ctx.beginPath();
  ctx.moveTo(rx + radius, ry);
  ctx.lineTo(rx + boxWidth - radius, ry);
  ctx.quadraticCurveTo(rx + boxWidth, ry, rx + boxWidth, ry + radius);
  ctx.lineTo(rx + boxWidth, ry + boxHeight - radius);
  ctx.quadraticCurveTo(rx + boxWidth, ry + boxHeight, rx + boxWidth - radius, ry + boxHeight);
  ctx.lineTo(rx + radius, ry + boxHeight);
  ctx.quadraticCurveTo(rx, ry + boxHeight, rx, ry + boxHeight - radius);
  ctx.lineTo(rx, ry + radius);
  ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
  ctx.stroke();

  // Text label
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(234, 179, 8, 0.8)";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Position face within frame", cx, ry + boxHeight + 24);
  ctx.restore();
}
