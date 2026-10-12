import {
  AlertCircle as LucideAlertCircle,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  Calendar as LucideCalendar,
  Check as LucideCheck,
  ChevronDown as LucideChevronDown,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  ChevronUp as LucideChevronUp,
  ChevronsLeft as LucideChevronsLeft,
  ChevronsRight as LucideChevronsRight,
  Ellipsis as LucideEllipsis,
  ExternalLink as LucideExternalLink,
  Info as LucideInfo,
  Loader2 as LucideLoader2,
  Menu as LucideMenu,
  Minus as LucideMinus,
  Monitor as LucideMonitor,
  Moon as LucideMoon,
  PanelLeftClose as LucidePanelLeftClose,
  PanelLeftOpen as LucidePanelLeftOpen,
  Plus as LucidePlus,
  Search as LucideSearch,
  Sun as LucideSun,
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
export const ChevronsLeft: IconComponent = LucideChevronsLeft;
export const ChevronsRight: IconComponent = LucideChevronsRight;
export const Ellipsis: IconComponent = LucideEllipsis;
export const Check: IconComponent = LucideCheck;
export const X: IconComponent = LucideX;
export const ArrowRight: IconComponent = LucideArrowRight;
export const ArrowLeft: IconComponent = LucideArrowLeft;
export const Search: IconComponent = LucideSearch;
export const Plus: IconComponent = LucidePlus;
export const Minus: IconComponent = LucideMinus;
export const PanelLeftClose: IconComponent = LucidePanelLeftClose;
export const PanelLeftOpen: IconComponent = LucidePanelLeftOpen;
export const ExternalLink: IconComponent = LucideExternalLink;
export const AlertCircle: IconComponent = LucideAlertCircle;
export const Info: IconComponent = LucideInfo;
export const Loader2: IconComponent = LucideLoader2;
export const User: IconComponent = LucideUser;
export const Sun: IconComponent = LucideSun;
export const Moon: IconComponent = LucideMoon;
export const Monitor: IconComponent = LucideMonitor;
export const Calendar: IconComponent = LucideCalendar;
export const Menu: IconComponent = LucideMenu;
