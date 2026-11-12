/*
 * 제품 데이터
 * 장비를 추가/수정할 때는 이 배열만 편집하면 카탈로그에 자동 반영됩니다.
 *   category: "generator" | "pump" | "compressor" | "etc"
 *   spec:     주요 사양 (배열)
 *   status:   "available" (임대 가능) | "reserved" (예약 중)
 */
const PRODUCTS = [
  {
    id: "gen-10kva",
    name: "디젤 발전기 10kVA",
    category: "generator",
    summary: "소규모 현장·행사용 저소음 발전기",
    spec: ["정격출력 10kVA", "연료: 경유", "저소음 방음 케이스"],
    status: "available"
  },
  {
    id: "gen-50kva",
    name: "디젤 발전기 50kVA",
    category: "generator",
    summary: "건설 현장 전원 공급용 중형 발전기",
    spec: ["정격출력 50kVA", "연료: 경유", "자동 전압 조정"],
    status: "available"
  },
  {
    id: "gen-150kva",
    name: "디젤 발전기 150kVA",
    category: "generator",
    summary: "공장·대규모 현장 비상 전원용",
    spec: ["정격출력 150kVA", "연료: 경유", "자동 전환(ATS) 호환"],
    status: "reserved"
  },
  {
    id: "pump-2inch",
    name: "엔진 양수기 2인치",
    category: "pump",
    summary: "배수·관개용 휴대형 양수기",
    spec: ["구경 2인치", "분당 토출량 약 600L", "가솔린 엔진"],
    status: "available"
  },
  {
    id: "pump-4inch",
    name: "엔진 양수기 4인치",
    category: "pump",
    summary: "대량 배수·침수 복구 현장용",
    spec: ["구경 4인치", "분당 토출량 약 2,000L", "디젤 엔진"],
    status: "available"
  },
  {
    id: "pump-submersible",
    name: "수중 펌프",
    category: "pump",
    summary: "지하 공간·터널 등 물 빼기 작업용",
    spec: ["전기식 수중 펌프", "자동 부유 스위치", "방수 등급 IP68"],
    status: "available"
  },
  {
    id: "comp-screw",
    name: "스크루 공기압축기",
    category: "compressor",
    summary: "연속 운전이 필요한 현장용 압축기",
    spec: ["토출압 7 bar", "디젤 구동", "이동식 바퀴 포함"],
    status: "available"
  },
  {
    id: "comp-portable",
    name: "휴대용 공기압축기",
    category: "compressor",
    summary: "소형 공구·도장 작업용",
    spec: ["토출압 8 bar", "전기 구동 (220V)", "탱크 용량 24L"],
    status: "available"
  },
  {
    id: "etc-welder",
    name: "엔진 용접기",
    category: "etc",
    summary: "발전 겸용 엔진 용접기",
    spec: ["정격 전류 300A", "용접 · 발전 겸용", "디젤 엔진"],
    status: "available"
  },
  {
    id: "etc-lift",
    name: "고소작업대",
    category: "etc",
    summary: "높은 곳 작업을 위한 이동식 작업대",
    spec: ["작업 높이 12m", "전동식", "적재 하중 230kg"],
    status: "available"
  }
];

const CATEGORY_LABELS = {
  generator: "발전기",
  pump: "양수기",
  compressor: "공기압축기",
  etc: "기타 장비"
};

const STATUS_LABELS = {
  available: "임대 가능",
  reserved: "예약 중"
};
