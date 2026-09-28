import { useRef, useState, useCallback } from 'react';

export interface TracedPoint {
  x: number; // pixel, coordinate immagine originale (non scalate)
  y: number;
}

interface PhotoTracerProps {
  imageUrl: string;
  onImageLoad?: (width: number, height: number) => void;
  points: TracedPoint[];
  onPointsChange: (points: TracedPoint[]) => void;
  /** Modalità corrente: tracciamento gradini, o punto di riferimento pavimento. */
  mode: 'steps' | 'floor';
  floorPoint: TracedPoint | null;
  onFloorPointChange: (point: TracedPoint | null) => void;
  /** Contenuto extra sovrapposto all'area immagine (es. canvas Three.js). */
  overlay?: React.ReactNode;
}

/**
 * Overlay di tracciamento. Due modalità:
 * - "steps": l'utente clicca alternando bordo SINISTRO e DESTRO di ogni
 *   gradino visibile, dal basso verso l'alto. Servono almeno 2 gradini
 *   (4 punti) per una stima di posa camera ben posta; 3-4 gradini (6-8
 *   punti) danno risultati più robusti.
 * - "floor": un singolo click su un punto del pavimento orizzontale alla
 *   base della rampa (NON sul gradino) — rompe l'ambiguità planare del PnP.
 */
export function PhotoTracer({
  imageUrl,
  onImageLoad,
  points,
  onPointsChange,
  mode,
  floorPoint,
  onFloorPointChange,
  overlay,
}: PhotoTracerProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const handleImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const size = { width: img.naturalWidth, height: img.naturalHeight };
    setNaturalSize(size);
    onImageLoad?.(size.width, size.height);
  }, [onImageLoad]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    if (!img || naturalSize.width === 0) return;
    const rect = img.getBoundingClientRect();
    const scaleX = naturalSize.width / rect.width;
    const scaleY = naturalSize.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    if (mode === 'floor') {
      onFloorPointChange({ x, y });
    } else {
      onPointsChange([...points, { x, y }]);
    }
  };

  const undoLast = () => onPointsChange(points.slice(0, -1));
  const clearAll = () => onPointsChange([]);

  const currentStepIndex = Math.floor(points.length / 2);
  const isLeftNext = points.length % 2 === 0;

  return (
    <div>
      <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
        <img
          ref={imgRef}
          src={imageUrl}
          onLoad={handleImgLoad}
          onClick={handleClick}
          style={{ maxWidth: '100%', display: 'block', cursor: 'crosshair' }}
          alt="Foto scala da tracciare"
        />
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
        >
          {points.map((p, i) => {
            const stepIdx = Math.floor(i / 2);
            const isLeft = i % 2 === 0;
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={naturalSize.width * 0.006}
                  fill={isLeft ? '#3ddc84' : '#ff6b6b'}
                  stroke="white"
                  strokeWidth={naturalSize.width * 0.001}
                />
                <text
                  x={p.x}
                  y={p.y - naturalSize.width * 0.012}
                  fontSize={naturalSize.width * 0.018}
                  fill="white"
                  stroke="black"
                  strokeWidth={naturalSize.width * 0.001}
                  textAnchor="middle"
                >
                  {stepIdx}
                  {isLeft ? 'S' : 'D'}
                </text>
              </g>
            );
          })}
          {Array.from({ length: Math.floor(points.length / 2) }).map((_, i) => {
            const l = points[i * 2];
            const r = points[i * 2 + 1];
            if (!l || !r) return null;
            return (
              <line
                key={`link-${i}`}
                x1={l.x}
                y1={l.y}
                x2={r.x}
                y2={r.y}
                stroke="#ffd93d"
                strokeWidth={naturalSize.width * 0.002}
              />
            );
          })}
          {floorPoint && (
            <g>
              <circle
                cx={floorPoint.x}
                cy={floorPoint.y}
                r={naturalSize.width * 0.008}
                fill="#4dabf7"
                stroke="white"
                strokeWidth={naturalSize.width * 0.0015}
              />
              <text
                x={floorPoint.x}
                y={floorPoint.y - naturalSize.width * 0.014}
                fontSize={naturalSize.width * 0.018}
                fill="white"
                stroke="black"
                strokeWidth={naturalSize.width * 0.001}
                textAnchor="middle"
              >
                PAVIMENTO
              </text>
            </g>
          )}
        </svg>
        {overlay}
      </div>
      {mode === 'steps' ? (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>
            Gradino {currentStepIndex} — prossimo click: bordo <b>{isLeftNext ? 'SINISTRO' : 'DESTRO'}</b>
          </span>
          <button onClick={undoLast} disabled={points.length === 0}>
            Annulla ultimo
          </button>
          <button onClick={clearAll} disabled={points.length === 0}>
            Azzera
          </button>
          <span>{points.length} punti tracciati ({Math.floor(points.length / 2)} gradini)</span>
        </div>
      ) : (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>
            Clicca il punto esatto dove la faccia verticale del <b>primo gradino (0)</b> tocca il
            pavimento (proprio sotto ai punti 0S/0D)
          </span>
          <button onClick={() => onFloorPointChange(null)} disabled={!floorPoint}>
            Annulla
          </button>
          <span>{floorPoint ? '✓ punto pavimento tracciato' : 'nessun punto ancora tracciato'}</span>
        </div>
      )}
    </div>
  );
}
