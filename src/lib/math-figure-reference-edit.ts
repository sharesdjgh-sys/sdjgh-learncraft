import { mathFigureSpecSchema, type MathFigureSpec, type MathFigureShape } from "./math-figure-lab";
import { evaluateMeasurement } from "./math-expression";
import { angleBinding, resizeAngle } from "./math-figure-angle";
import { hemisphereBinding, resizeHemisphereSection } from "./math-figure-hemisphere";
import { enforceFigureConstraints } from "./math-figure-constraints";

type P = number[];
const distance = (a: P, b: P) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const same = (a: P,b: P) => distance(a,b) < 0.001;
const direction = (a: P,b: P) => Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
const pair = (shape: {from:P;to:P},a:P,b:P) => (same(shape.from,a)&&same(shape.to,b)) || (same(shape.from,b)&&same(shape.to,a));
const angleText = (s: MathFigureShape) => s.type === "text" && /°|\\circ|^[xyzθ]$/.test(s.text);

export class ReferenceEditError extends Error {}

/** Recognize explicit right-angle + equal half-base marks, never a visual guess of a midpoint. */
export function rightMedianBinding(spec: MathFigureSpec, selectedArc?: number) {
  if (spec.projection !== "plane") return null;
  const points = spec.shapes.filter((s): s is Extract<MathFigureShape,{type:"point"}> => s.type === "point");
  const a = points.find(p => p.label === "A")?.at, b = points.find(p => p.label === "B")?.at;
  const c = points.find(p => p.label === "C")?.at, m = points.find(p => p.label === "M")?.at;
  if (!a || !b || !c || !m) return null;
  const connected = (p:P,q:P) => spec.shapes.some(s => s.type === "line" && pair(s,p,q));
  if (!connected(a,b) || !connected(a,c) || !connected(a,m) || !(connected(b,m)&&connected(m,c) || connected(b,c))) return null;
  const right = spec.shapes.some(s => s.type === "rightAngle" && same(s.vertex,a) && pair(s,b,c));
  const ticks = spec.shapes.filter((s): s is Extract<MathFigureShape,{type:"tick"}> => s.type === "tick");
  const equal = ticks.some(s => pair(s,b,m) && ticks.some(t => t.count === s.count && pair(t,m,c)));
  if (!right || !equal) return null;
  const arcs = spec.shapes.flatMap((s,i) => s.type === "arc" && same(s.center,a) && s.radius < Math.min(distance(a,b),distance(a,c))*.5 ? [i] : []);
  const labels = spec.shapes.flatMap((s,i) => angleText(s) ? [i] : []);
  if (arcs.length !== 1 || labels.length !== 1 || (selectedArc !== undefined && arcs[0] !== selectedArc)) return null;
  const fixedDimension = spec.shapes.findIndex(s => s.type === "dimension" && pair(s,a,c));
  const changingDimension = spec.shapes.findIndex(s => s.type === "dimension" && pair(s,a,b));
  const fixed = spec.shapes[fixedDimension];
  if (fixed?.type !== "dimension" || changingDimension < 0) return null;
  const value = evaluateMeasurement(fixed.text).value;
  if (value === null || value <= 0 || distance(a,c) < .001 || distance(b,c) < .001) return null;
  return {a,b,c,m,angleIndex:arcs[0],labelIndex:labels[0],fixedDimension,changingDimension,fixedValue:value};
}

