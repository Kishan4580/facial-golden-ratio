import React, { useState, useEffect, useRef } from 'react';

// Declare faceapi as a global variable
declare const faceapi: any;

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const GOLDEN_RATIO = 1.618;
const ANALYSIS_TIMEOUT = 15000; // 15 seconds

// Helper function to calculate distance between two points
const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

const CameraIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
);
const CheckIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
);
const XIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
);

const PhotoGuidelines = ({ onSelectFile }: { onSelectFile: () => void }) => (
  <div className="bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg border border-gray-700 max-w-2xl mx-auto">
    <h3 className="text-2xl font-bold text-cyan-300 mb-4 text-center">Photo Guidelines</h3>
    <p className="text-gray-400 mb-6 text-center">For the most accurate Golden Ratio calculation, please ensure your photo meets these requirements:</p>
    
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-600">
        <h4 className="font-bold text-green-400 mb-3 flex items-center"><CheckIcon /> Do This</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start"><span className="mr-2">•</span> Look straight at the camera (Frontal view).</li>
          <li className="flex items-start"><span className="mr-2">•</span> Keep a neutral expression (mouth closed).</li>
          <li className="flex items-start"><span className="mr-2">•</span> Ensure your face is evenly lit.</li>
          <li className="flex items-start"><span className="mr-2">•</span> Pull hair back to reveal forehead and ears.</li>
          <li className="flex items-start"><span className="mr-2">•</span> <strong>Only one person</strong> in the photo.</li>
        </ul>
      </div>
      
      <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-600">
        <h4 className="font-bold text-red-400 mb-3 flex items-center"><XIcon /> Avoid This</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start"><span className="mr-2">•</span> Multiple people in the frame.</li>
          <li className="flex items-start"><span className="mr-2">•</span> Objects blocking the face (hands, masks).</li>
          <li className="flex items-start"><span className="mr-2">•</span> Smiling, frowning, or open mouth.</li>
          <li className="flex items-start"><span className="mr-2">•</span> Glasses or heavy shadows.</li>
        </ul>
      </div>
    </div>

    <button 
      onClick={onSelectFile} 
      className="w-full bg-cyan-500 hover:bg-cyan-600 text-gray-900 font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-[1.02] flex items-center justify-center"
    >
      <UploadIcon /> Select Photo
    </button>
  </div>
);

