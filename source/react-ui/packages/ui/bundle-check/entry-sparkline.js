// A downstream consumer importing only `Sparkline`: the positive control proving the Sparkline
// stylesheet marker `run.mjs` asserts absent from the Button bundle does appear in a bundle that
// renders it, and that nothing beyond it travels along.
export { Sparkline } from "../dist/index.js";
