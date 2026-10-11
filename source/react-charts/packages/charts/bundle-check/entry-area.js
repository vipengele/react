// A minimal downstream consumer of `AreaChart` alone, from the package's built `dist/` output: the
// counterpart of `entry.js`, proving the two chart types tree-shake independently of each other.
export { AreaChart } from "../dist/index.js";
