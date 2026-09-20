import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
  Loader2,
  Minus,
  Plus,
  Search,
  User,
  X,
} from "./icons.js";

describe("curated icon re-exports", () => {
  it.each([
    ["ChevronDown", ChevronDown],
    ["ChevronUp", ChevronUp],
    ["ChevronLeft", ChevronLeft],
    ["ChevronRight", ChevronRight],
    ["Check", Check],
    ["X", X],
    ["ArrowRight", ArrowRight],
    ["ArrowLeft", ArrowLeft],
    ["Search", Search],
    ["Plus", Plus],
    ["Minus", Minus],
    ["AlertCircle", AlertCircle],
    ["Info", Info],
    ["Loader2", Loader2],
    ["User", User],
  ] as const)("renders an svg for %s", (_name, IconGlyph) => {
    const { container } = render(<IconGlyph />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders lucide's own distinguishing class on the svg for a spot-checked glyph", () => {
    const { container } = render(<ChevronDown />);
    expect(container.querySelector("svg.lucide-chevron-down")).toBeInTheDocument();
  });

  it("renders a different, distinguishable svg for a different spot-checked glyph", () => {
    const { container } = render(<Search />);
    expect(container.querySelector("svg.lucide-search")).toBeInTheDocument();
  });

  it("resolves User to lucide's plain person glyph, not one of its many variants", () => {
    const { container } = render(<User />);
    expect(container.querySelector("svg.lucide-user")).toBeInTheDocument();
  });
});
