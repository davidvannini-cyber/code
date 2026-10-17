import type { WorkerRequest, WorkerResponse, ExportFormat, ShapeExportRef, Feature, LiveBody } from "./types";

type Pending = { resolve: (v: any) => void; reject: (e: any) => void };

class OccClient {
  private worker: Worker;
  private pending = new Map<string, Pending>();
  private counter = 0;
  private readyPromise: Promise<void>;

  constructor() {
    this.worker = new Worker(new URL("./occWorker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (ev: MessageEvent<WorkerResponse>) => this.onMessage(ev.data);
    // A WASM abort or uncaught worker error never posts a reply: reject every
    // pending request so the UI does not stay busy forever.
    const fail = (reason: string) => {
      for (const p of this.pending.values()) p.reject(new Error(reason));
      this.pending.clear();
    };
    this.worker.onerror = (ev) => fail(`Errore nel worker geometrico: ${ev.message ?? "sconosciuto"}`);
    this.worker.onmessageerror = () => fail("Messaggio del worker geometrico non leggibile");
    this.readyPromise = this.send({ type: "init" } as any).then(() => undefined);
  }

  whenReady() {
    return this.readyPromise;
  }

  private onMessage(msg: WorkerResponse) {
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    this.pending.delete(msg.id);
    if (msg.type === "error") {
      pending.reject(new Error(msg.payload.message));
    } else {
      pending.resolve(msg);
    }
  }

  private send(partial: Omit<WorkerRequest, "id">): Promise<WorkerResponse> {
    const id = `req_${this.counter++}`;
    const req = { ...partial, id } as WorkerRequest;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(req);
    });
  }

  async rebuild(features: Feature[], placements: Record<string, number[]>): Promise<{ bodies: LiveBody[]; warnings: string[] }> {
    const res = (await this.send({ type: "rebuild", payload: { features, placements } } as any)) as any;
    const bodies: LiveBody[] = res.payload.bodies.map((b: any) => ({
      bodyId: b.bodyId,
      mesh: {
        positions: new Float32Array(b.mesh.positions),
        indices: new Uint32Array(b.mesh.indices)
      },
      edges: b.edges,
      faceRanges: b.faceRanges
    }));
    return { bodies, warnings: res.payload.warnings };
  }

  async exportFile(format: ExportFormat, shapes: ShapeExportRef[]): Promise<{ data: Uint8Array; filename: string; mime: string }> {
    const res = (await this.send({ type: "exportFile", payload: { format, shapes } } as any)) as any;
    return { data: new Uint8Array(res.payload.data), filename: res.payload.filename, mime: res.payload.mime };
  }
}

export const occClient = new OccClient();
