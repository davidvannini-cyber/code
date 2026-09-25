# MODEL3D - Handoff Document

**Last Updated:** 2026-09-25  
**Status:** In Development

## Current State

MODEL3D is a functional web-based 3D CAD modeling application. The core architecture is stable and working, with the following operational:

✅ **Working Features:**
- 3D viewport with Three.js rendering
- Sketch-based modeling
- Extrude operations with parameters
- Boolean operations (Union, Difference, Intersection)
- Fillet operations
- Basic I/O (3MF format support)
- Operation history tracking and timeline
- UI cards for each operation type

⚠️ **Known Limitations:**
- Limited UI polish in some areas
- Performance optimization opportunities on large models
- Error handling could be more robust
- No undo/redo implementation yet

## Important Files & Components

### Core Architecture
- **`src/store.ts`** - Zustand state store (model, operations, history)
- **`src/App.tsx`** - Root component layout
- **`src/components/Viewport.tsx`** - Main 3D scene renderer
- **`src/occ/occClient.ts`** - Interface to OpenCascade.js
- **`src/occ/occWorker.ts`** - Web Worker for heavy OCC computations

### UI Components
- **`src/components/TopBar.tsx`** - Header with model info
- **`src/components/Rail.tsx`** - Sidebar with operations panel
- **`src/components/cards/`** - Individual operation UI (Sketch, Extrude, Boolean, etc.)
- **`src/components/HistoryStrip.tsx`** - Timeline visualization

### Data & Utilities
- **`src/io/threeMF.ts`** - 3MF format export/import
- **`src/utils/sketchShapes.ts`** - Sketch geometry helper functions
- **`src/occ/types.ts`** - TypeScript type definitions

## Architecture Overview

```
User Interaction (UI Cards)
        ↓
   Zustand Store (src/store.ts)
        ↓
   OCC Client (src/occ/occClient.ts)
        ↓
   Web Worker (src/occ/occWorker.ts) ← Heavy computation
        ↓
   Three.js Scene (Viewport.tsx)
        ↓
   Display in Browser
```

## Development Notes

### State Management
- All model state lives in Zustand store (`src/store.ts`)
- Operations are immutable - each operation creates a new model state
- History is tracked as a list of operations

### OpenCascade.js Integration
- Heavy OCC computations run in a Web Worker (`src/occ/occWorker.ts`)
- Main thread communicates via `occClient.ts`
- This prevents UI freezing during long computations

### Web Worker Setup
- The worker loads `opencascade.js` dynamically
- Message passing for operation requests and results
- Error handling with fallback to main thread (if needed)

## Common Tasks

### Adding a New Operation
1. Add operation type to `src/occ/types.ts`
2. Create operation handler in `src/occ/occWorker.ts`
3. Create UI card in `src/components/cards/NewOpCard.tsx`
4. Add card to operation panel in `src/components/Rail.tsx`
5. Connect to store actions

### Debugging
- Check browser DevTools console for OCC errors
- Use React DevTools to inspect store state
- Use Three.js DevTools for scene inspection
- Check Web Worker messages in DevTools

### Performance Issues
- Monitor Web Worker CPU usage
- Profile with DevTools Performance tab
- Consider mesh simplification for large models
- Cache computed meshes where possible

## Dependencies & Versions

Key dependencies (see `package.json` for full list):
- React 18.3 - UI framework
- Three.js 0.169 - 3D rendering
- OpenCascade.js 1.1 - CAD kernel
- Zustand 4.5 - State management
- TypeScript 5.6 - Language
- Vite 5.4 - Build tool

## Next Steps / TODO

### High Priority
- [ ] Implement undo/redo functionality
- [ ] Add more robust error handling and user feedback
- [ ] Improve performance on complex models
- [ ] Add parametric constraint system

### Medium Priority
- [ ] Support more file formats (STEP, IGES)
- [ ] Add sketch constraints visualization
- [ ] Implement model dimensioning
- [ ] Add measurement tools

### Low Priority
- [ ] UI theme customization
- [ ] Collaborative editing features
- [ ] Model library/templates
- [ ] Export to other formats (STL, OBJ)

## Running Locally

```bash
# Install
npm install

# Dev with hot reload
npm run dev

# Build
npm run build

# Preview build
npm run preview
```

## Deployment Notes

- Build output: `dist/` directory
- No backend required - fully client-side
- Static hosting (Netlify, Vercel, etc.) compatible
- Web Worker requires proper CORS/Content-Type headers

## Contact & Context

Created as a web-based CAD modeling tool exploring React + Three.js + OpenCascade.js integration.

For questions about architecture or implementation details, refer to inline code comments and this document.
