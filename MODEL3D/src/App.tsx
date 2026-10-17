import { useEffect } from "react";
import { Viewport } from "./components/Viewport";
import { Rail } from "./components/Rail";
import { FloatingDock } from "./components/FloatingDock";
import { QuickButtons } from "./components/QuickButtons";
import { RestoreBanner } from "./components/RestoreBanner";
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

  // Automatic copy in the browser ~1.5 s after the last change, and right away when
  // the page is hidden (switching app on a tablet can end the tab without notice).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => useEditorStore.getState().tickAutosave();
    const unsubscribe = useEditorStore.subscribe((s, prev) => {
      if (s.features !== prev.features || s.placements !== prev.placements || s.colors !== prev.colors) {
        clearTimeout(timer);
        timer = setTimeout(tick, 1500);
      }
    });
    const onHide = () => document.visibilityState === "hidden" && tick();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", tick);
    return () => {
      unsubscribe();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", tick);
    };
  }, []);

  // Esc leaves whatever tool is active (free-hand sketch, pick modes, selection).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useEditorStore.getState().clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <IconSprite />
      <Viewport />
      <TopBar />
      <Rail />
      <FloatingDock />
      <QuickButtons />
      <RestoreBanner />
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
