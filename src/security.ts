import type { QuantumClient } from "./client.js";

// ── Request types ────────────────────────────────────────────────

/** Request body for scanning a URL for prompt injection. */
export interface SecurityScanUrlRequest {
  /** URL to scan. */
  url: string;
}

/** Request body for scanning raw HTML content. */
export interface SecurityScanHtmlRequest {
  /** Raw HTML to scan. */
  html: string;
  /** Rendered visible text (for structural analysis). */
  visibleText?: string;
  /** Source URL (for context). */
  url?: string;
}

/** Request body for reporting a suspicious URL. */
export interface SecurityReportRequest {
  /** URL to report. */
  url: string;
  /** Description of the suspected threat. */
  description?: string;
  /** Category of the suspected threat. */
  category?: string;
}

// ── Response types ───────────────────────────────────────────────

/** A single detected injection pattern. */
export interface SecurityFinding {
  /** Category: "instruction_override", "role_impersonation", "data_exfiltration", etc. */
  category: string;
  /** Pattern that matched. */
  pattern: string;
  /** Offending content (truncated). */
  content: string;
  /** Location in the page. */
  location: string;
  /** Threat level for this finding. */
  threat: string;
  /** Detection confidence (0.0 - 1.0). */
  confidence: number;
  /** Human-readable description. */
  description: string;
}

/** Threat assessment for a scanned page. */
export interface SecurityAssessment {
  /** Source URL. */
  url: string;
  /** Overall threat level: "none", "low", "medium", "high", "critical". */
  threatLevel: string;
  /** Numeric threat score (0.0 - 100.0). */
  threatScore: number;
  /** Individual findings. */
  findings: SecurityFinding[];
  /** Length of hidden text content detected. */
  hiddenTextLength: number;
  /** Length of visible text content. */
  visibleTextLength: number;
  /** Ratio of hidden to total content. */
  hiddenRatio: number;
  /** Human-readable summary. */
  summary: string;
}

/** Response from a security scan. */
export interface SecurityScanResponse {
  /** Full threat assessment. */
  assessment: SecurityAssessment;
  /** Request identifier. */
  requestId: string;
}

/** Response from checking a URL against the registry. */
export interface SecurityCheckResponse {
  /** URL that was checked. */
  url: string;
  /** Whether the URL is blocked. */
  blocked: boolean;
  /** Threat level (if blocked). */
  threatLevel?: string;
  /** Threat score (if blocked). */
  threatScore?: number;
  /** Detection categories (if blocked). */
  categories?: string[];
  /** First seen timestamp. */
  firstSeen?: string;
  /** Last seen timestamp. */
  lastSeen?: string;
  /** Number of reports. */
  reportCount?: number;
  /** Registry status: "confirmed", "suspected". */
  status?: string;
  /** Human-readable message. */
  message?: string;
}

/** A single blocklist entry. */
export interface SecurityBlocklistEntry {
  /** Entry identifier. */
  id?: string;
  /** Blocked URL. */
  url: string;
  /** Registry status. */
  status: string;
  /** Threat level. */
  threatLevel: string;
  /** Threat score. */
  threatScore: number;
  /** Detection categories. */
  categories: string[];
  /** Number of findings. */
  findingsCount: number;
  /** Hidden content ratio. */
  hiddenRatio: number;
  /** First seen timestamp. */
  firstSeen?: string;
  /** Summary. */
  summary: string;
}

/** Response from the blocklist feed. */
export interface SecurityBlocklistResponse {
  /** Blocklist entries. */
  entries: SecurityBlocklistEntry[];
  /** Total count. */
  count: number;
  /** Filter status used. */
  status: string;
}

/** Response from reporting a URL. */
export interface SecurityReportResponse {
  /** URL that was reported. */
  url: string;
  /** Report status: "existing" or "suspected". */
  status: string;
  /** Message. */
  message: string;
  /** Threat level (if already in registry). */
  threatLevel?: string;
}

// ── Wire format helpers ──────────────────────────────────────────

/** @internal */
function scanHtmlToWire(req: SecurityScanHtmlRequest): Record<string, unknown> {
  const out: Record<string, unknown> = { html: req.html };
  if (req.visibleText !== undefined) out.visible_text = req.visibleText;
  if (req.url !== undefined) out.url = req.url;
  return out;
}

/** @internal */
function findingFromWire(raw: Record<string, unknown>): SecurityFinding {
  return {
    category: (raw.category as string) ?? "",
    pattern: (raw.pattern as string) ?? "",
    content: (raw.content as string) ?? "",
    location: (raw.location as string) ?? "",
    threat: (raw.threat as string) ?? "",
    confidence: (raw.confidence as number) ?? 0,
    description: (raw.description as string) ?? "",
  };
}

