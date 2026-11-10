import { useEditorStore, type ViewFace } from "../store";

const FACES: { face: ViewFace; label: string }[] = [
  { face: "front", label: "DAVANTI" },
  { face: "back", label: "DIETRO" },
  { face: "right", label: "DESTRA" },
  { face: "left", label: "SINISTRA" },
  { face: "top", label: "SOPRA" },
  { face: "bottom", label: "SOTTO" }
];

// Floating 3D cube, top right. It turns like the scene (ViewController writes its
// transform); a click on a face moves the view to look at the scene from that side.
// The button under it frames everything that is on the platform.
// Layout: provvisorio, scelto da ?cubo=a|b|c nell'indirizzo (per confrontare le bozze).
function layoutFromUrl(): string {
  try {
    const v = new URLSearchParams(window.location.search).get("cubo");
    return v === "b" || v === "c" ? v : "a";
  } catch {
    return "a";
  }
}

export function ViewCube() {
  const requestView = useEditorStore((s) => s.requestView);
  return (
    <div className="viewcube-wrap" data-layout={layoutFromUrl()}>
      <div className="viewcube-stage">
        <div id="viewcube-3d" className="viewcube">
          {FACES.map(({ face, label }) => (
            <button key={face} className={`vc-face vc-${face}`} title={`Guarda da ${label.toLowerCase()}`} onClick={() => requestView({ kind: "face", face })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <button className="viewcube-fit" title="Mostra tutto (inquadra il contenuto della piattaforma)" onClick={() => requestView({ kind: "fit" })}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
        <span>Mostra tutto</span>
      </button>
    </div>
  );
}
