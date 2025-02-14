interface Point {
  x: number;
  y: number;
}

type SignatureStyle = 'formal' | 'casual' | 'artistic' | 'minimalist';

// Generate a sharp peak with a valley
const generateSharpPeak = (
  startX: number,
  startY: number,
  width: number,
  height: number,
  style: SignatureStyle
): string => {
  // Calculate peak dimensions
  const peakHeight = height * (0.7 + Math.random() * 0.3);
  const peakWidth = width * (0.8 + Math.random() * 0.2);
  const valleyWidth = width * 0.4;
  
  // Calculate points for the sharp peak
  const peakX = startX + peakWidth * 0.4;
  const peakY = startY - peakHeight;
  const valleyX = startX + peakWidth;
  const valleyY = startY - height * 0.1; // Small valley height
  
  // Create the path
  let path = '';
  
  switch (style) {
    case 'minimalist':
      // Straight lines for minimalist style
      path = `L ${peakX} ${peakY} L ${valleyX} ${valleyY}`;
      break;
      
    default:
      // Sharp peak with slight curve in valley
      const upControl = {
        x: startX + peakWidth * 0.2,
        y: startY - peakHeight * 0.3
      };
      
      const downControl = {
        x: peakX + peakWidth * 0.2,
        y: peakY + peakHeight * 0.2
      };
      
      const valleyControl = {
        x: valleyX - valleyWidth * 0.3,
        y: valleyY
      };
      
      path = `L ${peakX} ${peakY} C ${downControl.x} ${downControl.y}, ${valleyControl.x} ${valleyControl.y}, ${valleyX} ${valleyY}`;
      break;
  }
  
  return path;
};

// Generate a sequence of sharp peaks
const generatePeakSequence = (
  startX: number,
  startY: number,
  width: number,
  height: number,
  count: number,
  style: SignatureStyle
): string => {
  let path = `M ${startX} ${startY}`;
  let currentX = startX;
  const sectionWidth = width / count;
  
  for (let i = 0; i < count; i++) {
    // Vary peak width slightly
    const peakWidth = sectionWidth * (0.8 + Math.random() * 0.4);
    path += generateSharpPeak(currentX, startY, peakWidth, height, style);
    currentX += peakWidth;
  }
  
  return path;
};

// Add baseline and decorations
const addBaselineAndDecorations = (
  basePath: string,
  startX: number,
  startY: number,
  width: number,
  height: number,
  style: SignatureStyle
): string => {
  // Add baseline
  const baseline = ` M ${startX - 10} ${startY} L ${startX + width + 10} ${startY}`;
  
  let decorations = '';
  if (style === 'artistic') {
    // Add small flourish at the end
    const endX = startX + width;
    decorations = ` M ${endX} ${startY} c 20,-10 40,0 60,10`;
  }
  
  return basePath + baseline + decorations;
};

// Main signature generation function
export const generateSignature = (
  text: string,
  startX: number,
  startY: number,
  width: number,
  height: number,
  style: SignatureStyle
): string => {
  // Calculate number of peaks based on text length (fewer peaks than before)
  const peakCount = Math.max(Math.ceil(text.length * 0.8), 3);
  
  // Generate signature with sharp peaks
  let path = generatePeakSequence(
    startX,
    startY,
    width,
    height,
    peakCount,
    style
  );
  
  // Add baseline and decorations
  path = addBaselineAndDecorations(path, startX, startY, width, height, style);
  
  return path;
}; 