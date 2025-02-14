'use client';

import { useState } from 'react';
import SignatureDrawingCanvas from './components/SignatureDrawingCanvas';
import ErrorBoundary from '../components/ErrorBoundary';

export default function SignaturePage() {
  const [signatureData, setSignatureData] = useState<string>('');
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(2);

  const handleDownload = (format: 'png' | 'jpg') => {
    if (!signatureData) return;

    try {
      // Create a temporary canvas to handle the conversion
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Set canvas size to match the image
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;

        if (tempCtx) {
          if (format === 'jpg') {
            // Fill with white background for JPG
            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          }

          // Draw the signature
          tempCtx.drawImage(img, 0, 0);

          // Convert to desired format
          const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
          const dataUrl = tempCanvas.toDataURL(mimeType, 1.0);

          // Create download link
          const link = document.createElement('a');
          link.download = `signature.${format}`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      };

      img.src = signatureData;
    } catch (error) {
      console.error('Error downloading signature:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Container */}
      <div className="flex flex-col lg:flex-row justify-between">
        {/* Left Sidebar - Ad Space */}
        <div className="hidden lg:block w-64 min-h-screen bg-white p-4 border-r">
          <div className="h-[600px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <span className="text-gray-400">Ad Space</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-4 lg:mb-8">Signature Generator</h1>
            
            {/* Customization Options */}
            <div className="bg-white p-4 lg:p-6 rounded-lg shadow-md mb-4 lg:mb-6">
              <h2 className="text-lg lg:text-xl font-semibold mb-4">Customize</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Line Thickness</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={thickness}
                    onChange={(e) => setThickness(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>

            {/* Drawing Canvas */}
            <ErrorBoundary>
              <div className="bg-white p-4 lg:p-6 rounded-lg shadow-md mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-xl font-semibold mb-4">Draw Your Signature</h2>
                <div className="w-full h-[200px] lg:h-[250px]">
                  <SignatureDrawingCanvas
                    onChange={setSignatureData}
                    lineColor={color}
                    lineWidth={thickness}
                  />
                </div>
              </div>
            </ErrorBoundary>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                className="flex-1 bg-blue-500 text-white py-2 lg:py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm lg:text-base flex items-center justify-center gap-2"
                onClick={() => handleDownload('png')}
                disabled={!signatureData}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PNG (Transparent)
              </button>
              <button 
                className="flex-1 bg-green-500 text-white py-2 lg:py-3 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm lg:text-base flex items-center justify-center gap-2"
                onClick={() => handleDownload('jpg')}
                disabled={!signatureData}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download JPG (White Background)
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Ad Space */}
        <div className="hidden lg:block w-64 min-h-screen bg-white p-4 border-l">
          <div className="h-[600px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <span className="text-gray-400">Ad Space</span>
          </div>
        </div>
      </div>
    </div>
  );
} 