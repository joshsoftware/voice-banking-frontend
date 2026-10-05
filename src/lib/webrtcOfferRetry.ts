/**
 * Shared retry helper for WebRTC offer requests.
 *
 * Used by both CustomSmallWebRTCTransport (main voice flow) and
 * VoiceRegistration (enrollment flow) to handle transient 503/404/409
 * errors from the backend during WebRTC session setup.
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Check whether a backend error response indicates a transient, retryable failure. */
function isRetryableOfferFailure(status: number, body: string): boolean {
  if (status !== 404 && status !== 409 && status !== 503) return false;
  const text = body.toLowerCase();
  return (
    text.includes('not-yet-ready') ||
    text.includes('not yet ready') ||
    text.includes('session_not_found') ||
    text.includes('session_id') ||
    text.includes('session id') ||
    text.includes('webrtc_transport_busy') ||
    text.includes('transport busy') ||
    text.includes('retryable":true') ||
    text.includes('retryable": true')
  );
}

/** Extract a user-facing error message from a backend error response. */
export function extractOfferErrorMessage(status: number, text: string): string {
  try {
    const json = JSON.parse(text);
    if (json.error?.message) return json.error.message;
    if (json.detail) return json.detail;
  } catch { /* not JSON */ }
  if (status === 503) return 'Voice connection is busy. Please try again.';
  if (status === 404) return 'Voice session is not ready or has expired.';
  return `Voice negotiation failed (${status})`;
}

export interface OfferRetryOptions {
  /** Maximum number of attempts (including the first). Default: 4. */
  maxAttempts?: number;
  /** Initial delay in milliseconds before the first retry. Default: 250. */
  initialDelayMs?: number;
  /** Maximum delay cap in milliseconds. Default: 2000. */
  maxDelayMs?: number;
  /** AbortSignal to cancel retries on component unmount or user action. */
  signal?: AbortSignal;
}

/**
 * Fetch a WebRTC offer endpoint with automatic retry on transient failures.
 *
 * Retries on HTTP 404/409/503 when the response body indicates a retryable
 * condition (session not ready, transport busy). Uses exponential backoff
 * with small jitter.
 *
 * @returns The first successful Response.
 * @throws On non-retryable errors, retry exhaustion, AbortError, or network failure.
 */
export async function fetchWithOfferRetry(
  endpoint: string,
  init: RequestInit,
  options: OfferRetryOptions = {},
): Promise<Response> {
  const {
    maxAttempts = 4,
    initialDelayMs = 250,
    maxDelayMs = 2000,
    signal,
  } = options;

  let lastFailureStatus = 0;
  let lastFailureText = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const response = await fetch(endpoint, { ...init, signal });

    if (response.ok) return response;

    lastFailureStatus = response.status;
    lastFailureText = await response.text();

    const retryable = isRetryableOfferFailure(lastFailureStatus, lastFailureText);
    if (!retryable || attempt === maxAttempts) {
      // Non-retryable error or exhausted retries — throw with a user-facing message
      throw new Error(
        extractOfferErrorMessage(lastFailureStatus, lastFailureText),
      );
    }

    // Exponential backoff with small jitter (±25ms)
    const delayMs = Math.min(
      initialDelayMs * 2 ** (attempt - 1),
      maxDelayMs,
    ) + (Math.random() * 50 - 25);

    console.warn(
      `[WebRTC] Offer attempt ${attempt}/${maxAttempts} failed ` +
      `(${lastFailureStatus}). Retrying in ${Math.round(delayMs)}ms…`,
    );

    await sleep(delayMs);
  }

  // Should not reach here, but safety net
  throw new Error(
    extractOfferErrorMessage(lastFailureStatus, lastFailureText),
  );
}
