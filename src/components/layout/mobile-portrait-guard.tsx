export function MobilePortraitGuard() {
  return (
    <div className="mobile-portrait-guard" role="alert" aria-live="assertive">
      <div className="mobile-portrait-guard__phone" aria-hidden="true">📱</div>
      <strong>휴대폰을 세로로 돌려 주세요</strong>
      <p>LearnCraft 모바일 학습은 세로 화면에 맞춰져 있어요.</p>
    </div>
  );
}
