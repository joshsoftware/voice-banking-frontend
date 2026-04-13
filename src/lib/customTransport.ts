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

      // Wait for all ICE candidates to be gathered before sending the offer.
      // This ensures we have a complete SDP with all viable connection paths.
      // We also add a timeout to prevent infinite hanging if ICE gathering stalls.
      if (pc.iceGatheringState !== 'complete') {
        const timeoutPromise = new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('ICE gathering timed out')), 5000)
        );
        const gatheringPromise = new Promise<void>((resolve) => {
          const onStateChange = () => {
            console.log('[CustomTransport] ICE Gathering:', pc.iceGatheringState);
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', onStateChange)
              resolve()
            }
          }
          pc.addEventListener('icegatheringstatechange', onStateChange)
          // Handle case where it's already complete between checks
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', onStateChange)
            resolve()
          }
        });
        await Promise.race([gatheringPromise, timeoutPromise]);
      }

      // @ts-ignore - Access internal request info
      const webrtcRequest = (this as any)._webrtcRequest;
      // @ts-ignore
      const pcId = (this as any).pc_id || null;

      // The backend seems to expect 'config' at the root OR inside 'requestData'
      // Based on common Pipecat patterns for custom backends:
      // Use localDescription.sdp (contains all gathered candidates) not offer.sdp
      const payload: any = {
        sdp: pc.localDescription?.sdp ?? offer.sdp,
        type: pc.localDescription?.type ?? offer.type,
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
      const remoteSdp = answer.sdp || answer.answer?.sdp || answer.data?.sdp;
      const remoteType = answer.type || answer.answer?.type || 'answer';

      if (!remoteSdp) {
        console.error('[CustomTransport] Answer body:', answer);
        throw new Error('No SDP found in answer from bot');
      }

      // Update the internal pc_id for future ICE candidates
      const newPcId = answer.pc_id || answer.data?.pc_id || pcId;
      // @ts-ignore
      this.pc_id = newPcId;

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: remoteType,
        sdp: remoteSdp
      }));

      // Set negotiation flag only after setRemoteDescription succeeds
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
