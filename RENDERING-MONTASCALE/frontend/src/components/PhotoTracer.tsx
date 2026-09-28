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

const LOUPE_SIZE = 180; // px, dimensione del riquadro della lente
const LOUPE_ZOOM = 5; // fattore di ingrandimento

/**
 * Overlay di tracciamento. Due modalità:
 * - "steps": l'utente clicca alternando bordo SINISTRO e DESTRO di ogni
 *   gradino visibile, dal basso verso l'alto. Servono almeno 2 gradini
 *   (4 punti) per una stima di posa camera ben posta; 3-4 gradini (6-8
 *   punti) danno risultati più robusti.
 * - "floor": un singolo click su un punto del pavimento orizzontale alla
 *   base della rampa (NON sul gradino) — rompe l'ambiguità planare del PnP.
 *
 * Include una lente d'ingrandimento che segue il cursore: la precisione del
 * click (specialmente per il punto pavimento) si è dimostrata il fattore
 * dominante nell'affidabilità della stima — un errore di pochi pixel sullo
 * schermo può far esplodere l'errore di riproiezione (verificato su foto
 * reali). La lente rende visibili i singoli pixel dell'immagine originale
 * prima del click, senza dover zoomare manualmente il browser.
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
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [loupeVisible, setLoupeVisible] = useState(false);
  const [loupeScreenPos, setLoupeScreenPos] = useState({ x: 0, y: 0 });

  const handleImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const size = { width: img.naturalWidth, height: img.naturalHeight };
    setNaturalSize(size);
    onImageLoad?.(size.width, size.height);
  }, [onImageLoad]);

  const naturalFromEvent = (e: React.MouseEvent) => {
    const img = imgRef.current;
    if (!img || naturalSize.width === 0) return null;
    const rect = img.getBoundingClientRect();
    const scaleX = naturalSize.width / rect.width;
    const scaleY = naturalSize.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      rect,
    };
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = naturalFromEvent(e);
    if (!p) return;
    if (mode === 'floor') {
      onFloorPointChange({ x: p.x, y: p.y });
    } else {
      onPointsChange([...points, { x: p.x, y: p.y }]);
    }
  };

  const drawLoupe = useCallback((naturalX: number, naturalY: number) => {
    const img = imgRef.current;
    const canvas = loupeCanvasRef.current;
    if (!img || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const srcHalf = LOUPE_SIZE / 2 / LOUPE_ZOOM;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
    ctx.drawImage(
      img,
      naturalX - srcHalf,
      naturalY - srcHalf,
      srcHalf * 2,
      srcHalf * 2,
      0,
      0,
      LOUPE_SIZE,
      LOUPE_SIZE,
    );
    // Crosshair al centro: indica il punto esatto che verrebbe registrato al click
    ctx.strokeStyle = mode === 'floor' ? '#4dabf7' : '#ffd93d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(LOUPE_SIZE / 2, 0);
    ctx.lineTo(LOUPE_SIZE / 2, LOUPE_SIZE);
    ctx.moveTo(0, LOUPE_SIZE / 2);
    ctx.lineTo(LOUPE_SIZE, LOUPE_SIZE / 2);
    ctx.stroke();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(LOUPE_SIZE / 2 - 4, LOUPE_SIZE / 2 - 4, 8, 8);
  }, [mode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = naturalFromEvent(e);
    if (!p) return;
    setLoupeVisible(true);
    // Posiziona la lente vicino al cursore ma spostata per non coprirlo,
    // e la sposta dall'altro lato se troppo vicina ai bordi del contenitore.
    const offset = 24;
    let lx = e.clientX - p.rect.left + offset;
    let ly = e.clientY - p.rect.top - LOUPE_SIZE - offset;
    if (ly < 0) ly = e.clientY - p.rect.top + offset;
    if (lx + LOUPE_SIZE > p.rect.width) lx = e.clientX - p.rect.left - LOUPE_SIZE - offset;
    setLoupeScreenPos({ x: lx, y: ly });
    drawLoupe(p.x, p.y);
  };

  const undoLast = () => onPointsChange(points.slice(0, -1));
  const clearAll = () => onPointsChange([]);

  const currentStepIndex = Math.floor(points.length / 2);
  const isLeftNext = points.length % 2 === 0;

  return (
    <div>
      <div
        style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setLoupeVisible(false)}
      >
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
        <canvas
          ref={loupeCanvasRef}
          width={LOUPE_SIZE}
          height={LOUPE_SIZE}
          style={{
            position: 'absolute',
            left: loupeScreenPos.x,
            top: loupeScreenPos.y,
            width: LOUPE_SIZE,
            height: LOUPE_SIZE,
            borderRadius: '50%',
            border: '3px solid white',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            display: loupeVisible ? 'block' : 'none',
          }}
        />
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
