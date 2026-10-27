/**
 * MediaPipe Face Mesh landmark indices, connectors, and typed interfaces.
 */

export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface DetectionResult {
  landmarks: NormalizedLandmark[];
  hasFace: boolean;
  timestamp: number;
}

// Canonical 6 points per eye for Eye Aspect Ratio (EAR)
export const LEFT_EYE_EAR_INDICES = [33, 160, 158, 133, 153, 144] as const;
export const RIGHT_EYE_EAR_INDICES = [362, 385, 387, 263, 373, 380] as const;

// Full eye boundary contours for visual overlay
export const LEFT_EYE_CONTOUR = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33
];

export const RIGHT_EYE_CONTOUR = [
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362
];

// Irises
export const LEFT_IRIS = [468, 469, 470, 471, 472];
export const RIGHT_IRIS = [473, 474, 475, 476, 477];
export const LEFT_IRIS_CENTER = 468;
export const RIGHT_IRIS_CENTER = 473;

// Lips / Mouth contours
export const LIPS_OUTER_CONTOUR = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61
];

export const LIPS_INNER_CONTOUR = [
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78
];

// Eyebrows
export const LEFT_EYEBROW = [70, 63, 105, 66, 107];
export const RIGHT_EYEBROW = [336, 296, 334, 293, 300];

// Face oval contour
export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10
];

// Subsampled key mesh tessellation lines for efficient rendering overlay
export const MESH_TESSELLATION_KEY_PAIRS: [number, number][] = [
  // Nose bridge and center line
  [10, 151], [151, 9], [9, 8], [8, 168], [168, 6], [6, 197], [197, 195], [195, 5], [5, 4], [4, 1], [1, 19], [19, 94], [94, 2],
  // Cheeks and forehead structure
  [127, 34], [34, 139], [139, 127],
  [356, 264], [264, 368], [368, 356],
  [10, 67], [10, 297], [67, 109], [297, 338],
  [152, 148], [152, 377], [148, 176], [377, 400]
];
