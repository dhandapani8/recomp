# MediaPipe model

`selfie_segmenter.tflite` is Google's MediaPipe Selfie Segmenter model, used
locally in the browser to isolate one person from a full-body reference photo.

- Source: <https://developers.google.com/mediapipe/solutions/vision/image_segmenter>
- Model card: <https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf>
- Runtime: `@mediapipe/tasks-vision` 0.10.35
- License: Apache License 2.0

The generated proportions are a visual convenience. They are not body-fat,
health, medical, or biometric identity measurements. Clothing, pose, camera
angle, and lighting can affect the silhouette, so Recomp exposes manual
correction controls before saving.
