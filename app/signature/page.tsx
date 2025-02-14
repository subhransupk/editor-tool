'use client';

import { useState } from 'react';
import SignatureDrawingCanvas from './components/SignatureDrawingCanvas';
import ErrorBoundary from '../components/ErrorBoundary';

export default function SignaturePage() {
  const [signatureData, setSignatureData] = useState<string>('');
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(2);

  const handleDownload = () => {
    if (!signatureData) return;

    try {
      const link = document.createElement('a');
      link.download = 'signature.png';
      link.href = signatureData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

            {/* Download Button */}
            <button 
              className="w-full bg-blue-500 text-white py-2 lg:py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm lg:text-base"
              onClick={handleDownload}
              disabled={!signatureData}
            >
              Download Signature
            </button>
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