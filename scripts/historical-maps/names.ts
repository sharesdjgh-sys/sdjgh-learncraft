/**
 * historical-basemaps의 영어 이름 → 교과서 한국어 표기입니다. 목록에 없으면 원래 이름을 그대로 씁니다.
 * 같은 이름이 시기에 따라 다른 나라를 가리키면 periodNames에서 따로 정합니다.
 */
export const historyNames: Record<string, string> = {
  // 동아시아
  "Han": "후한", "Han Empire": "한(漢)", "Qin": "진(秦)", "Zhou states": "주 왕조와 제후국", "Xia": "하(夏)", "Sinic": "중국 문화권",
  "Sixteen Kingdoms": "5호 16국", "Toba Wei": "북위", "Sui Empire": "수", "Tang Empire": "당", "Song Empire": "송", "Liao": "요 (거란)",
  "Xixia": "서하", "Great Khanate": "원 (몽골 제국)", "Mongol Empire": "몽골 제국", "Ming Empire": "명", "Ming Chinese Empire": "명",
  "Post-Ming Warlords": "명 잔존 세력", "Manchu Empire": "청", "Qing Empire": "청", "China": "중국", "Chinese warlords": "중국 (군벌 시대)", "Chinese Warlords": "중국 (군벌 시대)",
  "Manchuria": "만주국", "Mongolia": "몽골", "Mongols": "몽골 부족", "Xiongnu": "흉노", "Xianbei": "선비", "Ruanruan": "유연", "Göktürks": "돌궐", "Uyghurs": "위구르",
  "Khitans": "거란", "Southern Xiongnu": "남흉노", "Northern Xiongnu": "북흉노", "Kurykans": "쿠리칸", "Tungus": "퉁구스계 주민", "Tibetan Empire": "토번", "Tibet": "티베트", "Tibetans": "티베트", "Nan Chao": "남조", "Yuezhi": "월지", "Xinjiang": "신장",
  "Japan": "일본", "Yamato": "야마토 정권", "Imperial Japan (Fujiwara)": "일본 (헤이안 시대)", "Shogun Japan (Kamakura)": "일본 (가마쿠라 막부)",
  "Japan (Warring States)": "일본 (전국 시대)", "Tokugawa shogunate": "일본 (에도 막부)", "Imperial Japan": "일본 제국", "Empire of Japan": "일본 제국", "Japan (USA)": "일본 (미군 점령)",
  "Jōmon": "조몬 문화", "Late Jomon culture": "조몬 문화", "Yayoi": "야요이 문화", "Ainu": "아이누", "Taiwan": "타이완",
  "Korea, Republic of": "대한민국", "Korea, Democratic People's Republic of": "북한", "Korea (USSR)": "38도선 이북 (소련군 주둔)", "Korea (USA)": "38도선 이남 (미군 주둔)",
  "Proto-Altaic pastoralists": "알타이계 유목민", "Paleo-Siberian hunter-gatherers": "고시베리아 수렵 채집민", "Siberians": "시베리아 주민",
  "Austro-Asiatic rice cultures": "오스트로아시아계 벼농사 문화", "Thai": "타이계 주민", "Đại Việt": "대월 (베트남)", "Khmer Empire": "크메르 제국", "Srivijaya Empire": "스리위자야",
  "Ayutthaya": "아유타야", "Pagan": "파간 왕조", "Burma": "미얀마", "Siam": "시암", "French Indochina": "프랑스령 인도차이나", "Dutch East Indies": "네덜란드령 동인도", "Indonesia": "인도네시아",
  "Philippines": "필리핀", "Vietnam": "베트남", "Malays": "말레이계 주민",
  // 남아시아·서아시아
  "Indus valley civilization": "인더스 문명", "Vedic Aryans": "아리아인 (베다 시대)", "Mauryan Empire": "마우리아 왕조", "Gupta Empire": "굽타 왕조", "Kushan Empire": "쿠샨 왕조",
  "Mughal Empire": "무굴 제국", "Sultanate of Delhi": "델리 술탄 왕조", "Maratha Confederacy": "마라타 동맹", "British Raj": "영국령 인도", "India": "인도", "Pakistan": "파키스탄",
  "Hindu kingdoms": "힌두 왕국들", "Vijayanagara": "비자야나가르 왕국", "Dravidians": "드라비다인",
  "Ur": "우르 (수메르)", "city-states": "도시 국가들", "Canaan": "가나안", "Hurrian Kingdoms": "후르리 왕국", "Minoan": "미노스 문명", "Cycladic": "키클라데스 문명",
  "Kerma": "케르마 왕국", "Oxus": "옥수스 문명", "Andronovo": "안드로노보 문화", "Sintashta": "신타시타 문화", "Anatolian tribes": "아나톨리아 부족들",
  "Palas": "팔라 왕조", "Pyu state": "퓨", "Mon state": "몬",
  "Elam": "엘람", "Babylonia": "바빌로니아", "Semites": "셈족", "Hittites": "히타이트", "Achaemenid Empire": "아케메네스 왕조 페르시아", "Empire of Alexander": "알렉산드로스 제국",
  "Seleucid Kingdom": "셀레우코스 왕조", "Parthian Empire": "파르티아", "Parthia": "파르티아", "Sasanian Empire": "사산 왕조 페르시아", "Abbasid Caliphate": "아바스 왕조",
  "Umayyad Caliphate": "우마이야 왕조", "Fatimid Caliphate": "파티마 왕조", "Seljuk Empire": "셀주크 튀르크", "Ilkhanate": "일한국", "Chagatai Khanate": "차가타이한국",
  "Khanate of the Golden Horde": "킵차크한국", "Golden Horde": "킵차크한국", "Timurid Emirates": "티무르 왕조", "Safavid Empire": "사파비 왕조", "Ottoman Empire": "오스만 제국",
  "Mamluke Sultanate": "맘루크 왕조", "Persia": "페르시아", "Iran": "이란", "Iraq": "이라크", "Turkey": "튀르키예", "Saudi Arabia": "사우디아라비아", "Arabia": "아라비아",
  "Arabs": "아랍인", "Arabian pastoral nomads": "아라비아 유목민", "Bedouins": "베두인", "Scythians": "스키타이", "Bactria": "박트리아", "Oghuz Turks": "오구즈 튀르크",
  "central Asian khanates": "중앙아시아 한국들", "Kazakhstan": "카자흐스탄", "Iranian pastoralists": "이란계 유목민", "Khazars": "하자르",
  // 유럽
  "Roman Empire": "로마 제국", "Rome": "로마", "Rome (Diocletianus)": "로마 제국", "Western Roman Empire": "서로마 제국", "Eastern Roman Empire": "동로마 제국", "Byzantine Empire": "비잔티움 제국",
  "Carolingian Empire": "카롤루스 왕조 (프랑크 왕국)", "Frankish Kingdom": "프랑크 왕국", "Holy Roman Empire": "신성 로마 제국", "Kingdom of France": "프랑스 왕국", "France": "프랑스",
  "Spain": "에스파냐", "Portugal": "포르투갈", "England": "잉글랜드", "United Kingdom": "영국", "Great Britain": "영국", "Kievan Rus": "키예프 공국", "Kyivan Rus": "키예프 공국",
  "Grand Duchy of Moscow": "모스크바 대공국", "Tsardom of Muscovy": "러시아 차르국", "Russian Empire": "러시아 제국", "USSR": "소련", "Russia": "러시아", "Poland-Lithuania": "폴란드·리투아니아",
  "Polish–Lithuanian Commonwealth": "폴란드·리투아니아 연방", "Sweden": "스웨덴", "Denmark-Norway": "덴마크·노르웨이", "Austrian Empire": "오스트리아 제국", "Austro-Hungarian Empire": "오스트리아·헝가리 제국",
  "Austria Hungary": "오스트리아·헝가리 제국", "German Empire": "독일 제국", "Germany": "독일", "Prussia": "프로이센", "Italy": "이탈리아", "Greece": "그리스", "Hunnic Empire": "훈 제국",
  "Visigoths": "서고트", "Ostrogoths": "동고트", "Visigothic Kingdom": "서고트 왕국", "Emirate of Córdoba": "후우마이야 왕조", "Slavonic tribes": "슬라브족", "Slavic tribes": "슬라브족",
  "Celts": "켈트족", "Germans": "게르만족", "Urnfield cultures": "언필드 문화", "N. European Bronze Age cultures": "북유럽 청동기 문화", "Yamnaya culture": "얌나야 문화",
  "Carthaginian Empire": "카르타고", "Ptolemaic Kingdom": "프톨레마이오스 왕조", "Macedonia": "마케도니아", "Athens": "아테네", "Sparta": "스파르타",
  // 아프리카
  "Egypt": "이집트", "Naquada I": "나카다 문화", "Meroe": "메로에", "Axum": "악숨 왕국", "Mali": "말리 제국", "Songhai": "송가이 제국", "Abyssinia": "에티오피아 (아비시니아)",
  "Ethiopia": "에티오피아", "Bantu": "반투족", "Bantu peoples": "반투족", "Khoisan": "코이산족", "Saharan pastoral nomads": "사하라 유목민", "Berbers": "베르베르족", "Touareg": "투아레그족",
  "Tuaregs": "투아레그족", "French West Africa": "프랑스령 서아프리카", "French Equatorial Africa": "프랑스령 적도 아프리카", "Belgian Congo": "벨기에령 콩고", "Anglo-Egyptian Sudan": "영국·이집트령 수단",
  "Union of South Africa": "남아프리카 연방", "Algeria": "알제리", "Algeria (France)": "프랑스령 알제리", "Morocco": "모로코", "Libya": "리비아", "Sudan": "수단",
  "German E. Africa (Tanganyika)": "독일령 동아프리카", "German South-West Africa": "독일령 남서아프리카", "Kamerun": "독일령 카메룬", "British East Africa": "영국령 동아프리카",
  "Angola (Portugal)": "포르투갈령 앙골라", "Mozambique (Portugal)": "포르투갈령 모잠비크", "Rhodesia": "로디지아", "Cape Colony": "케이프 식민지", "Sokoto Caliphate": "소코토 칼리프국",
  "Almoravid dynasty": "무라비트 왕조", "Madagascar (France)": "프랑스령 마다가스카르", "Ethiopia (Italy)": "이탈리아령 에티오피아", "Italian Somaliland": "이탈리아령 소말릴란드",
  // 아메리카·오세아니아
  "Archaic Amerindian hunter-gatherers": "아메리카 원주민 (수렵 채집)", "Norte Chico": "노르테 치코 문명", "Valdivia": "발디비아 문화", "United States": "미국", "United States of America": "미국", "Canada": "캐나다", "Mexico": "멕시코",
  "Brazil": "브라질", "Argentina": "아르헨티나", "Chile": "칠레", "Peru": "페루", "Colombia": "콜롬비아", "Venezuela": "베네수엘라", "Bolivia": "볼리비아",
  "Viceroyalty of New Spain": "누에바에스파냐 부왕령", "Viceroyalty of Peru": "페루 부왕령", "Viceroyalty of Brazil": "포르투갈령 브라질", "Portuguese Brazil": "포르투갈령 브라질",
  "Viceroyalty of New Granada": "누에바그라나다 부왕령", "Viceroyalty of the Río de la Plata": "리오데라플라타 부왕령", "Kingdom of Brazil": "브라질 왕국", "Rupert's Land": "루퍼트 랜드",
  "Luisiana": "루이지애나", "Inca Empire": "잉카 제국", "Aztec Empire": "아스테카 제국", "Maya": "마야", "Inuit": "이누이트", "Greenland": "그린란드",
  "Australia": "오스트레일리아", "Aboriginal tribes": "오스트레일리아 원주민", "Australian aboriginal hunter-gatherers": "오스트레일리아 원주민", "New South Wales": "뉴사우스웨일스",
  "Antarctica": "남극 대륙",
};

/** 시기에 따라 가리키는 나라가 다른 이름입니다. */
export const periodNames: Record<string, Record<string, string>> = {
  bc2000: { "Koreans": "한반도·만주의 주민" },
  bc1500: { "Zhoa": "상(商)", "Paleo-Koreans": "한반도의 청동기 문화" },
  bc1000: { "Zhoa": "주(周)", "Paleo-Koreans": "한반도의 청동기 문화" },
  400: { "Jin": "동진" },
  500: { "Jin Empire": "남조" },
  1100: { "Jin Empire": "금" },
  900: { "Yamato": "일본" },
  1279: { "Great Khanate": "원 (몽골 제국)" },
  1938: { "Manchuria": "만주국" },
  1945: { "Manchuria": "만주 (소련군 점령)", "China": "중화민국" },
};
