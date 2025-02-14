interface Point {
  x: number;
  y: number;
  pressure?: number;
}

type LetterStyle = 'formal' | 'casual' | 'artistic' | 'minimalist';

// Helper function to create a flowing curve between points
const createFlowingCurve = (points: Point[], style: LetterStyle, letterHeight: number): string => {
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    
    // Calculate control points with more horizontal flow
    const cp1x = current.x + dx * 0.5;
    let cp1y = current.y;
    const cp2x = next.x - dx * 0.2;
    let cp2y = next.y;
    
    // Add natural variation based on style
    switch (style) {
      case 'formal':
        cp1y += dy * 0.1;
        cp2y += dy * 0.1;
        break;
        
      case 'casual':
        cp1y += dy * 0.2 + (Math.random() - 0.5) * 5;
        cp2y += dy * 0.2 + (Math.random() - 0.5) * 5;
        break;
        
      case 'artistic':
        const wave = Math.sin(i * Math.PI) * letterHeight * 0.1;
        cp1y += wave;
        cp2y -= wave;
        break;
        
      case 'minimalist':
        cp1y += dy * 0.05;
        cp2y += dy * 0.05;
        break;
    }
    
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  
  return path;
};

const getConnectingPoint = (
  letter: string,
  startX: number,
  baseY: number,
  width: number,
  height: number
): Point => {
  // Determine where the next letter should connect based on the current letter
  const connectingPoints: { [key: string]: Point } = {
    'a': { x: startX + width * 0.9, y: baseY },
    'b': { x: startX + width * 0.8, y: baseY },
    'c': { x: startX + width * 0.95, y: baseY },
    'd': { x: startX + width * 0.9, y: baseY },
    'e': { x: startX + width * 0.9, y: baseY },
    'f': { x: startX + width * 0.7, y: baseY + height * 0.4 },
    'g': { x: startX + width * 0.8, y: baseY + height * 0.4 },
    'h': { x: startX + width * 0.9, y: baseY },
    'i': { x: startX + width * 0.6, y: baseY },
    'j': { x: startX + width * 0.6, y: baseY + height * 0.4 },
    'k': { x: startX + width * 0.9, y: baseY },
    'l': { x: startX + width * 0.6, y: baseY },
    'm': { x: startX + width * 1.1, y: baseY },
    'n': { x: startX + width * 0.9, y: baseY },
    'o': { x: startX + width * 0.9, y: baseY },
    'p': { x: startX + width * 0.8, y: baseY + height * 0.4 },
    'q': { x: startX + width * 0.9, y: baseY + height * 0.4 },
    'r': { x: startX + width * 0.8, y: baseY },
    's': { x: startX + width * 0.9, y: baseY },
    't': { x: startX + width * 0.7, y: baseY },
    'u': { x: startX + width * 0.9, y: baseY },
    'v': { x: startX + width * 0.9, y: baseY },
    'w': { x: startX + width * 1.1, y: baseY },
    'x': { x: startX + width * 0.9, y: baseY },
    'y': { x: startX + width * 0.8, y: baseY + height * 0.4 },
    'z': { x: startX + width * 0.9, y: baseY }
  };

  return connectingPoints[letter.toLowerCase()] || { x: startX + width * 0.9, y: baseY };
};

// Generate points for a flowing signature
export const generateSignaturePoints = (
  text: string,
  startX: number,
  startY: number,
  width: number,
  height: number,
  style: LetterStyle
): Point[] => {
  const points: Point[] = [];
  const baseY = startY + height * 0.6;
  const letterSpacing = width * 0.4;
  
  // Start with an entry flourish
  points.push({ x: startX, y: baseY });
  
  let currentX = startX;
  
  // Generate flowing points for the text
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') {
      currentX += letterSpacing * 1.5;
      continue;
    }
    
    // Create natural height variations
    const heightVar = Math.sin(i * 0.5) * height * 0.15;
    const widthVar = Math.cos(i * 0.3) * width * 0.1;
    
    // Add points for flowing curves
    points.push(
      { x: currentX + widthVar, y: baseY - heightVar },
      { x: currentX + letterSpacing * 0.3, y: baseY - height * 0.3 - heightVar },
      { x: currentX + letterSpacing * 0.7, y: baseY - height * 0.1 + heightVar },
      { x: currentX + letterSpacing, y: baseY }
    );
    
    currentX += letterSpacing;
  }
  
  // Add style-specific modifications
  switch (style) {
    case 'formal':
      // More consistent height
      points.forEach(p => {
        p.y = startY + (p.y - startY) * 0.8;
      });
      break;
      
    case 'casual':
      // Add natural variations
      points.forEach(p => {
        p.x += (Math.random() - 0.5) * width * 0.05;
        p.y += (Math.random() - 0.5) * height * 0.05;
      });
      break;
      
    case 'artistic':
      // Add flowing waves
      points.forEach((p, i) => {
        const wave = Math.sin(i * Math.PI / 4) * height * 0.1;
        p.y += wave;
      });
      break;
      
    case 'minimalist':
      // Reduce points for simpler flow
      for (let i = points.length - 1; i > 0; i--) {
        if (i % 2 === 0) {
          points.splice(i, 1);
        }
      }
      break;
  }
  
  return points;
};

// Export only the functions we're using
export const generateSignaturePath = (
  text: string,
  startX: number,
  startY: number,
  width: number,
  height: number,
  style: LetterStyle
): string => {
  const points = generateSignaturePoints(text, startX, startY, width, height, style);
  return createFlowingCurve(points, style, height);
}; 