type NumericFunction = (x: number) => number;

class ExpressionParser {
  private cursor = 0;

  constructor(private readonly source: string) {}

  parse(): NumericFunction {
    const result = this.parseAddition();
    this.skipSpaces();
    if (this.cursor !== this.source.length) {
      throw new Error(`지원하지 않는 식 표기: ${this.source.slice(this.cursor, this.cursor + 12)}`);
    }
    return result;
  }

  private parseAddition(): NumericFunction {
    let left = this.parseMultiplication();
    while (true) {
      if (this.take("+")) {
        const previous = left;
        const right = this.parseMultiplication();
        left = (x) => previous(x) + right(x);
      } else if (this.take("-")) {
        const previous = left;
        const right = this.parseMultiplication();
        left = (x) => previous(x) - right(x);
      } else {
        return left;
      }
    }
  }

  private parseMultiplication(): NumericFunction {
    let left = this.parseUnary();
    while (true) {
      if (this.take("*")) {
        const previous = left;
        const right = this.parseUnary();
        left = (x) => previous(x) * right(x);
      } else if (this.take("/")) {
        const previous = left;
        const right = this.parseUnary();
        left = (x) => previous(x) / right(x);
      } else {
        return left;
      }
    }
  }

  private parseUnary(): NumericFunction {
    if (this.take("+")) return this.parseUnary();
    if (this.take("-")) {
      const value = this.parseUnary();
      return (x) => -value(x);
    }
    return this.parsePower();
  }

  private parsePower(): NumericFunction {
    const base = this.parsePrimary();
    if (!this.take("^")) return base;
    const exponent = this.parseUnary();
    return (x) => Math.pow(base(x), exponent(x));
  }

  private parsePrimary(): NumericFunction {
    this.skipSpaces();
    if (this.take("(")) {
      const value = this.parseAddition();
      if (!this.take(")")) throw new Error("함수식의 괄호가 닫히지 않았어요.");
      return value;
    }

    const number = this.readNumber();
    if (number !== undefined) return () => number;

    const identifier = this.readIdentifier();
    if (!identifier) throw new Error("함수식에서 숫자나 변수를 찾지 못했어요.");
    if (identifier === "x") return (x) => x;
    if (identifier === "pi") return () => Math.PI;
    if (identifier === "e") return () => Math.E;

    const functions: Record<string, (value: number) => number> = {
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      asin: Math.asin,
      acos: Math.acos,
      atan: Math.atan,
      sqrt: Math.sqrt,
      abs: Math.abs,
      exp: Math.exp,
      ln: Math.log,
      log: Math.log10,
      log10: Math.log10,
      floor: Math.floor,
      ceil: Math.ceil,
    };
    const operation = functions[identifier];
    if (!operation) throw new Error(`지원하지 않는 함수예요: ${identifier}`);
    if (!this.take("(")) throw new Error(`${identifier} 함수 뒤에는 괄호가 필요해요.`);
    const argument = this.parseAddition();
    if (!this.take(")")) throw new Error(`${identifier} 함수의 괄호가 닫히지 않았어요.`);
    return (x) => operation(argument(x));
  }

  private readNumber() {
    this.skipSpaces();
    const match = this.source.slice(this.cursor).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (!match) return undefined;
    this.cursor += match[0].length;
    return Number(match[0]);
  }

  private readIdentifier() {
    this.skipSpaces();
    const match = this.source.slice(this.cursor).match(/^[a-z][a-z0-9]*/i);
    if (!match) return "";
    this.cursor += match[0].length;
    return match[0].toLowerCase();
  }

  private take(token: string) {
    this.skipSpaces();
    if (!this.source.startsWith(token, this.cursor)) return false;
    this.cursor += token.length;
    return true;
  }

  private skipSpaces() {
    while (/\s/.test(this.source[this.cursor] ?? "")) this.cursor += 1;
  }
}