/** @internal */
function assessmentFromWire(raw: Record<string, unknown>): SecurityAssessment {
  const findings = (raw.findings as Record<string, unknown>[] ?? []).map(findingFromWire);
  return {
    url: (raw.url as string) ?? "",
    threatLevel: (raw.threat_level as string) ?? "",
    threatScore: (raw.threat_score as number) ?? 0,
    findings,
    hiddenTextLength: (raw.hidden_text_length as number) ?? 0,
    visibleTextLength: (raw.visible_text_length as number) ?? 0,
    hiddenRatio: (raw.hidden_ratio as number) ?? 0,
    summary: (raw.summary as string) ?? "",
  };
}

/** @internal */
function scanRespFromWire(raw: Record<string, unknown>): SecurityScanResponse {
  return {
    assessment: assessmentFromWire(raw.assessment as Record<string, unknown> ?? {}),
    requestId: (raw.request_id as string) ?? "",
  };
}

/** @internal */
function checkRespFromWire(raw: Record<string, unknown>): SecurityCheckResponse {
  return {
    url: (raw.url as string) ?? "",
    blocked: (raw.blocked as boolean) ?? false,
    threatLevel: raw.threat_level as string | undefined,
    threatScore: raw.threat_score as number | undefined,
    categories: raw.categories as string[] | undefined,
    firstSeen: raw.first_seen as string | undefined,
    lastSeen: raw.last_seen as string | undefined,
    reportCount: raw.report_count as number | undefined,
    status: raw.status as string | undefined,
    message: raw.message as string | undefined,
  };
}

/** @internal */
function blocklistEntryFromWire(raw: Record<string, unknown>): SecurityBlocklistEntry {
  return {
    id: raw.id as string | undefined,
    url: (raw.url as string) ?? "",
    status: (raw.status as string) ?? "",
    threatLevel: (raw.threat_level as string) ?? "",
    threatScore: (raw.threat_score as number) ?? 0,
    categories: (raw.categories as string[]) ?? [],
    findingsCount: (raw.findings_count as number) ?? 0,
    hiddenRatio: (raw.hidden_ratio as number) ?? 0,
    firstSeen: raw.first_seen as string | undefined,
    summary: (raw.summary as string) ?? "",
  };
}

/** @internal */
function blocklistRespFromWire(raw: Record<string, unknown>): SecurityBlocklistResponse {
  const entries = (raw.entries as Record<string, unknown>[] ?? []).map(blocklistEntryFromWire);
  return {
    entries,
    count: (raw.count as number) ?? 0,
    status: (raw.status as string) ?? "",
  };
}

/** @internal */
function reportRespFromWire(raw: Record<string, unknown>): SecurityReportResponse {
  return {
    url: (raw.url as string) ?? "",
    status: (raw.status as string) ?? "",
    message: (raw.message as string) ?? "",
    threatLevel: raw.threat_level as string | undefined,
  };
}

// ── Client methods ───────────────────────────────────────────────

/**
 * Scan a URL for prompt injection attacks.
 * @internal
 */
export async function securityScanUrl(
  client: QuantumClient,
  url: string,
): Promise<SecurityScanResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    "/qai/v1/security/scan-url",
    { url },
  );
  return scanRespFromWire(data);
}

/**
 * Scan raw HTML content for prompt injection.
 * @internal
 */
export async function securityScanHtml(
  client: QuantumClient,
  req: SecurityScanHtmlRequest,
): Promise<SecurityScanResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    "/qai/v1/security/scan-html",
    scanHtmlToWire(req),
  );
  return scanRespFromWire(data);
}

/**
 * Check a URL against the injection registry.
 * @internal
 */
export async function securityCheck(
  client: QuantumClient,
  url: string,
): Promise<SecurityCheckResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "GET",
    `/qai/v1/security/check?url=${encodeURIComponent(url)}`,
    undefined,
  );
  return checkRespFromWire(data);
}

/**
 * Get the injection blocklist feed.
 * @internal
 */
export async function securityBlocklist(
  client: QuantumClient,
  status?: string,
): Promise<SecurityBlocklistResponse> {
  const path = status
    ? `/qai/v1/security/blocklist?status=${encodeURIComponent(status)}`
    : "/qai/v1/security/blocklist";
  const { data } = await client._doJSON<Record<string, unknown>>(
    "GET",
    path,
    undefined,
  );
  return blocklistRespFromWire(data);
}

/**
 * Report a suspicious URL.
 * @internal
 */
export async function securityReport(
  client: QuantumClient,
  req: SecurityReportRequest,
): Promise<SecurityReportResponse> {
  const { data } = await client._doJSON<Record<string, unknown>>(
    "POST",
    "/qai/v1/security/report",
    req,
  );
  return reportRespFromWire(data);
}
