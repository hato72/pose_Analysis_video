'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/app/component/ui/Button';
import { useToast } from '@/app/component/ui/UseToast';

const Home = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [processedVideo, setProcessedVideo] = useState<string | null>(null);
  const [angles, setAngles] = useState<{ avgUpperBodyAngle: number; avgBackLegAngle: number; avgFrontLegAngle: number; } | null>(null);
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Error",
        description: "Failed to access camera",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    if (stream) {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideo(videoUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const videoUrl = URL.createObjectURL(file);
      setUploadedVideo(videoUrl);
    }
  };

  const sendVideo = async () => {
    const videoToSend = uploadedVideo || recordedVideo;
    if (!videoToSend) return;

    try {
      const response = await fetch(videoToSend);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('video', blob, 'video.mp4');

      const analysisResponse = await fetch('/api/analyze-pose-video', {
        method: 'POST',
        body: formData,
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze pose');
      }

      const result = await analysisResponse.json();
      setProcessedVideo(`data:video/mp4;base64,${result.processedVideo}`);
      setAngles({
        avgUpperBodyAngle: result.avgUpperBodyAngle,
        avgBackLegAngle: result.avgBackLegAngle,
        avgFrontLegAngle: result.avgFrontLegAngle
      });
    } catch (error) {
      console.error('Error sending video:', error);
      toast({
        title: "Error",
        description: "Failed to analyze pose",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Pose Analysis App</h1>
      <div className="mb-4">
        <Button onClick={startCamera} className="mr-2">Start Camera</Button>
        <Button onClick={stopCamera} variant="secondary">Stop Camera</Button>
      </div>
      <div className="mb-4">
        <video ref={videoRef} autoPlay playsInline className="w-full max-w-md mx-auto" />
      </div>
      <div className="mb-4">
        {!isRecording ? (
          <Button onClick={startRecording}>Start Recording</Button>
        ) : (
          <Button onClick={stopRecording} variant="secondary">Stop Recording</Button>
        )}
      </div>
      {recordedVideo && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Recorded Video</h2>
          <video src={recordedVideo} controls className="w-full max-w-md mx-auto" />
        </div>
      )}
      <div className="mb-4">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="hidden"
        />
        <Button onClick={() => fileInputRef.current?.click()}>Upload Video</Button>
        {uploadedVideo && (
          <div className="mt-2">
            <p>Uploaded Video:</p>
            <video src={uploadedVideo} controls className="w-full max-w-md mx-auto" />
          </div>
        )}
      </div>
      <div className="mb-4">
        <Button onClick={sendVideo}>Analyze Pose</Button>
      </div>
      {processedVideo && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Analyzed Result</h2>
          <video src={processedVideo} controls className="w-full max-w-md mx-auto" />
          {angles && (
            <div className="mt-4">
              <p>Average Upper Body Angle: {angles.avgUpperBodyAngle.toFixed(2)}°</p>
              <p>Average Back Leg Angle: {angles.avgBackLegAngle.toFixed(2)}°</p>
              <p>Average Front Leg Angle: {angles.avgFrontLegAngle.toFixed(2)}°</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;