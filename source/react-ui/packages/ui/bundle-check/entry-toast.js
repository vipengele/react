// A downstream consumer that raises toasts but mounts no region: the positive control proving the
// toaster's code does appear in a bundle that uses it, and that the region's stylesheet does not
// travel with it.
export { createToaster, toast } from "../dist/index.js";
