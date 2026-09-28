import { useCallback, useMemo, useState } from 'react';
import { PhotoTracer, type TracedPoint } from './components/PhotoTracer';
import { ThreeViewer } from './components/ThreeViewer';
import { buildAssumedPath3D, buildFloorReferencePoint3D } from './geometry/path';
import { estimateCameraPose, type CameraPoseResult } from './lib/pnp';
import './App.css';

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [points, setPoints] = useState<TracedPoint[]>([]);
  const [floorPoint, setFloorPoint] = useState<TracedPoint | null>(null);
  const [mode, setMode] = useState<'steps' | 'floor'>('steps');
  const [cameraPose, setCameraPose] = useState<CameraPoseResult | null>(null);
  const [assumedFovXDeg, setAssumedFovXDeg] = useState(65);
  const [chairStepIndex, setChairStepIndex] = useState(0);
  const [status, setStatus] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setPoints([]);
    setFloorPoint(null);
    setMode('steps');
    setCameraPose(null);
    setStatus('');
  };

  const stepCount = Math.floor(points.length / 2);
  const pairedPathMm = useMemo(() => buildAssumedPath3D(stepCount), [stepCount]);
  const floorPoint3DMm = useMemo(() => buildFloorReferencePoint3D(), []);

  const canEstimate = stepCount >= 2 && floorPoint !== null;

  const handleGenerate = useCallback(async () => {
    if (!canEstimate || imageSize.width === 0 || !floorPoint) return;
    setStatus('Stima posa camera in corso...');
    const objectPointsMm = [...pairedPathMm, floorPoint3DMm];
    const objectPointsM: [number, number, number][] = objectPointsMm.map(
      ([x, y, z]) => [x / 1000, y / 1000, z / 1000],
    );
    const imagePoints: [number, number][] = [
      ...points.map((p) => [p.x, p.y] as [number, number]),
      [floorPoint.x, floorPoint.y],
    ];
    const pose = await estimateCameraPose(
      objectPointsM,
      imagePoints,
      imageSize.width,
      imageSize.height,
      assumedFovXDeg,
    );
    if (!pose) {
      setStatus('Stima fallita — prova a tracciare più gradini o punti più precisi.');
      setCameraPose(null);
      return;
    }
    setCameraPose(pose);
    const err = pose.meanReprojectionErrorPx;
    if (err > 40) {
      setStatus(
        `⚠️ Stima poco affidabile (errore medio ${err.toFixed(0)}px) — il punto pavimento o i bordi ` +
          `gradino tracciati sono probabilmente imprecisi. Prova ad azzerare e ritracciare con più cura, ` +
          `zoomando sulla foto se possibile.`,
      );
    } else {
      setStatus(
        `Posa camera stimata (errore medio ${err.toFixed(1)}px). ` +
          `Regola il FOV se la prospettiva non combacia.`,
      );
    }
  }, [canEstimate, imageSize, pairedPathMm, floorPoint3DMm, points, floorPoint, assumedFovXDeg]);

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1>RENDERING MONTASCALE — Prototipo tracciamento + posa camera</h1>
      <p>
        Passo 1: carica una foto della scala e traccia i bordi sinistro/destro di almeno 2
        gradini (meglio 3-4). Passo 2: traccia il punto esatto dove l'alzata del primo
        gradino tocca il pavimento (necessario per una stima di prospettiva affidabile).
        Poi genera l'anteprima 3D.
      </p>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {imageUrl && (
        <div style={{ marginTop: 16 }}>
          {stepCount >= 2 && (
            <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
              <button
                onClick={() => setMode('steps')}
                disabled={mode === 'steps'}
                style={{ fontWeight: mode === 'steps' ? 'bold' : 'normal' }}
              >
                1. Gradini
              </button>
              <button
                onClick={() => setMode('floor')}
                disabled={mode === 'floor'}
                style={{ fontWeight: mode === 'floor' ? 'bold' : 'normal' }}
              >
                2. Punto pavimento
              </button>
            </div>
          )}

          <PhotoTracer
            imageUrl={imageUrl}
            onImageLoad={(w, h) => setImageSize({ width: w, height: h })}
            points={points}
            onPointsChange={setPoints}
            mode={stepCount >= 2 ? mode : 'steps'}
            floorPoint={floorPoint}
            onFloorPointChange={setFloorPoint}
            overlay={
              cameraPose && imageSize.width > 0 ? (
                <ThreeViewer
                  pairedPathMm={pairedPathMm}
                  cameraPose={cameraPose}
                  imageAspect={imageSize.width / imageSize.height}
                  chairAtStepIndex={chairStepIndex}
                />
              ) : null
            }
          />

          <div style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleGenerate} disabled={!canEstimate}>
              Genera anteprima 3D
            </button>
            <label>
              FOV orizzontale assunto (°):{' '}
              <input
                type="number"
                value={assumedFovXDeg}
                onChange={(e) => setAssumedFovXDeg(Number(e.target.value))}
                style={{ width: 60 }}
              />
            </label>
            <label>
              Gradino poltroncina:{' '}
              <input
                type="number"
                min={0}
                max={Math.max(0, stepCount - 1)}
                value={chairStepIndex}
                onChange={(e) => setChairStepIndex(Number(e.target.value))}
                style={{ width: 50 }}
              />
            </label>
          </div>
          {status && <p style={{ marginTop: 8 }}>{status}</p>}
        </div>
      )}
    </div>
  );
}

export default App;
