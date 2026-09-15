import { mathFigureSpecSchema, replaceSharedCoordinate, type MathFigureSpec } from "./math-figure-lab";
import type { FigureConstraint } from "./math-figure-construction-schema";
import { angleBinding } from "./math-figure-angle";

const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const unit = (a: number[], b: number[]) => {
  const length = distance(a, b);
  if (length < 1e-7) throw new Error("길이가 0인 선이나 원 중심의 점에는 조건을 적용할 수 없습니다.");
  return [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
};

/** Directed constraints: the reference drives the target. Shared vertices move together. */
function corrections(spec: MathFigureSpec, rule: FigureConstraint): [number[], number[]][] {
  const target = spec.shapes[rule.target], ref = spec.shapes[rule.reference];
  if (!target || !ref || rule.target === rule.reference) throw new Error("조건의 대상과 기준 요소를 다시 선택해 주세요.");
  if (rule.kind === "onCircle") {
    if (target.type !== "point" || ref.type !== "circle") throw new Error("원 위의 점 조건에는 점과 완전한 원이 필요합니다.");
    const radial = unit(ref.center, target.at);
    return [[target.at, ref.center.map((v, i) => v + radial[i] * ref.radius)]];
  }
  if (target.type !== "line") throw new Error("조건의 대상은 직선 선분이어야 합니다.");
  const length = distance(target.from, target.to), oldDirection = unit(target.from, target.to);
  let start = target.from, direction: number[];
  if (rule.kind === "tangent") {
    if (ref.type !== "circle") throw new Error("접선 조건에는 완전한 원이 필요합니다.");
    const radial = unit(ref.center, start);
    start = ref.center.map((v, i) => v + radial[i] * ref.radius);
    direction = [-radial[1], radial[0]];
  } else {
    if (ref.type !== "line") throw new Error("평행·수직 조건의 기준은 선분이어야 합니다.");
    direction = unit(ref.from, ref.to);
    if (rule.kind === "perpendicular") direction = [-direction[1], direction[0]];
  }
  if (direction[0] * oldDirection[0] + direction[1] * oldDirection[1] < 0) direction = direction.map(v => -v);
  return [[target.from, start], [target.to, start.map((v, i) => v + direction[i] * length)]];
}

export function constraintError(spec: MathFigureSpec): number {
  return Math.max(0, ...(spec.constraints ?? []).flatMap(rule => corrections(spec, rule).map(([a, b]) => distance(a, b))));
}

export function enforceFigureConstraints(input: MathFigureSpec): MathFigureSpec {
  if (!input.constraints?.length) return mathFigureSpecSchema.parse(input);
  if (input.projection !== "plane") throw new Error("평행·수직·접선 조건은 평면 도형에서만 적용됩니다. 공간도형은 계산 유형을 사용해 주세요.");
  let spec = mathFigureSpecSchema.parse(input);
  const moves: [number[], number[]][] = [];
  const moved = (at: number[]) => moves.reduce((p,[before,after]) => distance(p,before) < .001 ? after : p,at);
  const finish = () => {
    // A constraint may rotate a ray independently of the angle editor. Keep its marker attached.
    const shapes = spec.shapes.map((shape,index) => {
      const original = input.shapes[index];
      if (shape.type === "arc" && original.type === "arc") {
        const binding = angleBinding(input,original);
        if (!binding) return shape;
        const center = moved(binding.center), start = moved(binding.start), end = moved(binding.end);
        const a = Math.atan2(start[1]-center[1],start[0]-center[0])*180/Math.PI;
        const b = Math.atan2(end[1]-center[1],end[0]-center[0])*180/Math.PI;
        const sweep = original.endAngle >= original.startAngle ? ((b-a)%360+360)%360 : -(((a-b)%360+360)%360);
        return { ...shape, center, startAngle:a, endAngle:a+sweep };
      }
      if (shape.type === "rightAngle") {
        const a = unit(shape.vertex,shape.from), b = unit(shape.vertex,shape.to);
        if (Math.abs(a[0]*b[0]+a[1]*b[1]) < 1e-6) return shape;
        const start = Math.atan2(a[1],a[0])*180/Math.PI, end = Math.atan2(b[1],b[0])*180/Math.PI;
        const sweep = ((end-start)%360+540)%360-180;
        return {type:"arc" as const,color:shape.color,dashed:shape.dashed,center:shape.vertex,radius:shape.size,startAngle:start,endAngle:start+sweep};
      }
      return shape;
    });
    return mathFigureSpecSchema.parse({...spec,shapes});
  };
  for (let iteration = 0; iteration < 48; iteration++) {
    if (constraintError(spec) < 1e-6) return finish();
    for (const rule of spec.constraints ?? []) {
      for (const [before, after] of corrections(spec, rule)) {
        if (distance(before, after) < 1e-8) continue;
        moves.push([before,after]);
        spec = { ...spec, shapes: spec.shapes.map(shape => replaceSharedCoordinate(shape, before, after)) };
      }
    }
    spec = mathFigureSpecSchema.parse(spec);
  }
  if (constraintError(spec) > 1e-6) throw new Error("지정한 조건들이 충돌하거나 함께 계산되지 않습니다. 이번 변경을 적용하지 않았습니다.");
  return finish();
}