export function resizeRightMedian(spec: MathFigureSpec, degrees: number): MathFigureSpec {
  const model = rightMedianBinding(spec);
  if (!model) throw new ReferenceEditError("직각·중점·AC 길이의 연결을 확인하지 못했습니다. 원본의 표시를 먼저 확인해 주세요.");
  if (!Number.isFinite(degrees) || degrees < 1 || degrees > 89) throw new ReferenceEditError("직각삼각형 중선과 AC 사이의 각은 1°~89°로 입력해 주세요.");
  const {a,b,c,m} = model, ac = distance(a,c), theta = degrees*Math.PI/180;
  const ab = ac*Math.tan(theta), bc = Math.hypot(ab,ac);
  const unit = [(c[0]-b[0])/distance(b,c),(c[1]-b[1])/distance(b,c)];
  const normal = [-unit[1],unit[0]];
  const side = Math.sign((a[0]-b[0])*normal[0]+(a[1]-b[1])*normal[1]) || 1;
  // Preserve the baseline direction and C's position. Change only dependent geometry.
  const newB = c.map((v,i) => v-unit[i]*bc);
  const newA = c.map((v,i) => v-unit[i]*ac*ac/bc+normal[i]*side*ab*ac/bc);
  const newM = newB.map((v,i) => (v+c[i])/2);
  const replacements = [[a,newA],[b,newB],[m,newM]];
  const move = (p:P) => replacements.find(([before]) => same(p,before))?.[1] ?? p;
  const fixedShape = spec.shapes[model.fixedDimension] as Extract<MathFigureShape,{type:"dimension"}>;
  const newValue = model.fixedValue*Math.tan(theta);
  let lengthLabel = String(Number(newValue.toPrecision(8)));
  if (degrees === 60 && Number.isInteger(model.fixedValue)) lengthLabel = `${model.fixedValue === 1 ? "" : model.fixedValue}\\sqrt{3}`;
  if (degrees === 45) lengthLabel = fixedShape.text;
  if (degrees === 30 && Number.isInteger(model.fixedValue/3)) lengthLabel = `${model.fixedValue/3 === 1 ? "" : model.fixedValue/3}\\sqrt{3}`;
  const arc = spec.shapes[model.angleIndex] as Extract<MathFigureShape,{type:"arc"}>;
  const radius = Math.min(arc.radius,Math.min(ac,distance(newA,newM))*.22);
  const start = direction(newA,newM), end = direction(newA,c), sweep = ((end-start)%360+540)%360-180;
  const middle = (start+sweep/2)*Math.PI/180;
  const centroid = newA.map((v,i) => (v+newB[i]+c[i])/3);
  const shapes = spec.shapes.map((shape,index):MathFigureShape => {
    if (index === model.angleIndex) return {...arc,center:newA,radius,startAngle:start,endAngle:start+sweep};
    if (index === model.labelIndex && shape.type === "text") return {...shape,text:`${degrees}^\\circ`,at:newA.map((v,i) => v+radius*1.65*(i === 0 ? Math.cos(middle) : Math.sin(middle))),autoPosition:false};
    if (shape.type === "dimension") {
      const from = move(shape.from), to = move(shape.to);
      const cross = (to[0]-from[0])*(centroid[1]-from[1])-(to[1]-from[1])*(centroid[0]-from[0]);
      return {...shape,from,to,text:index === model.changingDimension ? lengthLabel : shape.text,labelAt:undefined,offset:(Math.sign(cross)||1)*Math.max(Math.abs(shape.offset),ac*.08)};
    }
    // Simultaneous substitution prevents one moved vertex from being mistaken for another old vertex.
    const map = (p:P) => move(p);
    if (shape.type === "point") { const at=map(shape.at); return {...shape,at,labelAt:shape.labelAt?.map((v,i) => v+at[i]-shape.at[i])}; }
    if (shape.type === "line" || shape.type === "curve" || shape.type === "tick") return {...shape,from:map(shape.from),to:map(shape.to)};
    if (shape.type === "rightAngle") return {...shape,vertex:map(shape.vertex),from:map(shape.from),to:map(shape.to)};
    if (shape.type === "polygon") return {...shape,points:shape.points.map(map)};
    return shape;
  });
  const padding = ac*.3;
  const next = enforceFigureConstraints(mathFigureSpecSchema.parse({...spec,shapes,
    xRange:[Math.min(spec.xRange[0],newA[0]-padding,newB[0]-padding,c[0]-padding),Math.max(spec.xRange[1],newA[0]+padding,newB[0]+padding,c[0]+padding)],
    yRange:[Math.min(spec.yRange[0],newA[1]-padding,newB[1]-padding,c[1]-padding),Math.max(spec.yRange[1],newA[1]+padding,newB[1]+padding,c[1]+padding)],
    notes:[...spec.notes,`직각·중점 M·AC=${fixedShape.text} 유지. ∠MAC=${degrees}°에 맞춰 AB=${lengthLabel}로 함께 변경했습니다.`].slice(-8),
  }));
  const result = rightMedianBinding(next);
  if (!result || Math.abs(distance(result.b,result.m)-distance(result.m,result.c)) > 1e-5 || Math.abs(distance(result.a,result.c)-ac)>1e-5 || Math.abs(Math.abs(((direction(result.a,result.b)-direction(result.a,result.c))%360+540)%360-180)-90)>1e-5 || Math.abs(Math.abs(((direction(result.a,result.m)-direction(result.a,result.c))%360+540)%360-180)-degrees)>1e-5) throw new ReferenceEditError("다른 조건과 충돌해 직각·중점·요청 각도를 함께 유지할 수 없습니다. 변경하지 않았습니다.");
  return next;
}