/** Bounded, non-eval parser shared by graph plotting and geometric measurements. */
export function compileMathExpression(source: string): NumericFunction {
  if (source.length > 500) throw new Error("수식은 500자 이하로 입력해 주세요.");
  const normalized = normalizeMathExpression(source);
  if ((normalized.match(/\(/g) ?? []).length > 64) throw new Error("수식이 너무 복잡합니다.");
  return new ExpressionParser(normalized).parse();
}

export function normalizeMathExpression(source: string): string {
  if (source.length > 500 || (source.match(/[({]/g) ?? []).length > 64) throw new Error("수식이 너무 복잡합니다.");
  let text = source.trim().replace(/^\$+|\$+$/g, "").replace(/\\(?:left|right)/g, "")
    .replace(/−/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/")
    .replace(/²/g, "^2").replace(/³/g, "^3").replace(/π/g, "pi")
    .replace(/\\(?:cdot|times)/g, "*").replace(/\\pi\b/g, "pi").replace(/\\[,;!]/g, "");
  const group = (start: number): [string, number] => {
    while (/\s/.test(text[start] ?? "")) start++;
    if (text[start] !== "{") throw new Error("수식의 중괄호를 확인해 주세요.");
    let depth = 1, end = start + 1;
    for (; end < text.length && depth; end++) { if (text[end] === "{") depth++; if (text[end] === "}") depth--; }
    if (depth) throw new Error("수식의 중괄호가 닫히지 않았습니다.");
    return [normalizeMathExpression(text.slice(start + 1, end - 1)), end];
  };
  // Replace outer commands recursively; never extract a partial number from a label.
  for (let steps = 0; steps < 100; steps++) {
    const match = /\\(sqrt|frac|dfrac|tfrac)\b/.exec(text);
    if (!match) break;
    const [a, end] = group(match.index + match[0].length);
    let replacement = `sqrt(${a})`, stop = end;
    if (match[1] !== "sqrt") { const [b, next] = group(end); replacement = `((${a})/(${b}))`; stop = next; }
    text = text.slice(0, match.index) + replacement + text.slice(stop);
  }
  text = text.replace(/\\(sin|cos|tan|asin|acos|atan|ln|log|exp|abs)(?=[^a-z]|$)/g, "$1");
  // log_{base}(argument), log_{base}{argument}, and log_{base}number.
  text = text.replace(/log_(?:\{([^{}]+)\}|([0-9]))\s*(\([^()]+\)|\{[^{}]+\}|(?:\d+(?:\.\d*)?|\.\d+))/g,
    (_, base: string, digit: string, argument: string) => `(ln(${argument.replace(/[{}]/g, "")})/ln(${base ?? digit}))`);
  text = text.replace(/\{/g, "(").replace(/\}/g, ")");
  text = text.replace(/√\s*(\d+(?:\.\d*)?|\([^()]*\))/g, "sqrt($1)");
  // Conventional implicit multiplication: 2x, 2pi, 2sqrt(...), (x+1)(x-1).
  text = text.replace(/(\b\d+(?:\.\d+)?|\))\s*(?=[(a-df-zA-DF-Z])/g, "$1*").replace(/\bx\s*(?=\()/g, "x*");
  return text;
}

export function evaluateMeasurement(source: string): { value: number | null; angle: boolean } {
  const angle = /(?:°|\^\s*(?:\{\s*)?\\circ\s*\}?)\s*\$*$/.test(source.trim());
  const expression = source.trim().replace(/\$+$/g, "").replace(/(?:°|\^\s*(?:\{\s*)?\\circ\s*\}?)\s*$/, "");
  try {
    const normalized = normalizeMathExpression(expression);
    if (/\bx\b/i.test(normalized)) return { value: null, angle };
    const value = compileMathExpression(expression)(0);
    return { value: Number.isFinite(value) ? value : null, angle };
  } catch { return { value: null, angle }; }
}
