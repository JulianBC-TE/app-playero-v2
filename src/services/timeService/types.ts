export type TimeConfidenceLevel =
  | "MONOTONIC"
  | "SOFT_HIGH"
  | "SOFT_LOW"
  | "UNTRUSTED_MANUAL"
  | "UNKNOWN";

export interface TimeConfidenceContext {
  syncedAtEpochMs: number;
  elapsedSinceSyncMs: number;
  lastDriftMs: number;
  autoTimeEnabled: boolean;
  autoTimeZoneEnabled?: boolean;
  rebootedSinceLastSync: boolean;
  everNetworkVerified: boolean;
}

export interface TimeConfidence {
  level: TimeConfidenceLevel;
  rank: number;
  reason: string;
  context: TimeConfidenceContext;
}

export interface SecureTimeResult {
  timestampMs: number;
  confidence: TimeConfidence;
}

export interface SyncResult {
  timestampMs: number;
  driftMs: number;
}
