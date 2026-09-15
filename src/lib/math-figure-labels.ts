import type { MathFigureShape, MathFigureSpec } from "./math-figure-lab";

export function isVisibleFigureLabel(shape: MathFigureShape): shape is Extract<MathFigureShape, {type: "point" | "text" | "dimension"}> {
  return shape.type === "text" || shape.type === "dimension" || (shape.type === "point" && Boolean(shape.label.trim()));
}

export function setFigureLabelFontSize(spec: MathFigureSpec, fontSize: number): MathFigureSpec {
  if (!Number.isFinite(fontSize) || fontSize < 10 || fontSize > 40) throw new Error("글자 크기는 10~40px로 입력해 주세요.");
  let changed = false;
  const shapes = spec.shapes.map(shape => {
    if (!isVisibleFigureLabel(shape) || shape.fontSize === fontSize) return shape;
    changed = true;
    return { ...shape, fontSize };
  });
  return changed ? { ...spec, shapes } : spec;
}
