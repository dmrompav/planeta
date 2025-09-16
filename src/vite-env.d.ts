/// <reference types="vite/client" />

declare module 'world-atlas/*' {
  import type { Topology } from 'topojson-specification';
  const topo: Topology;
  export default topo;
}
