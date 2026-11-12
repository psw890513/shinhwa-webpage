/*
 * 기본 데이터 (Firebase 설정 전, 또는 Firestore가 비어 있을 때 사용)
 *   category: "generator" | "pump" | "motor" | "etc"
 *   status:   "available" (임대 가능) | "reserved" (예약 중)
 */
const PRODUCTS = [
  {
    id: "gen-10kva",
    name: "디젤 발전기 10kVA",
    category: "generator",
    summary: "소규모 현장·행사용 저소음 발전기",
    spec: ["정격출력 10kVA", "연료: 경유", "저소음 방음형"],
    status: "available"
  },
  {
    id: "gen-50kva",
    name: "디젤 발전기 50kVA",
    category: "generator",
    summary: "건설 현장 전원 공급용",
    spec: ["정격출력 50kVA", "연료: 경유", "자동 전압 조정"],
    status: "available"
  },
  {
    id: "gen-150kva",
    name: "디젤 발전기 150kVA",
    category: "generator",
    summary: "공장·대규모 현장 비상 전원용",
    spec: ["정격출력 150kVA", "연료: 경유", "ATS 연동 가능"],
    status: "reserved"
  },
  {
    id: "gen-500kva",
    name: "디젤 발전기 500kVA",
    category: "generator",
    summary: "정전 대비·대형 설비 전원용",
    spec: ["정격출력 500kVA", "연료: 경유", "트레일러 탑재형"],
    status: "available"
  },
  {
    id: "pump-2inch",
    name: "엔진양수기 2인치",
    category: "pump",
    summary: "배수·관개용 휴대형",
    spec: ["구경 2인치", "토출량 약 600L/분", "가솔린 엔진"],
    status: "available"
  },
  {
    id: "pump-4inch",
    name: "엔진양수기 4인치",
    category: "pump",
    summary: "대량 배수·침수 복구 현장용",
    spec: ["구경 4인치", "토출량 약 2,000L/분", "디젤 엔진"],
    status: "available"
  },
  {
    id: "pump-6inch",
    name: "엔진양수기 6인치",
    category: "pump",
    summary: "저수지·하천 공사 배수용",
    spec: ["구경 6인치", "토출량 약 4,500L/분", "디젤 엔진"],
    status: "reserved"
  },
  {
    id: "motor-3hp",
    name: "수중모터 3HP",
    category: "motor",
    summary: "지하 공간·터널 물빼기용",
    spec: ["출력 3HP", "단상 220V", "자동 부유 스위치"],
    status: "available"
  },
  {
    id: "motor-10hp",
    name: "수중모터 10HP",
    category: "motor",
    summary: "공사장 터파기 배수용",
    spec: ["출력 10HP", "삼상 380V", "토출 구경 4인치"],
    status: "available"
  },
  {
    id: "etc-compressor",
    name: "스크루 공기압축기",
    category: "etc",
    summary: "연속 운전이 필요한 현장용",
    spec: ["토출압 7bar", "디젤 구동", "이동식"],
    status: "available"
  },
  {
    id: "etc-welder",
    name: "엔진 용접기",
    category: "etc",
    summary: "발전 겸용 엔진 용접기",
    spec: ["정격 전류 300A", "용접·발전 겸용", "디젤 엔진"],
    status: "available"
  }
];

const CATEGORY_LABELS = {
  generator: "발전기",
  pump: "엔진양수기",
  motor: "수중모터",
  etc: "기타 장비",
  compressor: "공기압축기" // 이전 데이터 호환용
};

const STATUS_LABELS = {
  available: "임대 가능",
  reserved: "예약 중"
};

// 공지사항 (예시). 실제 공지로 바꿔 주세요.
const NOTICES = [
  { title: "동절기 발전기 임대 예약 안내", date: "2026-11-02" },
  { title: "엔진양수기 6인치 신규 입고", date: "2026-10-20" },
  { title: "추석 연휴 운영 시간 안내", date: "2026-09-25" },
  { title: "장마철 침수 대비 양수기 임대 문의 증가 안내", date: "2026-07-01" },
  { title: "홈페이지를 새로 열었습니다", date: "2026-06-15" }
];
