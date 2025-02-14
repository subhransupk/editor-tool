# E-Signature Drawing Canvas

A modern, responsive e-signature drawing component built with Next.js and TypeScript. This component provides a smooth and natural signature drawing experience with features like pressure sensitivity, velocity-based line width, and full-screen mode.

## Features

- Smooth, natural drawing experience
- Pressure sensitivity support
- Velocity-based line width
- Full-screen drawing mode
- Mobile responsive
- Touch and pen input support
- Clear and download functionality
- Error boundary protection
- High DPI display support

## Technologies Used

- Next.js
- TypeScript
- React
- Tailwind CSS

## Getting Started

1. Clone the repository:
```bash
git clone [your-repo-url]
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

```typescript
import SignatureDrawingCanvas from './components/SignatureDrawingCanvas';

function App() {
  const handleSignatureChange = (signatureData: string) => {
    // Handle the signature data (base64 string)
    console.log(signatureData);
  };

  return (
    <SignatureDrawingCanvas
      onChange={handleSignatureChange}
      lineColor="#000000"
      lineWidth={2}
    />
  );
}
```

## Props

- `onChange`: Callback function that receives the signature data as a base64 string
- `width`: Canvas width (default: 800)
- `height`: Canvas height (default: 200)
- `lineColor`: Color of the signature line (default: "#000000")
- `lineWidth`: Base width of the signature line (default: 2)

## License

MIT
