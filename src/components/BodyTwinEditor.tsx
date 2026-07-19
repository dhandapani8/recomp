"use client";

import {
  Camera,
  Check,
  ImagePlus,
  LockKeyhole,
  RotateCcw,
  ScanLine,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ChangeEvent, ClipboardEvent, useEffect, useRef, useState } from "react";

import { analyzeBodyPhotos, prepareBodyPhoto } from "@/lib/body-scan";
import type { BodyProfile } from "@/lib/recomp-domain";

type ScaleKey =
  | "shoulderScale"
  | "torsoScale"
  | "waistScale"
  | "hipScale"
  | "thighScale"
  | "depthScale";

const DEFAULT_SCALES: Pick<BodyProfile, ScaleKey> = {
  shoulderScale: 1,
  torsoScale: 1,
  waistScale: 1,
  hipScale: 1,
  thighScale: 1,
  depthScale: 1,
};

const SCALE_CONTROLS: Array<{ key: ScaleKey; label: string; low: string; high: string }> = [
  { key: "shoulderScale", label: "Shoulders", low: "Narrow", high: "Broad" },
  { key: "torsoScale", label: "Torso", low: "Lean", high: "Wide" },
  { key: "waistScale", label: "Waist", low: "Trim", high: "Full" },
  { key: "hipScale", label: "Hips", low: "Narrow", high: "Wide" },
  { key: "thighScale", label: "Thighs", low: "Lean", high: "Strong" },
  { key: "depthScale", label: "Depth", low: "Shallow", high: "Deep" },
];

function PhotoInput({
  label,
  note,
  photo,
  onChange,
}: {
  label: string;
  note: string;
  photo?: string;
  onChange: (file?: File) => void;
}) {
  return (
    <label className={`body-photo-input ${photo ? "has-photo" : ""}`}>
      <input
        accept="image/*"
        onChange={(event) => onChange(event.target.files?.[0])}
        type="file"
      />
      {photo ? <img alt={`${label} body reference`} src={photo} /> : <ImagePlus size={24} />}
      <span>
        <strong>{photo ? `${label} ready` : label}</strong>
        <small>{photo ? "Tap to replace" : note}</small>
      </span>
      {photo ? <Check className="body-photo-check" size={16} /> : <Camera size={16} />}
    </label>
  );
}

