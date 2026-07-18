export type FoodRecognition = {
  label: string;
  confidence: number;
};

type Classification = {
  label: string;
  score: number;
};

let classifierPromise:
  | Promise<(input: string, options?: { top_k?: number }) => Promise<Classification[]>>
  | null = null;

export async function recognizeFoodPhoto(
  imageDataUrl: string,
  onProgress?: (progress: number) => void,
): Promise<FoodRecognition[]> {
  if (!classifierPromise) {
    classifierPromise = import("@huggingface/transformers").then(async ({ pipeline }) => {
      const device = "gpu" in navigator ? "webgpu" : "wasm";
      const classifier = await pipeline(
        "image-classification",
        "onnx-community/swin-finetuned-food101-ONNX",
        {
          device,
          dtype: "q4",
          progress_callback: (event) => {
            if ("progress" in event && typeof event.progress === "number") {
              onProgress?.(Math.round(event.progress));
            }
          },
        },
      );

      return classifier as unknown as (
        input: string,
        options?: { top_k?: number },
      ) => Promise<Classification[]>;
    });
  }

  const classifier = await classifierPromise;
  const results = await classifier(imageDataUrl, { top_k: 3 });
  return results.map((result) => ({
    label: result.label.replaceAll("_", " "),
    confidence: result.score,
  }));
}
