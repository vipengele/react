// A downstream consumer importing only `DataTable`: the positive control proving that the
// DataTable and `@tanstack/table-core` markers `run.mjs` asserts absent from the Button bundle do
// appear in a bundle that genuinely needs them.
export { DataTable } from "../dist/index.js";
