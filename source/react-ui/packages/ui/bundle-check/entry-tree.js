// A second downstream consumer importing only `Tree`: the positive control proving that the
// Tree and `@tanstack/virtual-core` markers `run.mjs` asserts absent from the Button bundle do
// appear in a bundle that genuinely needs them.
export { Tree } from "../dist/index.js";
