import type { QuantumClient } from "./client.js";

// ── Request types ────────────────────────────────────────────────

/** Domain context for relevance analysis. */
export interface VisionContext {
  /** Installation type (e.g. "solar", "heat_pump", "ev_charger"). */
  installationType?: string;
  /** Phase (e.g. "pre_install", "installation", "post_install"). */
  phase?: string;
  /** Expected items for relevance checking. */
  expectedItems?: string[];
}

/** Request body for vision analysis endpoints. */
export interface VisionRequest {
  /** Base64-encoded image (with or without data: prefix). */
  imageBase64?: string;
  /** Image URL (fetched by the model provider). */
  imageUrl?: string;
  /** Model to use. Default: gemini-2.5-flash. */
  model?: string;
  /** Analysis profile: "combined" (default), "scene", "objects", "ocr", "quality". */
  profile?: string;
  /** Domain context for relevance checking. */
  context?: VisionContext;
}

// ── Response types ───────────────────────────────────────────────

/** A detected object with bounding box. */
export interface DetectedObject {
  /** Object label. */
  label: string;
  /** Detection confidence (0.0 - 1.0). */
  confidence: number;
  /** Bounding box: [y_min, x_min, y_max, x_max] normalised to 0-1000. */
  boundingBox: [number, number, number, number];
}

/** Image quality assessment. */
export interface QualityAssessment {
  /** Overall rating: "good", "acceptable", "poor". */
  overall: string;
  /** Quality score (0.0 - 1.0). */
  score: number;
  /** Blur level: "none", "slight", "significant". */
  blur: string;
  /** Lighting: "well_lit", "dim", "dark". */
  darkness: string;
  /** Resolution: "high", "adequate", "low". */
  resolution: string;
  /** Exposure: "correct", "over", "under". */
  exposure: string;
  /** Specific issues found. */
  issues: string[];
}

/** Relevance check against expected content. */
export interface RelevanceCheck {
  /** Whether the image is relevant to the context. */
  relevant: boolean;
  /** Relevance score (0.0 - 1.0). */
  score: number;
  /** Items expected based on context. */
  expectedItems: string[];
  /** Items actually found in the image. */
  foundItems: string[];
  /** Expected but not found. */
  missingItems: string[];
  /** Found but not expected. */
  unexpectedItems: string[];
  /** Additional notes. */
  notes?: string;
}

/** A detected text region in the image. */
export interface TextOverlay {
  /** Extracted text content. */
  text: string;
  /** Bounding box: [y_min, x_min, y_max, x_max] normalised to 0-1000. */
  boundingBox?: [number, number, number, number];
  /** Overlay type: "gps", "timestamp", "address", "label", "other". */
  type?: string;
}

/** OCR / text extraction result. */
export interface OcrResult {
  /** All extracted text concatenated. */
  text?: string;
  /** Extracted metadata (GPS, timestamp, address, etc.). */
  metadata: Record<string, string>;
  /** Individual text overlays with positions. */
  overlays: TextOverlay[];
}

/** Full vision analysis response. */
export interface VisionResponse {
  /** Scene description. */
  caption?: string;
  /** Suggested tags (lowercase_snake_case). */
  tags: string[];
  /** Detected objects with bounding boxes. */
  objects: DetectedObject[];
  /** Image quality assessment. */
  quality?: QualityAssessment;
  /** Relevance check against context. */
  relevance?: RelevanceCheck;
  /** Extracted text and overlay metadata. */
  ocr?: OcrResult;
  /** Model used. */
  model: string;
  /** Cost in ticks. */
  costTicks: number;
  /** Request identifier. */
  requestId: string;
}

// ── Wire format (snake_case JSON) ────────────────────────────────

/** @internal Convert camelCase request to snake_case wire format. */
function toWire(req: VisionRequest): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (req.imageBase64 !== undefined) out.image_base64 = req.imageBase64;
  if (req.imageUrl !== undefined) out.image_url = req.imageUrl;
  if (req.model !== undefined) out.model = req.model;
  if (req.profile !== undefined) out.profile = req.profile;
  if (req.context) {
    const ctx: Record<string, unknown> = {};
    if (req.context.installationType !== undefined) ctx.installation_type = req.context.installationType;
    if (req.context.phase !== undefined) ctx.phase = req.context.phase;
    if (req.context.expectedItems !== undefined) ctx.expected_items = req.context.expectedItems;
    out.context = ctx;
  }
  return out;
}