const App: React.FC = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [mode, setMode] = useState<'select' | 'camera' | 'upload'>('select');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadModels = async () => {
      setLoading('Loading models...');
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (e) {
        setError('Failed to load models. Please refresh the page.');
      }
      setLoading(null);
    };
    loadModels();
  }, []);

  const startVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.');
      setMode('select');
    }
  };

  const stopVideoStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  const handleModeSelect = (selectedMode: 'camera' | 'upload') => {
    setError(null);
    setResults(null);
    setImageSrc(null);
    if (selectedMode === 'camera') {
      setMode('camera');
      startVideoStream();
    } else {
      stopVideoStream();
      setMode('upload');
      // Do not click file input immediately, let user see guidelines first
    }
  };
  
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        setImageSrc(canvas.toDataURL('image/jpeg'));
        stopVideoStream();
        setMode('upload');
    }
  };

  const analyzeImage = async () => {
    if (!imageRef.current) return;

    setLoading('Detecting faces...');
    setError(null);
    setResults(null);

    try {
      const options = new faceapi.TinyFaceDetectorOptions();

      // Step 1: Check for multiple faces or no faces
      const allFaces = await faceapi.detectAllFaces(imageRef.current, options);
      
      if (allFaces.length === 0) {
        setError('No face detected. The photo might be too dark, or the face isn\'t clearly visible.');
        setLoading(null);
        return;
      }

      if (allFaces.length > 1) {
        setError(`Multiple faces detected (${allFaces.length}). Please ensure only one person is in the photo for accurate analysis.`);
        setLoading(null);
        return;
      }

      // Step 2: If exactly one face, perform detailed landmark detection
      setLoading('Analyzing facial structure...');
      
      const detectionPromise = faceapi.detectSingleFace(
        imageRef.current, 
        options
      ).withFaceLandmarks();

      const timeoutPromise = new Promise((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error(`Analysis timed out after ${ANALYSIS_TIMEOUT / 1000} seconds.`));
        }, ANALYSIS_TIMEOUT);
      });

      const detection: any = await Promise.race([
        detectionPromise,
        timeoutPromise
      ]);

      if (!detection) {
        setError('Face detected, but landmarks could not be found. Please ensure nothing is blocking the face (mask, hand, etc.) and lighting is good.');
        setLoading(null);
        return;
      }

      const landmarks = detection.landmarks;
      const jaw = landmarks.getJawOutline();
      // Ratios calculation
      const faceWidth = calculateDistance(jaw[0], jaw[16]);
      const faceHeight = calculateDistance(landmarks.positions[8], landmarks.positions[27]);
      const faceRatio = {
          name: "Face Shape (H/W)",
          value: faceHeight / faceWidth
      };

      const noseLength = calculateDistance(landmarks.positions[27], landmarks.positions[30]);
      const noseWidth = calculateDistance(landmarks.positions[31], landmarks.positions[35]);
      const noseRatio = {
          name: "Nose Proportions (L/W)",
          value: noseLength / noseWidth
      };

      const mouthToChin = calculateDistance(landmarks.positions[57], landmarks.positions[8]);
      const noseToMouth = calculateDistance(landmarks.positions[33], landmarks.positions[51]);
      const lipsNoseRatio = {
          name: "Lip-Chin / Nose-Lip",
          value: mouthToChin / noseToMouth
      };

      const calculatedRatios = [faceRatio, noseRatio, lipsNoseRatio];
      const scores = calculatedRatios.map(r => 1 - Math.abs(r.value - GOLDEN_RATIO) / GOLDEN_RATIO);
      const totalScore = scores.reduce((acc, score) => acc + score, 0) / scores.length;

      setResults({
          landmarks: detection.landmarks,
          ratios: calculatedRatios,
          score: totalScore
      });

    } catch (e: any) {
      console.error("Analysis Error:", e);
      if (e.message && e.message.includes('timed out')) {
          setError('Analysis took too long. Please try again with a smaller or clearer photo.');
      } else {
          setError('Could not analyze the image. Please ensure the face is clearly visible and facing forward.');
      }
    } finally {
        setLoading(null);
    }
  };

  useEffect(() => {
    if (imageSrc && imageRef.current) {
        // Wait for image to load in DOM
        if (imageRef.current.complete) {
            analyzeImage();
        } else {
            imageRef.current.onload = () => analyzeImage();
        }
    }
  }, [imageSrc]);

  useEffect(() => {
    if (results && imageRef.current && canvasRef.current) {
        const image = imageRef.current;
        const canvas = canvasRef.current;
        const { width, height } = image;
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if(!context) return;
        
        const landmarks = results.landmarks;
        const jaw = landmarks.getJawOutline();
        
        context.strokeStyle = 'rgba(0, 255, 255, 0.7)';
        context.lineWidth = 3;

        // Draw jawline
        faceapi.draw.drawContour(context, jaw);
        
        // Draw measurement lines
        // Face Height
        const p8 = landmarks.positions[8];
        const p27 = landmarks.positions[27];
        context.beginPath();
        context.moveTo(p8.x, p8.y);
        context.lineTo(p27.x, p27.y);
        context.stroke();
        
        // Face Width
        const p0 = jaw[0];
        const p16 = jaw[16];
        context.beginPath();
        context.moveTo(p0.x, p0.y);
        context.lineTo(p16.x, p16.y);
        context.stroke();
    }
  }, [results]);

  const reset = () => {
    stopVideoStream();
    setImageSrc(null);
    setResults(null);
    setError(null);
    setLoading(null);
    setMode('select');
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const reUpload = () => {
    setImageSrc(null);
    setResults(null);
    setError(null);
    setLoading(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    // Stays in 'upload' mode so guidelines show again
  };
  
  const RatioBar = ({ value }: { value: number }) => {
    const closeness = (1 - Math.abs(value - GOLDEN_RATIO) / GOLDEN_RATIO) * 100;
    return (
        <div className="w-full bg-gray-600 rounded-full h-2.5">
            <div className="bg-cyan-400 h-2.5 rounded-full" style={{ width: `${closeness}%` }}></div>
        </div>
    );
  };

  return (
    <main className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4 overflow-auto">
      <div className="w-full max-w-5xl">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-300">Facial Golden Ratio Calculator</h1>
          <p className="text-gray-400 mt-2">Discover the classic proportions of your face.</p>
        </header>
        
        {loading && (
          <div className="text-center p-8 bg-gray-800 rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
            <p className="mt-4 text-lg">{loading}</p>
          </div>
        )}

        {!loading && mode === 'select' && (
          <div className="bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700 text-center">
            <h2 className="text-2xl mb-6">Get Started</h2>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <button onClick={() => handleModeSelect('camera')} className="flex items-center justify-center bg-cyan-500 hover:bg-cyan-600 text-gray-900 font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105">
                <CameraIcon /> Use Live Camera
              </button>
              <button onClick={() => handleModeSelect('upload')} className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105">
                <UploadIcon /> Upload Photo
              </button>
            </div>
          </div>
        )}
        
        {mode === 'camera' && (
          <div className="bg-gray-800 p-4 md:p-8 rounded-2xl shadow-lg border border-gray-700 text-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-lg mx-auto rounded-lg mb-4"></video>
            <button onClick={handleCapture} className="bg-cyan-500 hover:bg-cyan-600 text-gray-900 font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105">Capture & Analyze</button>
             <button onClick={reset} className="block mt-4 text-sm text-gray-400 hover:text-white mx-auto">Cancel</button>
          </div>
        )}

        {/* Hidden File Input */}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

        {/* Upload Mode: Show Guidelines if no image selected */}
        {mode === 'upload' && !imageSrc && !loading && (
          <div>
            <PhotoGuidelines onSelectFile={handleFileClick} />
            <button onClick={reset} className="block mt-6 text-sm text-gray-400 hover:text-white mx-auto underline">Cancel and go back</button>
          </div>
        )}

        {/* Results / Error View */}
        {(mode === 'upload' && imageSrc) && (
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="relative bg-gray-800 p-4 rounded-2xl shadow-lg border border-gray-700">
                <img ref={imageRef} src={imageSrc} alt="User upload" className="w-full h-auto rounded-lg" crossOrigin="anonymous"/>
                <canvas ref={canvasRef} className="absolute top-4 left-4 w-full h-auto rounded-lg" style={{pointerEvents: 'none'}}></canvas>
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
              {results ? (
                <div>
                  <h2 className="text-2xl text-cyan-300 font-bold mb-4">Analysis Results</h2>
                  <div className="mb-6 p-4 bg-gray-700/50 rounded-lg text-center">
                    <p className="text-lg text-gray-300">Overall Score</p>
                    <p className="text-5xl font-bold text-cyan-400">{(results.score * 100).toFixed(1)}%</p>
                    <p className="text-sm text-gray-400">Closeness to the Golden Ratio</p>
                  </div>
                  <div className="space-y-4">
                    {results.ratios.map((ratio: any, index: number) => (
                      <div key={index}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-semibold text-gray-200">{ratio.name}</span>
                          <span className="text-lg font-mono text-cyan-300">{ratio.value.toFixed(3)}</span>
                        </div>
                        <RatioBar value={ratio.value} />
                        <p className="text-right text-xs text-gray-500 mt-1">Golden Ratio: {GOLDEN_RATIO}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={reset} className="w-full mt-8 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg">Analyze Another</button>
                </div>
              ) : error ? (
                <div className="text-center">
                  <h2 className="text-2xl text-red-400 font-bold mb-4">Detection Error</h2>
                  <p className="text-gray-300 mb-6">{error}</p>
                  <div className="bg-gray-900/50 p-4 rounded-lg text-left text-sm text-gray-400 mb-6">
                     <p className="font-bold mb-2">Tip: Check the guidelines</p>
                     <ul className="list-disc pl-5 space-y-1">
                       <li>Face directly towards camera</li>
                       <li>Ensure only <strong>one person</strong> is in view</li>
                       <li>Neutral expression (no smiling)</li>
                       <li>Good lighting</li>
                     </ul>
                  </div>
                   <button onClick={reUpload} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg">Try Another Photo</button>
                   <button onClick={reset} className="block mt-4 text-sm text-gray-400 hover:text-white mx-auto">Go Home</button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default App;