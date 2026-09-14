import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  Search,
  Sparkles,
  Check,
  AlertCircle,
  VideoOff,
  Sliders,
  Car,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import { ScanResult, HuggingFaceSettings } from '../types';
import { generateSyntheticPlateImage } from '../utils/plateImageGenerator';

interface PlateScannerProps {
  onPlateRecognized: (plate: string, scanResult?: ScanResult) => void;
  onSearchDirect: (query: string) => void;
  isProcessing: boolean;
  hfSettings: HuggingFaceSettings;
}

export const PlateScanner: React.FC<PlateScannerProps> = ({
  onPlateRecognized,
  onSearchDirect,
  isProcessing: externalProcessing,
  hfSettings,
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload'>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [internalProcessing, setInternalProcessing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [editablePlate, setEditablePlate] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isScanning = externalProcessing || internalProcessing;

  const attachStream = useCallback((stream: MediaStream) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.warn('Video play auto-call warning:', err);
      });
    }
  }, []);

  // Initialize camera stream with robust constraint fallbacks
  const startCamera = useCallback(async () => {
    setCameraStarting(true);
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraActive(false);
      setCameraError(
        'Camera API is restricted inside this iframe or unsupported. Click "Open in New Tab" or use "Snap with Phone Camera".'
      );
      setCameraStarting(false);
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (errConstraint) {
        console.warn('Ideal camera constraint failed, retrying basic video constraint:', errConstraint);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraActive(true);
      setCameraError(null);
      attachStream(stream);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was blocked by browser permissions. Click "Open in New Tab" or allow camera in your address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this computer. You can upload a photo or use your smartphone camera.');
      } else {
        setCameraError(err.message || 'Unable to open camera. Try opening in a new tab or upload a photo.');
      }
    } finally {
      setCameraStarting(false);
    }
  }, [facingMode, attachStream]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (activeMode === 'camera' && !previewImage) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeMode, previewImage, startCamera, stopCamera]);

  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      attachStream(streamRef.current);
    }
  }, [cameraActive, attachStream]);

  // Capture snapshot from webcam
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreviewImage(dataUrl);
    stopCamera();
    processImageWithOcr(dataUrl);
  };

  // Process uploaded or captured image with automatic retry for transient 503 errors
  const processImageWithOcr = async (dataUrl: string, retryCount = 0) => {
    setInternalProcessing(true);
    setErrorStatus(null);

    try {
      const res = await fetch('/api/ocr-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          preferredEngine: hfSettings.preferredEngine,
          hfToken: hfSettings.apiKey,
          hfModel: hfSettings.model,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const rawErr = errJson.error || `OCR server error (${res.status})`;

        // If 503 (high demand spike) or 429, auto-retry once after 1 second
        if ((res.status === 503 || rawErr.includes('503') || rawErr.includes('high demand')) && retryCount < 2) {
          setErrorStatus(`High demand spike on vision service. Automatically retrying (${retryCount + 1}/2)...`);
          await new Promise((resolve) => setTimeout(resolve, 1200));
          return processImageWithOcr(dataUrl, retryCount + 1);
        }

        throw new Error(rawErr);
      }

      const result: ScanResult = await res.json();

      if (!result.plateNumber && !result.normalizedPlate) {
        setErrorStatus('No license plate detected in this photo. Please retake closer to the vehicle bumper or type plate manually.');
        setLastScanResult(null);
      } else {
        setLastScanResult(result);
        setEditablePlate(result.plateNumber || result.normalizedPlate);
        onPlateRecognized(result.plateNumber || result.normalizedPlate, result);
      }
    } catch (err: any) {
      console.error('OCR processing failed:', err);
      const is503 = err.message?.includes('503') || err.message?.includes('high demand') || err.message?.includes('UNAVAILABLE');
      if (is503) {
        setErrorStatus('The AI Vision API is experiencing high demand. Click "Retry OCR" or enter the plate number directly below.');
      } else {
        setErrorStatus(err.message || 'Failed to analyze plate image. Please try again or type plate manually.');
      }
    } finally {
      setInternalProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewImage(dataUrl);
      processImageWithOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSamplePlate = (plateText: string, state = 'IND', isCommercial = false) => {
    const dataUrl = generateSyntheticPlateImage(plateText, state, isCommercial ? 'yellow' : 'white');
    setPreviewImage(dataUrl);
    stopCamera();
    processImageWithOcr(dataUrl);
  };

  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    onSearchDirect(manualQuery.trim());
  };

  const handleConfirmEditPlate = () => {
    if (!editablePlate.trim()) return;
    onPlateRecognized(editablePlate.trim(), lastScanResult || undefined);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top bar: Mode Toggle and Quick Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveMode('camera');
              setPreviewImage(null);
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeMode === 'camera'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="h-4 w-4" />
            Live Camera
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('upload');
              stopCamera();
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeMode === 'upload'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload Photo
          </button>
        </div>

        {/* Quick manual keyboard search */}
        <form onSubmit={handleManualSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value)}
            placeholder="Type plate number (e.g. GJ01AB1234) or colleague name..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-20 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none shadow-xs"
          />
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <button
            type="submit"
            className="absolute right-1.5 top-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Hugging Face Model active status pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-200">
            🤗 Hugging Face Model
          </span>
          <span className="font-mono text-[11px] font-semibold text-slate-800">
            {hfSettings.model || 'microsoft/trocr-base-printed'}
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          Transformer OCR • License plate alphanumeric extraction
        </span>
      </div>

      {/* Main Viewfinder / Canvas Card */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 shadow-inner">
        {/* Camera mode */}
        {activeMode === 'camera' && !previewImage && (
          <div className="relative aspect-4/3 sm:aspect-16/9 w-full overflow-hidden bg-black flex items-center justify-center">
            {/* Video element is permanently mounted to guarantee videoRef.current is never null */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {cameraActive ? (
              <>
                {/* License plate bounding box alignment overlay */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-28 w-72 sm:h-36 sm:w-96 rounded-xl border-2 border-dashed border-yellow-400 bg-yellow-400/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                    {/* Corner accent marks */}
                    <div className="absolute -top-1 -left-1 h-4 w-4 border-t-4 border-l-4 border-yellow-400"></div>
                    <div className="absolute -top-1 -right-1 h-4 w-4 border-t-4 border-r-4 border-yellow-400"></div>
                    <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-yellow-400"></div>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-yellow-400"></div>

                    {/* Scanning laser animation */}
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce opacity-80"></div>

                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-black/75 px-2 py-0.5 text-[10px] font-medium tracking-wide text-yellow-300 uppercase whitespace-nowrap">
                      Align Number Plate Inside Box
                    </div>
                  </div>
                </div>

                {/* Camera controls overlay */}
                <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800/80 text-white backdrop-blur-md hover:bg-slate-700 transition-colors"
                    title="Switch camera"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>

                  <button
                    id="btn-capture-photo"
                    type="button"
                    onClick={handleCapturePhoto}
                    className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
                    title="Click photo of number plate"
                  >
                    <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center">
                      <Camera className="h-5 w-5 text-blue-600" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800/80 text-white backdrop-blur-md hover:bg-slate-700 transition-colors"
                    title="Choose existing photo file"
                  >
                    <Upload className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300 max-w-md">
                {cameraStarting ? (
                  <>
                    <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-500 border-t-transparent mb-3" />
                    <p className="font-semibold text-sm text-white">Opening Camera...</p>
                    <p className="mt-1 text-xs text-slate-400">Requesting permission from your browser</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-amber-400 mb-3 border border-slate-700">
                      <VideoOff className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-sm text-white">Camera Access Not Started</p>
                    <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                      {cameraError || 'Click below to start your webcam, or use your phone camera / photo upload.'}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                      >
                        <Camera className="h-4 w-4" />
                        Start / Allow Camera
                      </button>

                      <a
                        href={typeof window !== 'undefined' ? window.location.href : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all"
                        title="Open outside the preview frame for direct browser camera permissions"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in New Tab
                      </a>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                      >
                        <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                        Snap with Phone / Upload
                      </button>
                    </div>

                    <p className="mt-3 text-[11px] text-slate-400">
                      💡 <em>Tip:</em> On mobile devices or within iframes, tapping &quot;Snap with Phone / Upload&quot; opens your device&apos;s native camera instantly.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Upload Mode or Snapshot Preview */}
        {(activeMode === 'upload' || previewImage) && (
          <div className="relative aspect-4/3 sm:aspect-16/9 w-full flex items-center justify-center bg-slate-950">
            {previewImage ? (
              <>
                <img
                  src={previewImage}
                  alt="Captured Plate"
                  className="h-full w-full object-contain"
                />

                {/* Retake / re-upload buttons overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImage(null);
                      setLastScanResult(null);
                      setErrorStatus(null);
                      if (activeMode === 'camera') startCamera();
                    }}
                    className="rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md hover:bg-slate-800 transition-colors"
                  >
                    Retake Photo
                  </button>
                </div>
              </>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex h-full w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed border-slate-700 p-8 text-center transition-colors hover:border-blue-500 hover:bg-slate-900/50"
              >
                <Upload className="h-12 w-12 text-blue-500 mb-3 animate-pulse" />
                <p className="text-sm font-bold text-white">Click or Drag Car Photo Here</p>
                <p className="mt-1 text-xs text-slate-400">
                  Supports JPG, PNG, WEBP from phone camera or gallery
                </p>
                <span className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                  Select Image File
                </span>
              </div>
            )}
          </div>
        )}

        {/* Processing Indicator Overlay */}
        {isScanning && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs text-white">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <div className="absolute h-full w-full rounded-full border-4 border-blue-600/30 border-t-blue-500 animate-spin"></div>
              <Sparkles className="h-6 w-6 text-blue-400 animate-pulse" />
            </div>
            <p className="mt-4 text-sm font-bold tracking-wide">
              {hfSettings.preferredEngine === 'huggingface'
                ? 'Parsing Plate with Hugging Face Model...'
                : 'Recognizing License Plate with AI OCR...'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Extracting registration code &amp; matching company sheet
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* OCR Result Quick Review & Fine Tuning */}
      {lastScanResult && !isScanning && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  OCR Plate Detected
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="text"
                    value={editablePlate}
                    onChange={(e) => setEditablePlate(e.target.value.toUpperCase())}
                    className="font-mono text-base font-black text-slate-900 uppercase bg-white px-2.5 py-1 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmEditPlate}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Confirm &amp; Match
                  </button>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 sm:text-right">
              <p>
                Confidence:{' '}
                <span className="font-semibold text-slate-800">
                  {Math.round((lastScanResult.confidence || 0.9) * 100)}%
                </span>{' '}
                • Engine: <span className="font-semibold text-blue-700">{lastScanResult.engine}</span>
              </p>
              {lastScanResult.vehicleDetails && (
                <p className="text-slate-500 mt-0.5">
                  Detected: {lastScanResult.vehicleDetails}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error notification with quick retry */}
      {errorStatus && !isScanning && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">OCR Status Notice</p>
              <p className="mt-0.5">{errorStatus}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {previewImage && (
              <button
                type="button"
                onClick={() => processImageWithOcr(previewImage)}
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 transition-colors"
              >
                Retry OCR
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setErrorStatus(null);
                setPreviewImage(null);
                setActiveMode('camera');
              }}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
            >
              Retake Photo
            </button>
          </div>
        </div>
      )}

      {/* One-Click Sample Plates to test right now */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Quick Test: Sample Company Car Plates
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Click any plate to simulate camera OCR
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleLoadSamplePlate('GJ 01 AB 1234', 'IND')}
            className="group flex flex-col items-start rounded-lg border border-slate-200 bg-slate-50 p-2.5 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left"
          >
            <span className="font-mono text-xs font-black text-slate-900 group-hover:text-blue-700">
              GJ 01 AB 1234
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">Sanjay Rana (i20)</span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">Bay #14</span>
          </button>

          <button
            type="button"
            onClick={() => handleLoadSamplePlate('GJ 27 BC 4590', 'IND')}
            className="group flex flex-col items-start rounded-lg border border-slate-200 bg-slate-50 p-2.5 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left"
          >
            <span className="font-mono text-xs font-black text-slate-900 group-hover:text-blue-700">
              GJ 27 BC 4590
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">Priya Patel (City)</span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">Bay #09</span>
          </button>

          <button
            type="button"
            onClick={() => handleLoadSamplePlate('MH 12 PQ 7890', 'IND')}
            className="group flex flex-col items-start rounded-lg border border-slate-200 bg-slate-50 p-2.5 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left"
          >
            <span className="font-mono text-xs font-black text-slate-900 group-hover:text-blue-700">
              MH 12 PQ 7890
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">Rahul Sharma (Nexon)</span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">Bay #22</span>
          </button>

          <button
            type="button"
            onClick={() => handleLoadSamplePlate('DL 08 CA 3344', 'IND')}
            className="group flex flex-col items-start rounded-lg border border-slate-200 bg-slate-50 p-2.5 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left"
          >
            <span className="font-mono text-xs font-black text-slate-900 group-hover:text-blue-700">
              DL 08 CA 3344
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">Vikram Mehta (Seltos)</span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">Bay #18</span>
          </button>
        </div>
      </div>
    </div>
  );
};