/** @internal Convert snake_case wire response to camelCase. */
function fromWire(raw: Record<string, unknown>): VisionResponse {
  const objects = (raw.objects as Record<string, unknown>[] ?? []).map((o) => ({
    label: (o.label as string) ?? "",
    confidence: (o.confidence as number) ?? 0,
    boundingBox: (o.bounding_box as [number, number, number, number]) ?? [0, 0, 0, 0],
  }));

  let quality: QualityAssessment | undefined;
  if (raw.quality) {
    const q = raw.quality as Record<string, unknown>;
    quality = {
      overall: (q.overall as string) ?? "",
      score: (q.score as number) ?? 0,
      blur: (q.blur as string) ?? "",
      darkness: (q.darkness as string) ?? "",
      resolution: (q.resolution as string) ?? "",
      exposure: (q.exposure as string) ?? "",
      issues: (q.issues as string[]) ?? [],
    };
  }

  let relevance: RelevanceCheck | undefined;
  if (raw.relevance) {
    const r = raw.relevance as Record<string, unknown>;
    relevance = {
      relevant: (r.relevant as boolean) ?? false,
      score: (r.score as number) ?? 0,
      expectedItems: (r.expected_items as string[]) ?? [],
      foundItems: (r.found_items as string[]) ?? [],
      missingItems: (r.missing_items as string[]) ?? [],
      unexpectedItems: (r.unexpected_items as string[]) ?? [],
      notes: r.notes as string | undefined,
    };
  }

  let ocr: OcrResult | undefined;
  if (raw.ocr) {
    const o = raw.ocr as Record<string, unknown>;
    const overlays = (o.overlays as Record<string, unknown>[] ?? []).map((ov) => ({
      text: (ov.text as string) ?? "",
      boundingBox: ov.bounding_box as [number, number, number, number] | undefined,
      type: ov.type as string | undefined,
    }));
    ocr = {
      text: o.text as string | undefined,
      metadata: (o.metadata as Record<string, string>) ?? {},
      overlays,
    };
  }

  return {
    caption: raw.caption as string | undefined,
    tags: (raw.tags as string[]) ?? [],
    objects,
    quality,
    relevance,
    ocr,
    model: (raw.model as string) ?? "",
    costTicks: (raw.cost_ticks as number) ?? 0,
    requestId: (raw.request_id as string) ?? "",
  };
}

// ── Client methods ───────────────────────────────────────────────

/**
 * Full combined vision analysis (scene + objects + quality + OCR + relevance).
 * @internal
 */
export async function visionAnalyze(
  client: QuantumClient,
  req: VisionRequest,
): Promise<VisionResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    "/qai/v1/vision/analyze",
    toWire(req),
  );
  return fromWire(data);
}

/**
 * Object detection with bounding boxes.
 * @internal
 */
export async function visionDetect(
  client: QuantumClient,
  req: VisionRequest,
): Promise<VisionResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    "/qai/v1/vision/detect",
    toWire(req),
  );
  return fromWire(data);
}

/**
 * Scene description and tags.
 * @internal
 */
export async function visionDescribe(
  client: QuantumClient,
  req: VisionRequest,
): Promise<VisionResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    "/qai/v1/vision/describe",
    toWire(req),
  );
  return fromWire(data);
}

/**
 * Text extraction and overlay metadata (OCR).
 * @internal
 */
export async function visionOcr(
  client: QuantumClient,
  req: VisionRequest,
): Promise<VisionResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    "/qai/v1/vision/ocr",
    toWire(req),
  );
  return fromWire(data);
}

/**
 * Image quality assessment.
 * @internal
 */
export async function visionQuality(
  client: QuantumClient,
  req: VisionRequest,
): Promise<VisionResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    "/qai/v1/vision/quality",
    toWire(req),
  );
  return fromWire(data);
}
