import { keyInfo, noteLabel, vexKey, type ParsedScore, type ScoreSettings } from "./notation";

export const SCORE_WIDTH = 900;
const MARGIN = 24;
const ERROR_COLOR = "#c2410c";

/**
 * 해석한 악보를 그립니다. div에는 SVG로, canvas에는 PNG 저장용 고해상도로 그립니다.
 * SVG로 그리면 재생 강조에 쓸 음표 요소를 순서대로 돌려줍니다.
 */
export async function renderScore(host: HTMLDivElement | HTMLCanvasElement, score: ParsedScore, settings: ScoreSettings, errorMeasures: Set<number>, pixelRatio = 1) {
  const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot, Beam, StaveTie, Barline, CanvasContext } = await import("vexflow");
  await document.fonts.ready;
  const canvas = host instanceof HTMLCanvasElement;
  if (!canvas) host.replaceChildren();
  const renderer = new Renderer(host, canvas ? Renderer.Backends.CANVAS : Renderer.Backends.SVG);
  const context = renderer.getContext();
  const key = keyInfo(settings.key);
  const perLine = Math.max(1, Math.min(6, settings.perLine));
  const hasLabels = settings.labels !== "none";
  const hasLyrics = score.measures.some(measure => measure.notes.some(note => note.lyric));
  const hasChords = score.measures.some(measure => measure.notes.some(note => note.chord));
  const header = (settings.title ? 56 : 16) + (settings.composer || settings.lyricist ? 18 : 0) + (hasChords ? 24 : 0);
  const lineHeight = 118 + (hasLabels ? 22 : 0) + (hasLyrics ? 22 : 0) + (hasChords ? 18 : 0);
  const lines = Math.max(1, Math.ceil(score.measures.length / perLine));
  const height = header + lines * lineHeight + 16;
  if (context instanceof CanvasContext) {
    context.resize(SCORE_WIDTH, height, pixelRatio);
    context.save();
    context.setFillStyle("#ffffff");
    context.fillRect(0, 0, SCORE_WIDTH, height);
    context.restore();
  } else renderer.resize(SCORE_WIDTH, height);

  context.save();
  if (settings.title) {
    context.setFont("Pretendard, sans-serif", 22, "bold");
    const width = context.measureText(settings.title).width;
    context.fillText(settings.title, (SCORE_WIDTH - width) / 2, 36);
  }
  context.setFont("Pretendard, sans-serif", 12, "normal");
  const credit = [settings.lyricist && `작사 ${settings.lyricist}`, settings.composer && `작곡 ${settings.composer}`].filter(Boolean).join("  ·  ");
  if (credit) context.fillText(credit, SCORE_WIDTH - MARGIN - context.measureText(credit).width, header - 4);
  context.restore();

  const noteElements: SVGElement[] = [];
  const staveNotes: InstanceType<typeof StaveNote>[] = [];
  const lineOf: number[] = [];
  const ties: { from: number; line: number }[] = [];
  let noteIndex = 0;

  // 계이름·가사·코드는 음 높이와 상관없이 줄마다 같은 높이에 맞춰 적습니다.
  const drawRow = (items: { x: number; text: string }[], y: number, size: number, weight: string) => {
    context.save();
    context.setFont("Pretendard, sans-serif", size, weight);
    for (const item of items) context.fillText(item.text, item.x - context.measureText(item.text).width / 2, y);
    context.restore();
  };

  for (let line = 0; line < lines; line += 1) {
    const texts: { staveNote: InstanceType<typeof StaveNote>; chord: string | null; label: string | null; lyric: string | null }[] = [];
    let staffTop = 0;
    let staffBottom = 0;
    const measures = score.measures.slice(line * perLine, (line + 1) * perLine);
    const y = header + line * lineHeight + (hasChords ? 18 : 0);
    // 첫 마디에만 음자리표·조표(첫 줄은 박자표)를 두고 남은 폭을 음표 수에 비례해 나눕니다.
    const probe = new Stave(0, 0, 200).addClef(settings.clef).addKeySignature(key.vex);
    if (line === 0) probe.addTimeSignature(settings.time);
    const modifiers = probe.getNoteStartX() - probe.getX() + 8;
    const available = SCORE_WIDTH - MARGIN * 2 - modifiers;
    const slots = measures.length < perLine && line === lines - 1 && lines > 1 ? perLine : measures.length;
    const weights = measures.map(measure => 1 + measure.notes.length * 0.18);
    const averageWeight = weights.reduce((sum, value) => sum + value, 0) / measures.length;
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) + (slots - measures.length) * averageWeight;
    let x = MARGIN;
    measures.forEach((measure, offset) => {
      const measureNumber = line * perLine + offset + 1;
      const width = available * weights[offset] / totalWeight + (offset === 0 ? modifiers : 0);
      const stave = new Stave(x, y, width);
      if (offset === 0) {
        stave.addClef(settings.clef).addKeySignature(key.vex);
        if (line === 0) {
          stave.addTimeSignature(settings.time);
          // 코드 이름 줄과 겹치지 않도록 빠르기표를 한 줄 위에 둡니다.
          stave.setTempo({ duration: settings.time.endsWith("/8") ? "8" : "q", bpm: settings.tempo }, hasChords ? -56 : -8);
        }
      }
      if (measureNumber === score.measures.length) stave.setEndBarType(Barline.type.END);
      stave.setContext(context).draw();
      staffTop = stave.getYForLine(0);
      staffBottom = stave.getBottomLineY();
      x += width;

      const notes = measure.notes.map(note => {
        const staveNote = new StaveNote({
          clef: settings.clef,
          keys: note.rest ? [settings.clef === "bass" ? "d/3" : "b/4"] : [vexKey(note)],
          duration: String(note.duration === 1 ? "w" : note.duration === 2 ? "h" : note.duration === 4 ? "q" : note.duration),
          dots: note.dotted ? 1 : 0,
          type: note.rest ? "r" : undefined,
        });
        if (note.dotted) Dot.buildAndAttach([staveNote], { all: true });
        texts.push({ staveNote, chord: note.chord, label: noteLabel(note, settings.labels), lyric: note.lyric });
        if (errorMeasures.has(measureNumber)) staveNote.setStyle({ fillStyle: ERROR_COLOR, strokeStyle: ERROR_COLOR });
        if (note.tie) ties.push({ from: noteIndex, line });
        lineOf.push(line);
        staveNotes.push(staveNote);
        noteIndex += 1;
        return staveNote;
      });
      const voice = new Voice({ numBeats: Number(settings.time.split("/")[0]), beatValue: Number(settings.time.split("/")[1]) }).setMode(Voice.Mode.SOFT).addTickables(notes);
      Accidental.applyAccidentals([voice], key.vex);
      const beams = Beam.generateBeams(notes, { groups: Beam.getDefaultBeamGroups(settings.time) });
      new Formatter().joinVoices([voice]).formatToStave([voice], stave);
      voice.draw(context, stave);
      beams.forEach(beam => beam.setContext(context).draw());
    });

    const center = (note: InstanceType<typeof StaveNote>) => (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
    const ys = texts.flatMap(item => item.staveNote.isRest() ? [] : item.staveNote.getYs());
    const labelY = Math.max(staffBottom + 32, Math.max(0, ...ys) + 24);
    const labels = texts.flatMap(item => item.label ? [{ x: center(item.staveNote), text: item.label }] : []);
    const lyrics = texts.flatMap(item => item.lyric ? [{ x: center(item.staveNote), text: item.lyric }] : []);
    const chords = texts.flatMap(item => item.chord ? [{ x: center(item.staveNote), text: item.chord }] : []);
    drawRow(labels, labelY, 12, "bold");
    drawRow(lyrics, labelY + (labels.length ? 21 : 0), 14, "normal");
    drawRow(chords, Math.min(staffTop - 14, Math.min(Infinity, ...ys) - 34), 13, "bold");
  }

  // 붙임줄: 줄이 바뀌면 두 조각으로 나눠 그립니다.
  for (const tie of ties) {
    const first = staveNotes[tie.from];
    const last = staveNotes[tie.from + 1];
    if (!last || score.measures.flatMap(measure => measure.notes)[tie.from + 1]?.rest) continue;
    if (lineOf[tie.from + 1] === tie.line) new StaveTie({ firstNote: first, lastNote: last, firstIndexes: [0], lastIndexes: [0] }).setContext(context).draw();
    else {
      new StaveTie({ firstNote: first, lastNote: null, firstIndexes: [0], lastIndexes: [0] }).setContext(context).draw();
      new StaveTie({ firstNote: null, lastNote: last, firstIndexes: [0], lastIndexes: [0] }).setContext(context).draw();
    }
  }

  if (canvas) return { svg: null, noteElements, height };
  // 음표 그룹은 그린 순서(줄 → 마디 → 음표)대로 SVG에 들어가므로 해석한 음표 순서와 같습니다.
  noteElements.push(...host.querySelectorAll<SVGElement>(".vf-stavenote"));
  const svg = host.querySelector("svg");
  svg?.setAttribute("viewBox", `0 0 ${SCORE_WIDTH} ${height}`);
  // VexFlow가 넣는 900px 고정 크기를 지워, 감싼 상자 너비(화면 크기 조절 포함)에 맞춰 늘고 줄게 합니다.
  svg?.removeAttribute("width");
  svg?.removeAttribute("height");
  svg?.style.setProperty("width", "100%");
  svg?.style.setProperty("height", "auto");
  svg?.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return { svg, noteElements, height };
}
