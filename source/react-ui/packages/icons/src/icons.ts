import {
  AlertCircle as LucideAlertCircle,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  Check as LucideCheck,
  ChevronDown as LucideChevronDown,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  ChevronUp as LucideChevronUp,
  ExternalLink as LucideExternalLink,
  Info as LucideInfo,
  Loader2 as LucideLoader2,
  Minus as LucideMinus,
  Plus as LucidePlus,
  Search as LucideSearch,
  User as LucideUser,
  X as LucideX,
} from "lucide-react";
import type { IconComponent } from "./types.js";

// Each icon is imported and re-exported individually — no `export * from "lucide-react"` — so a
// consumer's bundler only pulls in the glyphs actually referenced, never the full lucide set.

export const ChevronDown: IconComponent = LucideChevronDown;
export const ChevronUp: IconComponent = LucideChevronUp;
export const ChevronLeft: IconComponent = LucideChevronLeft;
export const ChevronRight: IconComponent = LucideChevronRight;
export const Check: IconComponent = LucideCheck;
export const X: IconComponent = LucideX;
export const ArrowRight: IconComponent = LucideArrowRight;
export const ArrowLeft: IconComponent = LucideArrowLeft;
export const Search: IconComponent = LucideSearch;
export const Plus: IconComponent = LucidePlus;
export const Minus: IconComponent = LucideMinus;
export const ExternalLink: IconComponent = LucideExternalLink;
export const AlertCircle: IconComponent = LucideAlertCircle;
export const Info: IconComponent = LucideInfo;
export const Loader2: IconComponent = LucideLoader2;
export const User: IconComponent = LucideUser;
