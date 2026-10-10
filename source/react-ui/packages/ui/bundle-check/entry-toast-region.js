// A downstream consumer importing only `ToastRegion`: the positive control proving the toast
// stylesheet marker `run.mjs` asserts absent from the Button and toaster-only bundles does appear
// in a bundle that renders the region.
export { ToastRegion } from "../dist/index.js";
