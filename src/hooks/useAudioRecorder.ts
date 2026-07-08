import { useState, useRef, useCallback } from 'react';
import { supabase } from '../supabase/client';

const VOICE_PREFIX = '[voice]';

export function isVoiceMessage(text: string): boolean {
  return typeof text === 'string' && text.startsWith(VOICE_PREFIX);
}

export function getVoiceUrl(text: string): string | null {
  if (!isVoiceMessage(text)) return null;
  return text.slice(VOICE_PREFIX.length);
}

export function makeVoiceText(url: string): string {
  return VOICE_PREFIX + url;
}

export default function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        console.warn('useAudioRecorder: microphone permission denied');
        throw new Error('permission_denied');
      }
      console.error('useAudioRecorder:', err);
      throw err;
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise<Blob | null>((resolve) => {
      clearInterval(timerRef.current!);
      setRecording(false);
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === 'inactive') { resolve(null); return; }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        chunksRef.current = [];
        resolve(blob);
      };
      mr.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    clearInterval(timerRef.current!);
    setRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    chunksRef.current = [];
    setRecordingTime(0);
  }, []);

  const uploadAudio = useCallback(async (blob: Blob, orderId?: string) => {
    const folder = orderId ? `chats/orders/${orderId}` : 'chats/support';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webm`;
    const { error } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, blob, { contentType: blob.type, upsert: false });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('voice-messages')
      .getPublicUrl(fileName);
    return publicUrl;
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return { recording, recordingTime, startRecording, stopRecording, cancelRecording, uploadAudio, formatTime };
}
