import { mathjax } from "mathjax-full/js/mathjax.js";
import { MathML } from "mathjax-full/js/input/mathml.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { updateDimensionStrokes } from "./math-figure-dimension";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const renderer = mathjax.document("", {
  InputJax: new MathML(),
  // Each character is a path, so exported images need no fonts or external resources.
  OutputJax: new SVG({ fontCache: "none" }),
});

export function mathMlToSvg(mathml: string) {
  const node = renderer.convert(mathml, { display: false });
  return adaptor.innerHTML(node);
}

export function replaceExportFormulas(svg: SVGSVGElement) {
  svg.querySelectorAll<SVGForeignObjectElement>("[data-math-render]").forEach((formula) => {
    const math = formula.querySelector("math");
    if (!math) throw new Error("Missing formula markup");
    const parsed = new DOMParser().parseFromString(mathMlToSvg(math.outerHTML), "image/svg+xml");
    const rendered = parsed.documentElement;
    if (rendered.localName !== "svg" || rendered.querySelector("parsererror, [data-mml-node='merror']")) {
      throw new Error("Unable to export formula");
    }
    const viewBox = rendered.getAttribute("viewBox")?.split(/\s+/).map(Number);
    if (!viewBox || viewBox.length !== 4 || !viewBox.every(Number.isFinite)) {
      throw new Error("Invalid formula bounds");
    }
    const fontSize = Number(formula.dataset.exportFontSize) || 22;
    // MathJax's SVG coordinate system has 1000 units per em.
    const width = viewBox[2] * fontSize / 1000;
    const height = viewBox[3] * fontSize / 1000;
    const centerX = Number(formula.getAttribute("x")) + Number(formula.getAttribute("width")) / 2;
    const centerY = Number(formula.getAttribute("y")) + Number(formula.getAttribute("height")) / 2;
    rendered.setAttribute("x", String(centerX - width / 2));
    rendered.setAttribute("y", String(centerY - height / 2));
    rendered.setAttribute("width", String(width));
    rendered.setAttribute("height", String(height));
    rendered.removeAttribute("style");
    rendered.setAttribute("overflow", "visible");
    rendered.setAttribute("color", formula.dataset.exportColor ?? "#1f2937");
    const dimension = formula.closest("[data-dimension]");
    if (dimension) updateDimensionStrokes(dimension, { x: centerX - width / 2 - 1.5, y: centerY - height / 2 - 1.5, width: width + 3, height: height + 3 });
    formula.replaceWith(document.importNode(rendered, true));
  });
}
