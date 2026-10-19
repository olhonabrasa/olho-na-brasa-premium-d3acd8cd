/// <reference types="vite/client" />
declare module "*.svg?raw" {
  const s: string;
  export default s;
}
declare module "*.css?inline" {
  const s: string;
  export default s;
}
