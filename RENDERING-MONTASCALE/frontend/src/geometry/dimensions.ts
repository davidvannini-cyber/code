/**
 * Dimensioni del montascale "Facile Robusta per esterno".
 *
 * Valori reali forniti dal cliente (scheda tecnica / misure dirette) dove
 * disponibili; i pochi campi non forniti restano stime placeholder,
 * segnalate esplicitamente nei commenti. Unità: millimetri.
 *
 * Questo è l'UNICO file da modificare per aggiornare le proporzioni del
 * proxy 3D: tutta la geometria parametrica (rail + chair) legge da qui.
 */

export const railDimensions = {
  /** Diametro di un singolo tubo (tubolare acciaio) */
  tubeDiameter: 38,
  /**
   * Interasse tra i due tubi (centro-centro). I due tubi sono impilati nel
   * piano verticale di marcia (pignone+cremagliera su due livelli), NON
   * affiancati lateralmente sulla larghezza della rampa.
   */
  tubeSpacing: 170,
  /**
   * Altezza montante dal pavimento al filo inferiore del tubo più basso.
   * Range reale dichiarato: 100-125mm; uso valore medio come default.
   */
  postHeight: 115,
  /** Diametro montanti verticali — NON misurato, stima da foto. */
  postDiameter: 50,
  /**
   * Passo tra montanti consecutivi: un supporto ogni 2-3 gradini
   * (~60-90cm interasse lineare su rettilineo); più fitto in curva.
   * Uso valore medio come default per il rettilineo.
   */
  postSpacing: 750,
  /** Piastrina di fissaggio a pavimento (largh x prof), spessore stimato. */
  postBaseSize: { width: 120, depth: 60, thickness: 15 },
} as const;

export const chairDimensions = {
  /** Larghezza pannello schienale/seduta "puro" (esclusi braccioli) */
  seatWidth: 450,
  /** Distanza tra i braccioli (inviluppo esterno seduta) */
  armrestSpan: 575,
  /** Profondità seduta — 390mm fisso (mod. Style); Smart regolabile 360-425mm */
  seatDepth: 390,
  /** Spessore del cuscino seduta — NON misurato, stima. */
  seatThickness: 80,
  /** Altezza schienale (da seduta a top) */
  backrestHeight: 400,
  /** Spessore schienale — NON misurato, stima. */
  backrestThickness: 100,
  /**
   * Altezza seduta da terra in posizione d'uso: regolabile in
   * installazione 430-520mm (pedana + ~70mm minimi di stacco).
   * Uso valore medio come default.
   */
  seatHeightFromRail: 475,
  /** Lunghezza bracciolo (punto rotazione-estremità) */
  armrestLength: 360,
  /** Altezza braccioli sopra il piano seduta — NON misurata, stima. */
  armrestHeight: 200,
  /** Dimensioni poggiapiedi (largh x prof) */
  footrestSize: { width: 310, depth: 260 },
  /** Ingombro blocco motore/centralina (largh x prof x altezza) */
  carriageSize: { width: 395, depth: 250, height: 415 },
  /** Ingombro massimo dalla parete a poltroncina ripiegata (verifica clearance) */
  foldedWallClearance: 405,
  /** Estensione massima dalla parete a poltroncina aperta + pedana abbassata */
  openMaxReachFromWall: 695,
} as const;

/**
 * Geometria assunta della rampa scala, usata per costruire i punti 3D
 * corrispondenti ai punti tracciati dall'utente sulla foto (stima camera
 * pose via PnP). Valori standard italiani, regolabili in UI per-progetto.
 */
export const stairAssumptions = {
  /** Alzata gradino (altezza singolo scalino) */
  riserHeight: 170,
  /** Pedata gradino (profondità singolo scalino) */
  treadDepth: 280,
  /**
   * Larghezza rampa (distanza tra i due punti tracciati su ogni gradino,
   * bordo sinistro e destro del bordo/nosing visibile nella foto).
   * Serve a rendere i punti 3D assunti complanari-ma-non-allineati,
   * requisito per una stima PnP ben posta (con soli punti allineati lungo
   * la linea di salita la posa camera è indeterminata).
   */
  stairWidth: 900,
} as const;
