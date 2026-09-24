# 시대 지도 자료 (Historical map data)

이 폴더의 `<시기>.json`(TopoJSON)은 `scripts/build-historical-maps.ts`가 만듭니다. 손으로 고치지 마세요.

- 원본: historical-basemaps, A. Ourednik — https://github.com/aourednik/historical-basemaps
  (고정한 커밋 da7a4b735ecef70aebdc9c73e409d8a2500d50f3)
- 라이선스: GNU GPL v3.0 (LICENSE-historical-basemaps.txt). 이 폴더의 자료는 원본을 바꾼 결과물이며 같은 라이선스를 따릅니다.
- 바꾼 내용:
  - 한반도·만주 영역을 교과서의 시기별 대표 지도를 참고해 다시 그렸습니다(`scripts/historical-maps/korea.ts`).
  - 이름을 한국어로 옮겼습니다(`scripts/historical-maps/names.ts`).
  - 맞붙은 조각을 합치고, 작은 조각(약 400㎢ 미만)을 빼고, 단순화했습니다.
- 경계는 세계·대륙 규모를 위한 대략적인 모습입니다. 학술 자료나 법적 경계로 쓰지 마세요.

다시 만들기: `npm run maps:history`
