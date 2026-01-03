import { useState, useRef, useCallback, useEffect } from "react";

interface CapturedMedia {
  audioBlob?: Blob;
  audioUrl?: string;
  imageBlob?: Blob;
  imageUrl?: string;
}

interface UseMediaCaptureOptions {
  audioBufferSeconds?: number; // How many seconds of audio to buffer
}

export const useMediaCapture = (options: UseMediaCaptureOptions = {}) => {
  const { audioBufferSeconds = 30 } = options;
  
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [hasAudioPermission, setHasAudioPermission] = useState<boolean | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia>({});
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAudioCapture();
      if (capturedMedia.audioUrl) URL.revokeObjectURL(capturedMedia.audioUrl);
      if (capturedMedia.imageUrl) URL.revokeObjectURL(capturedMedia.imageUrl);
    };
  }, []);

  // Start continuous audio buffering (keeps last N seconds)
  const startAudioCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      audioStreamRef.current = stream;
      setHasAudioPermission(true);
      setIsRecordingAudio(true);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          // Keep only the last N chunks (approximately audioBufferSeconds)
          // Each chunk is ~1 second with timeslice of 1000ms
          const maxChunks = audioBufferSeconds;
          if (audioChunksRef.current.length > maxChunks) {
            audioChunksRef.current = audioChunksRef.current.slice(-maxChunks);
          }
        }
      };
      
      // Request data every second for smoother buffering
      mediaRecorder.start(1000);
      
      console.log("Audio capture started - buffering last", audioBufferSeconds, "seconds");
      return true;
    } catch (error) {
      console.error("Error starting audio capture:", error);
      setHasAudioPermission(false);
      return false;
    }
  }, [audioBufferSeconds]);

  // Stop audio capture and return the buffered audio
  const stopAudioCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    
    setIsRecordingAudio(false);
    console.log("Audio capture stopped");
  }, []);

  // Get the buffered audio as a blob
  const getBufferedAudio = useCallback((): Blob | null => {
    if (audioChunksRef.current.length === 0) return null;
    
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    console.log("Buffered audio size:", audioBlob.size, "bytes");
    return audioBlob;
  }, []);

  // Capture a photo from the camera
  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment", // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setHasCameraPermission(true);
      
      // Create video element to capture frame
      const video = document.createElement("video");
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      
      await video.play();
      
      // Wait a moment for camera to adjust exposure
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create canvas and capture frame
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        stream.getTracks().forEach(track => track.stop());
        return null;
      }
      
      ctx.drawImage(video, 0, 0);
      
      // Stop video stream
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
      
      // Convert to blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          console.log("Photo captured, size:", blob?.size, "bytes");
          resolve(blob);
        }, "image/jpeg", 0.8);
      });
    } catch (error) {
      console.error("Error capturing photo:", error);
      setHasCameraPermission(false);
      return null;
    }
  }, []);

  // Capture all enabled media at once (for panic activation)
  const captureAllMedia = useCallback(async (options: { 
    audio: boolean; 
    photo: boolean;
  }) => {
    const media: CapturedMedia = {};
    
    if (options.audio) {
      const audioBlob = getBufferedAudio();
      if (audioBlob && audioBlob.size > 0) {
        media.audioBlob = audioBlob;
        media.audioUrl = URL.createObjectURL(audioBlob);
      }
    }
    
    if (options.photo) {
      const imageBlob = await capturePhoto();
      if (imageBlob) {
        media.imageBlob = imageBlob;
        media.imageUrl = URL.createObjectURL(imageBlob);
      }
    }
    
    setCapturedMedia(media);
    return media;
  }, [getBufferedAudio, capturePhoto]);

  // Check if browser supports media capture
  const isMediaCaptureSupported = typeof navigator !== "undefined" && 
    !!navigator.mediaDevices && 
    !!navigator.mediaDevices.getUserMedia;

  return {
    isRecordingAudio,
    hasAudioPermission,
    hasCameraPermission,
    capturedMedia,
    isMediaCaptureSupported,
    startAudioCapture,
    stopAudioCapture,
    getBufferedAudio,
    capturePhoto,
    captureAllMedia,
  };
};

