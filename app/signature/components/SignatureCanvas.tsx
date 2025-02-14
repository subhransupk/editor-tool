'use client';

import { useEffect, useRef } from 'react';
import { generateSignature } from '../utils/signatureGenerator';

interface SignatureCanvasProps {
  name: {
    firstName: string;
    middleName: string;
    lastName: string;
  };
  options: {
    style: 'formal' | 'casual' | 'artistic' | 'minimalist';
    size: number;
    thickness: number;
    slant: number;
    color: string;
  };
}

export default function SignatureCanvas({ name, options }: SignatureCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const fullName = [name.firstName, name.middleName, name.lastName]
      .filter(Boolean)
      .join(' ');

    if (!fullName) return;

    // Generate the signature path
    const path = generateSignature(
      fullName,
      50, // startX
      100, // startY
      700, // width
      options.size, // height
      options.style
    );

    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', path);
    svgPath.setAttribute('stroke', options.color);
    svgPath.setAttribute('stroke-width', options.thickness.toString());
    svgPath.setAttribute('fill', 'none');
    
    // Add stroke variations for more natural look
    svgPath.setAttribute('stroke-linecap', 'round');
    svgPath.setAttribute('stroke-linejoin', 'round');
    
    // Apply pressure simulation
    const totalLength = svgPath.getTotalLength();
    svgPath.style.strokeDasharray = totalLength.toString();
    svgPath.style.strokeDashoffset = '0';
    
    // Apply slant transformation
    const transform = `
      translate(400, 100)
      skewX(${-options.slant})
      translate(-400, -100)
    `;
    svgPath.setAttribute('transform', transform);
    
    // Clear previous paths
    while (svgRef.current.firstChild) {
      svgRef.current.removeChild(svgRef.current.firstChild);
    }
    
    svgRef.current.appendChild(svgPath);

    // Add animation for artistic style
    if (options.style === 'artistic') {
      svgPath.style.strokeDasharray = totalLength.toString();
      svgPath.style.strokeDashoffset = totalLength.toString();
      svgPath.style.animation = 'sign 2s ease forwards';
    }
  }, [name, options]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 800 200"
      preserveAspectRatio="xMidYMid meet"
      style={{
        maxWidth: '100%',
        height: 'auto',
        background: 'transparent',
      }}
    >
      <defs>
        <filter id="pressure">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
        </filter>
      </defs>
      <style>
        {`
          @keyframes sign {
            to {
              stroke-dashoffset: 0;
            }
          }
          path {
            filter: url(#pressure);
          }
        `}
      </style>
    </svg>
  );
} 