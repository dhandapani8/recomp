import type { BodyProfile } from "@/lib/recomp-domain";

type ScanRatios = Pick<
  BodyProfile,
  "shoulderScale" | "torsoScale" | "waistScale" | "hipScale" | "thighScale" | "depthScale" | "confidence"
>;

type Silhouette = {
  width: number;
  height: number;
  data: Float32Array;
};

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_PATH = "/mediapipe/selfie_segmenter.tflite";

let segmenterPromise: Promise<import("@mediapipe/tasks-vision").ImageSegmenter> | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = import("@mediapipe/tasks-vision").then(async ({ FilesetResolver, ImageSegmenter }) => {
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          delegate: "CPU",
          modelAssetPath: new URL(MODEL_PATH, window.location.origin).href,
        },
        outputCategoryMask: false,
        outputConfidenceMasks: true,
        runningMode: "IMAGE",
      });
    });
  }
  return segmenterPromise;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected photo could not be read."));
    image.src = source;
  });
}

async function silhouetteFor(source: string): Promise<Silhouette> {
  const image = await loadImage(source);
  const segmenter = await getSegmenter();
  const result = segmenter.segment(image);
  const mask = result.confidenceMasks?.[0];
  if (!mask) throw new Error("No person silhouette was found.");

  const data = new Float32Array(mask.getAsFloat32Array());
  const silhouette = { data, height: mask.height, width: mask.width };
  mask.close();
  return silhouette;
}

function boundsFor(silhouette: Silhouette) {
  const { data, width, height } = silhouette;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let pixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[y * width + x] < 0.55) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      pixels += 1;
    }
  }

  if (pixels < width * height * 0.04 || maxY <= minY) {
    throw new Error("Use a full-body photo with one person clearly visible.");
  }

  return { minX, minY, maxX, maxY, pixels };
}

function rowWidth(silhouette: Silhouette, bounds: ReturnType<typeof boundsFor>, position: number) {
  const y = Math.round(bounds.minY + (bounds.maxY - bounds.minY) * position);
  const widths: number[] = [];

  for (let offset = -2; offset <= 2; offset += 1) {
    const row = clamp(y + offset, 0, silhouette.height - 1);
    let left = silhouette.width;
    let right = 0;
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (silhouette.data[row * silhouette.width + x] < 0.55) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
    if (right > left) widths.push(right - left + 1);
  }

  widths.sort((a, b) => a - b);
  return widths[Math.floor(widths.length / 2)] ?? 0;
}

function deriveFrontRatios(silhouette: Silhouette) {
  const bounds = boundsFor(silhouette);
  const bodyHeight = bounds.maxY - bounds.minY + 1;
  const shoulder = rowWidth(silhouette, bounds, 0.24);
  const torso = rowWidth(silhouette, bounds, 0.34);
  const waist = rowWidth(silhouette, bounds, 0.46);
  const hips = rowWidth(silhouette, bounds, 0.55);
  const thighs = rowWidth(silhouette, bounds, 0.67);
  const fill = bounds.pixels / ((bounds.maxX - bounds.minX + 1) * bodyHeight);

  return {
    shoulderScale: clamp(shoulder / (bodyHeight * 0.27), 0.78, 1.28),
    torsoScale: clamp(torso / (bodyHeight * 0.24), 0.78, 1.28),
    waistScale: clamp(waist / (bodyHeight * 0.2), 0.76, 1.34),
    hipScale: clamp(hips / (bodyHeight * 0.24), 0.8, 1.3),
    thighScale: clamp(thighs / (bodyHeight * 0.25), 0.8, 1.3),
    confidence: fill > 0.48 ? "High" as const : fill > 0.33 ? "Medium" as const : "Low" as const,
  };
}

function deriveDepthScale(silhouette: Silhouette) {
  const bounds = boundsFor(silhouette);
  const bodyHeight = bounds.maxY - bounds.minY + 1;
  const chestDepth = rowWidth(silhouette, bounds, 0.34);
  const waistDepth = rowWidth(silhouette, bounds, 0.46);
  return clamp(((chestDepth + waistDepth) / 2) / (bodyHeight * 0.16), 0.78, 1.34);
}

export async function analyzeBodyPhotos(frontPhoto: string, sidePhoto?: string): Promise<ScanRatios> {
  const front = deriveFrontRatios(await silhouetteFor(frontPhoto));
  const depthScale = sidePhoto ? deriveDepthScale(await silhouetteFor(sidePhoto)) : 1;
  return { ...front, depthScale };
}

export async function prepareBodyPhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Choose a photo smaller than 15 MB.");

  const source = URL.createObjectURL(file);
  try {
    const image = await loadImage(source);
    const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is unavailable in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.74);
  } finally {
    URL.revokeObjectURL(source);
  }
}