/** Apply a requested edit to the original drawing, never re-interpret every displayed length as a coordinate. */
export function applyReferenceVariation(spec: MathFigureSpec, instruction: string): MathFigureSpec {
  const matches = [...instruction.matchAll(/(\d+(?:\.\d+)?)\s*(?:도|°|\^\s*(?:\{\s*)?\\circ\}?)/g)];
  if (!matches.length || !/(수정|변경|바꿔|바꾸|조절)/.test(instruction)) throw new ReferenceEditError("현재 원본 유지 변형은 ‘x도를 60도로 수정’처럼 각도를 지정하는 요청부터 지원합니다. 다른 변경은 편집 도구를 사용해 주세요.");
  // Do not silently ignore extra length, midpoint, or fixed-condition instructions.
  const remainder = instruction.replace(/(\d+(?:\.\d+)?)\s*(?:도|°|\^\s*(?:\{\s*)?\\circ\}?)/g, "");
  if (/\d/.test(remainder) || /유지|고정|해제|없애|그리고|동시에/.test(remainder)) throw new ReferenceEditError("여러 조건을 동시에 변경하는 요청은 아직 안전하게 계산할 수 없습니다. 각도 변경만 요청해 주세요.");
  const degrees = Number(matches.at(-1)![1]);
  const median = rightMedianBinding(spec);
  if (median) {
    if (/∠?\s*(?:BAC|BAM|ABC|ACB)|[Bb]\s*(?:도|°)/.test(instruction)) throw new ReferenceEditError("이 도형의 자동 연동은 중선 AM과 AC 사이의 x각을 대상으로 합니다.");
    return resizeRightMedian(spec,degrees);
  }
  const arcs = spec.shapes.flatMap((s,i) => s.type === "arc" && (angleBinding(spec,s) || hemisphereBinding(spec,i)) ? [i] : []);
  const labels = spec.shapes.flatMap((s,i) => angleText(s) ? [i] : []);
  if (arcs.length !== 1 || labels.length !== 1) throw new ReferenceEditError("변경할 각과 연결된 조건을 하나로 확인하지 못했습니다. 그림은 변경하지 않았습니다.");
  const index = arcs[0], hemisphere = hemisphereBinding(spec,index);
  if (!hemisphere && (spec.projection !== "plane" || spec.shapes.some(s => ["rightAngle","tick","circle","ellipse","dimension"].includes(s.type)))) throw new ReferenceEditError("직각·같은 길이·원 등의 조건을 보존하는 계산을 확인하지 못했습니다. 각도 표시만 바꾸지 않고 요청을 중단했습니다.");
  let next = hemisphere ? resizeHemisphereSection(spec,hemisphere,degrees) : resizeAngle(spec,index,degrees,"start");
  const changed = next.shapes[index];
  if (changed.type !== "arc") throw new ReferenceEditError("각도 호를 확인하지 못했습니다.");
  const theta = (changed.startAngle+changed.endAngle)/2*Math.PI/180;
  next = {...next,shapes:next.shapes.map((s,i) => i === labels[0] && s.type === "text" ? {...s,text:`${degrees}^\\circ`,at:changed.center.map((v,j) => v+changed.radius*1.6*(j === 0 ? Math.cos(theta) : Math.sin(theta))),autoPosition:false} : s)};
  return enforceFigureConstraints(next);
}
