# MODEL3D

A web-based 3D CAD modeling application with real-time visualization and parametric design capabilities.

## Overview

MODEL3D is a browser-based 3D modeling tool that combines the power of:
- **Three.js** for high-performance 3D graphics rendering
- **OpenCascade.js** for robust CAD kernel operations
- **React** for modern UI components and state management
- **TypeScript** for type-safe development

The application supports sketching, extruding, boolean operations (union, difference, intersection), fillets, and model I/O (3MF format).

## Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
npm install
```

### Development

Start the development server with hot reload:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Production build output goes to `dist/`

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # React UI components
│   ├── cards/          # Operation cards (Sketch, Extrude, Boolean, etc.)
│   ├── icons/          # SVG icon components
│   ├── Viewport.tsx    # Main 3D viewport
│   ├── TopBar.tsx      # Header with model info
│   ├── Rail.tsx        # Sidebar with operation history
│   ├── HistoryStrip.tsx # Timeline of operations
│   └── [other components]
├── occ/                # OpenCascade.js integration
│   ├── occClient.ts    # Main OCC client
│   ├── occWorker.ts    # Web Worker for OCC operations
│   └── types.ts        # Type definitions
├── io/                 # Import/Export functionality
│   └── threeMF.ts      # 3MF format support
├── utils/              # Utility functions
│   └── sketchShapes.ts # Sketch geometry utilities
├── store.ts            # Zustand state management
├── App.tsx             # Root component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Technologies

- **React** 18.3 - UI framework
- **Three.js** 0.169 - 3D graphics
- **@react-three/fiber** 8.17 - React renderer for Three.js
- **@react-three/drei** 9.114 - Useful Three.js helpers
- **OpenCascade.js** 1.1 - CAD kernel
- **Zustand** 4.5 - State management
- **TypeScript** 5.6 - Language
- **Vite** 5.4 - Build tool

## Key Features

- 📐 Sketch-based modeling
- ⬆️ Extrude operations
- 🔧 Boolean operations (Union, Difference, Intersection)
- 🎯 Fillet and chamfer tools
- 💾 3MF format import/export
- 🎨 Real-time 3D visualization
- ⏱️ Operation history and timeline
- 🎮 Interactive viewport controls

## Development Workflow

1. Make changes in `src/`
2. Hot reload is automatic in dev mode
3. Check TypeScript: `npm run build` (includes type checking)
4. For production: `npm run build && npm run preview`

## Notes

- The app uses Web Workers for heavy OpenCascade.js computations (see `src/occ/occWorker.ts`)
- State is managed with Zustand (see `src/store.ts`)
- 3D rendering uses Three.js via react-three-fiber
- The viewport supports standard CAD navigation (pan, zoom, rotate)

## License

(Add license info here)
