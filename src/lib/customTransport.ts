import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport';

/**
 * Custom transport to handle specific payload requirements of the joshsoftware backend.
 */
export class CustomSmallWebRTCTransport extends SmallWebRTCTransport {
  private _isNegotiated = false;
  private _iceBuffer: RTCIceCandidate[] = [];

  // Override negotiate to match the exact payload structure seen in the backend
  // Note: We use any/ignore because we are accessing internal pipecat properties
  // @ts-ignore
  async negotiate(recreatePeerConnection = false) {
    try {
      this._isNegotiated = false;
      // @ts-ignore - Access internal peer connection
      const pc = this.pc || (this as any)._pc;
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // @ts-ignore - Access internal request info
      const webrtcRequest = (this as any)._webrtcRequest;
      // @ts-ignore
      const pcId = (this as any).pc_id || null;

      // The backend seems to expect 'config' at the root OR inside 'requestData'
      // Based on common Pipecat patterns for custom backends:
      const payload: any = {
        sdp: offer.sdp,
        type: offer.type,
        pc_id: pcId,
        restart_pc: recreatePeerConnection,
        // Josh backend specific: it often wants config at the root level
        config: { 
          data_channel_enabled: true,
          ...(webrtcRequest?.requestData?.config || {})
        },
      };

      console.log('[CustomTransport] Sending offer to:', webrtcRequest.endpoint);

      const response = await fetch(webrtcRequest.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webrtcRequest.headers || {})
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Negotiation failed: ${text}`);
      }

      const answer = await response.json();
      
      // Some backends return { sdp: "..." } directly, others wrap it
      const remoteSdp = answer.sdp || answer.answer?.sdp;
      const remoteType = answer.type || 'answer';

      if (!remoteSdp) {
        throw new Error('No SDP found in answer from bot');
      }

      // Update the internal pc_id for future ICE candidates
      const newPcId = answer.pc_id || pcId;
      // @ts-ignore
      this.pc_id = newPcId;

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: remoteType,
        sdp: remoteSdp
      }));

      this._isNegotiated = true;
      console.log('[CustomTransport] Negotiation successful, pc_id:', newPcId);

      // Flush ICE buffer
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

      await fetch(webrtcRequest.endpoint, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(webrtcRequest.headers || {})
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('[CustomTransport] ICE error:', e);
    }
  }
}
