/* 팀·대진표의 파일 저장과 인쇄 도우미입니다. */

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[char]!);
/** 인쇄용 새 창을 열어 바로 인쇄합니다. 팝업이 막히면 false를 돌려줍니다. */
export function printHtml(title: string, body: string) {
  const popup = window.open("", "_blank", "width=900,height=700");
  if (!popup) return false;
  popup.document.title = title;
  popup.document.body.innerHTML = `<style>
    @page{margin:12mm} body{font-family:Pretendard,'Malgun Gothic',sans-serif;color:#212529;margin:0}
    h1{font-size:20px;margin:0 0 12px} h2{font-size:15px;margin:18px 0 6px}
    table{border-collapse:collapse;width:100%;font-size:13px;margin-bottom:10px} th,td{border:1px solid #adb5bd;padding:5px 8px;text-align:center}
    th{background:#f1f3f5} .left{text-align:left} .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
    .team{border:1px solid #adb5bd;border-radius:8px;padding:8px 10px;break-inside:avoid} .team b{font-size:15px} .muted{color:#868e96;font-size:12px}
    svg{max-width:100%;height:auto}
  </style><h1>${escapeHtml(title)}</h1>${body}`;
  popup.focus();
  popup.print();
  return true;
}
