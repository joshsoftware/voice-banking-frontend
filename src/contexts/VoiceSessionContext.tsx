import React, { createContext, useContext } from 'react';
import { useSmallWebRTC } from '@/hooks/useSmallWebRTC';
import type { WebRTCState, ChatMessage, VoiceprintStatus, InputSoundStatus, OTPSignal } from '@/hooks/useSmallWebRTC';
import type { PipecatClient } from '@pipecat-ai/client-js';

interface VoiceSessionContextValue {
    state: WebRTCState;
    isMuted: boolean;
    messages: ChatMessage[];
    sessionId: string | null;
    inputSoundStatus: InputSoundStatus | null;
    voiceprintStatus: VoiceprintStatus | null;
    otpSignal: OTPSignal | null;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    toggleMute: () => void;
    submitOtp: (code: string) => Promise<any>;
    stopAudioTracks: () => void;
    client: PipecatClient | null;
}

const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null);

export function VoiceSessionProvider({ children }: { children: React.ReactNode }) {
    const voiceSession = useSmallWebRTC();

    return (
        <VoiceSessionContext.Provider value={voiceSession}>
            {children}
        </VoiceSessionContext.Provider>
    );
}

export function useVoiceSession() {
    const context = useContext(VoiceSessionContext);
    if (!context) {
        throw new Error('useVoiceSession must be used within a VoiceSessionProvider');
    }
    return context;
}
