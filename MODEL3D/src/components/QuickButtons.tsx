import { useEditorStore } from "../store";
import { Icon } from "./icons/Icon";

// Two semi-transparent floating buttons for touch devices, where there is no
// keyboard: undo, and "exit" (the Esc key: leaves sketch / pick tools, clears the selection).
export function QuickButtons() {
  const undo = useEditorStore((s) => s.undo);
  const canUndo = useEditorStore((s) => s.undoStack.length > 0);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  return (
    <div className="quick-buttons">
      <button disabled={!canUndo} title="Annulla" onClick={undo}>
        <Icon name="undo" size={20} />
      </button>
      <button title="Esci dallo strumento" onClick={clearSelection}>
        <Icon name="close" size={20} />
      </button>
    </div>
  );
}
