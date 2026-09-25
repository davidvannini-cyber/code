/// <reference types="vite/client" />

declare module "opencascade.js" {
  export function initOpenCascade(): Promise<any>;
}
