// A downstream consumer that imports `toast` and never calls it. The bundle must hold no toaster
// code: the default toaster is created on the first call, and importing `toast` creates nothing.
import { toast } from "../dist/index.js";

void toast;