export function BodyTwinEditor({
  profile,
  onSave,
  onDelete,
  onClose,
}: {
  profile?: BodyProfile;
  onSave: (profile: BodyProfile) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const [frontPhoto, setFrontPhoto] = useState(profile?.frontPhoto ?? "");
  const [sidePhoto, setSidePhoto] = useState(profile?.sidePhoto ?? "");
  const [scales, setScales] = useState<Pick<BodyProfile, ScaleKey>>(
    profile
      ? {
          shoulderScale: profile.shoulderScale,
          torsoScale: profile.torsoScale,
          waistScale: profile.waistScale,
          hipScale: profile.hipScale,
          thighScale: profile.thighScale,
          depthScale: profile.depthScale,
        }
      : DEFAULT_SCALES,
  );
  const [confidence, setConfidence] = useState<BodyProfile["confidence"]>(profile?.confidence ?? "Low");
  const [status, setStatus] = useState<"idle" | "preparing" | "analyzing" | "ready">(
    profile ? "ready" : "idle",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  async function loadPhoto(file: File | undefined, side = false) {
    if (!file) return;
    setStatus("preparing");
    setError("");
    try {
      const prepared = await prepareBodyPhoto(file);
      if (side) setSidePhoto(prepared);
      else setFrontPhoto(prepared);
      setStatus("idle");
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "The photo could not be prepared.");
      setStatus("idle");
    }
  }

  function pastePhoto(event: ClipboardEvent<HTMLElement>) {
    const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"));
    if (!image) return;
    event.preventDefault();
    void loadPhoto(image);
  }

  async function analyze() {
    if (!frontPhoto) {
      setError("Add a front full-body photo first.");
      return;
    }
    setStatus("analyzing");
    setError("");
    try {
      const result = await analyzeBodyPhotos(frontPhoto, sidePhoto || undefined);
      setScales(result);
      setConfidence(result.confidence);
      setStatus("ready");
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Body analysis could not finish.");
      setStatus("idle");
    }
  }

  function updateScale(event: ChangeEvent<HTMLInputElement>, key: ScaleKey) {
    setScales((current) => ({ ...current, [key]: Number(event.target.value) }));
  }

  function resetScales() {
    setScales(DEFAULT_SCALES);
    setConfidence("Low");
  }

  function save() {
    if (!frontPhoto) {
      setError("Add a front full-body photo first.");
      return;
    }
    onSave({
      ...scales,
      confidence,
      createdAt: new Date().toISOString(),
      frontPhoto,
      sidePhoto: sidePhoto || undefined,
    });
  }

  const working = status === "preparing" || status === "analyzing";

  return (
    <div className="body-twin-backdrop" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section
        aria-labelledby="body-twin-title"
        aria-modal="true"
        className="body-twin-dialog"
        onPaste={pastePhoto}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="body-twin-header">
          <div>
            <span><ScanLine size={15} />Body Twin</span>
            <h2 id="body-twin-title">Personalize your anatomy</h2>
            <p>Build a visual training model from your silhouette, then correct any camera or clothing distortion.</p>
          </div>
          <button aria-label="Close body twin editor" className="icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="body-twin-content">
          <div className="body-twin-capture">
            <div className="body-photo-grid">
              <PhotoInput
                label="Front photo"
                note="Full body, neutral pose"
                onChange={(file) => void loadPhoto(file)}
                photo={frontPhoto}
              />
              <PhotoInput
                label="Side photo"
                note="Optional, improves depth"
                onChange={(file) => void loadPhoto(file, true)}
                photo={sidePhoto}
              />
            </div>

            <div className="body-scan-privacy">
              <LockKeyhole size={16} />
              <span>
                <strong>Processed on this device</strong>
                <small>Recomp does not upload these photos. They stay in this browser until you delete them. You can also paste a photo here.</small>
              </span>
            </div>

            <button
              className="primary-button body-analyze-button"
              disabled={!frontPhoto || working}
              onClick={() => void analyze()}
              type="button"
            >
              {status === "analyzing" ? <ScanLine className="scan-icon" size={17} /> : <Sparkles size={17} />}
              {status === "preparing" ? "Preparing photo..." : status === "analyzing" ? "Building silhouette..." : "Analyze body shape"}
            </button>
            {error ? <p className="body-twin-error">{error}</p> : null}
            <p className="body-twin-disclaimer">Visual personalization only. This does not estimate body fat or provide a medical assessment.</p>
          </div>

          <div className="body-twin-controls">
            <div className="body-control-title">
              <div>
                <span>Proportion controls</span>
                <strong>{status === "ready" ? `${confidence} scan confidence` : "Neutral model"}</strong>
              </div>
              <button aria-label="Reset body proportions" className="icon-button" onClick={resetScales} title="Reset proportions" type="button">
                <RotateCcw size={16} />
              </button>
            </div>
            <div className="body-slider-list">
              {SCALE_CONTROLS.map((control) => (
                <label key={control.key}>
                  <span><strong>{control.label}</strong><output>{Math.round(scales[control.key] * 100)}%</output></span>
                  <input
                    max="1.3"
                    min="0.78"
                    onChange={(event) => updateScale(event, control.key)}
                    step="0.01"
                    type="range"
                    value={scales[control.key]}
                  />
                  <small><span>{control.low}</span><span>{control.high}</span></small>
                </label>
              ))}
            </div>
          </div>
        </div>

        <footer className="body-twin-actions">
          {profile && onDelete ? (
            <button className="body-delete-button" onClick={onDelete} type="button">
              <Trash2 size={16} />Delete twin
            </button>
          ) : <span />}
          <div>
            <button className="secondary-button" onClick={onClose} type="button">Cancel</button>
            <button className="primary-button" disabled={!frontPhoto || working} onClick={save} type="button">
              <Check size={16} />Save body twin
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
