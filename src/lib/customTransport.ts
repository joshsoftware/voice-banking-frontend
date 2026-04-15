import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport';

/**
 * Helper to extract headers from a Headers object or plain record into a plain object.
 * Needed because _webrtcRequest.headers may be a `Headers` instance whose entries
 * cannot be spread with `{...headers}`.
 */
function extractHeaders(h: Headers | Record<string, string> | undefined): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) {
    const out: Record<string, string> = {};
    h.forEach((v, k) => { out[k] = v; });
    return out;
  }
  return h as Record<string, string>;
}

/**
 * Custom transport that waits for full ICE gathering before sending the offer so
 * that all candidates are embedded in the SDP (no trickle-ICE needed by the
 * backend).  Critically, we do NOT pass `waitForICEGathering: true` to the
 * parent constructor — that option adds an `icegatheringstatechange` listener
 * that calls `attemptReconnection()` whenever gathering finishes while the
 * connection is still in "checking" state (e.g. after a second gathering round
 * triggered by setRemoteDescription).  That listener is the root cause of the
 * repeated-offer loop.  Instead, we wait for gathering manually here and keep
 * the library reconnection logic disabled.
 */
export class CustomSmallWebRTCTransport extends SmallWebRTCTransport {
  private _isNegotiated = false;
  private _iceBuffer: RTCIceCandidate[] = [];

  // @ts-ignore
  async negotiate(recreatePeerConnection = false) {
    try {
      this._isNegotiated = false;
      // @ts-ignore
      const pc: RTCPeerConnection = (this as any).pc;
      if (!pc || pc.signalingState === 'closed') return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to finish so the SDP contains all candidates.
      // IMPORTANT: use resolve-on-timeout (never reject) so that a slow gather
      // still sends the offer with whatever candidates exist rather than aborting
      // the entire connection attempt.
      if (pc.iceGatheringState !== 'complete') {
        await new Promise<void>((resolve) => {
          let tid: ReturnType<typeof setTimeout>;
          const cleanup = () => {
            clearTimeout(tid);
            pc.removeEventListener('icegatheringstatechange', onStateChange);
          };
          const onStateChange = () => {
            console.log('[CustomTransport] ICE Gathering:', pc.iceGatheringState);
            if (pc.iceGatheringState === 'complete') {
              cleanup();
              resolve();
            }
          };
          pc.addEventListener('icegatheringstatechange', onStateChange);
          // Resolve anyway after 8 s to avoid hanging forever on bad networks
          tid = setTimeout(() => {
            console.warn('[CustomTransport] ICE gathering timeout – sending offer with partial candidates');
            cleanup();
            resolve();
          }, 8000);
          // Double-check in case it completed between the initial check and addEventListener
          if (pc.iceGatheringState === 'complete') { cleanup(); resolve(); }
        });
      }

      // @ts-ignore
      const webrtcRequest = (this as any)._webrtcRequest;
      // @ts-ignore
      const pcId = (this as any).pc_id || null;

      const payload: Record<string, unknown> = {
        sdp: pc.localDescription?.sdp ?? offer.sdp,
        type: pc.localDescription?.type ?? offer.type,
        pc_id: pcId,
        restart_pc: recreatePeerConnection,
        // Pass requestData through so the backend bot receives customer_id etc.
        ...(webrtcRequest?.requestData ? { requestData: webrtcRequest.requestData } : {}),
      };

      console.log('[CustomTransport] Sending offer to:', webrtcRequest.endpoint);

      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extractHeaders(webrtcRequest?.headers),
      };

      const response = await fetch(webrtcRequest.endpoint, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Negotiation failed (${response.status}): ${text}`);
      }

      const answer = await response.json();

      const remoteSdp = answer.sdp || answer.answer?.sdp || answer.data?.sdp;
      const remoteType = answer.type || answer.answer?.type || 'answer';

      if (!remoteSdp) {
        console.error('[CustomTransport] Unexpected answer body:', answer);
        throw new Error('No SDP found in answer from server');
      }

      const newPcId = answer.pc_id || answer.data?.pc_id || pcId;
      // @ts-ignore
      (this as any).pc_id = newPcId;

      await pc.setRemoteDescription(new RTCSessionDescription({ type: remoteType, sdp: remoteSdp }));

      this._isNegotiated = true;
      console.log('[CustomTransport] Negotiation successful, pc_id:', newPcId);

      // Flush buffered ICE candidates that arrived before negotiation completed
      if (this._iceBuffer.length > 0) {
        for (const cand of this._iceBuffer) {
          await this.sendIceCandidate(cand);
        }
        this._iceBuffer = [];
      }
    } catch (e) {
      console.error('[CustomTransport] Negotiation error:', e);
      throw e;
    }
  }

  // @ts-ignore
  async sendIceCandidate(candidate: RTCIceCandidate) {
    if (!this._isNegotiated) {
      this._iceBuffer.push(candidate);
      return;
    }

    try {
      // @ts-ignore
      const webrtcRequest = (this as any)._webrtcRequest;
      // @ts-ignore
      const pcId = (this as any).pc_id;

      if (!webrtcRequest || !pcId) return;

      const payload = {
        pc_id: pcId,
        candidates: [{
          candidate: candidate.candidate,
          sdp_mid: candidate.sdpMid,
          sdp_mline_index: candidate.sdpMLineIndex
        }]
      };

      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extractHeaders(webrtcRequest?.headers),
      };

      await fetch(webrtcRequest.endpoint, {
        method: 'PATCH',
        headers: reqHeaders,
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('[CustomTransport] ICE error:', e);
    }
  }
}
