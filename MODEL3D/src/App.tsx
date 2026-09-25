import { useEffect } from "react";
import { Viewport } from "./components/Viewport";
import { Rail } from "./components/Rail";
import { TopBar } from "./components/TopBar";
import { HistoryStrip } from "./components/HistoryStrip";
import { IconSprite } from "./components/icons/IconSprite";
import { useEditorStore } from "./store";

export default function App() {
  const initEngine = useEditorStore((s) => s.initEngine);
  const engineReady = useEditorStore((s) => s.engineReady);
  const logs = useEditorStore((s) => s.logs);

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  return (
    <div className="app">
      <IconSprite />
      <Viewport />
      <TopBar />
      <Rail />
      <HistoryStrip />

      {logs.length > 0 && (
        <div className="log-toast">
          {logs.slice(-2).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}

      {!engineReady && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Caricamento del motore CAD (WebAssembly)…</p>
        </div>
      )}
    </div>
  );
}
