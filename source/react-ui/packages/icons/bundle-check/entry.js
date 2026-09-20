// A minimal downstream consumer: imports exactly one icon from the package's built `dist/`
// output. The bundle produced from this file is what proves — or disproves — tree-shaking,
// not anything about the package's own build.
export { ChevronDown } from "../dist/index.js";
