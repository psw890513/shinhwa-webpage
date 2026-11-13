/*
 * 기본 데이터 (Firebase 설정 전, 또는 Firestore가 비어 있을 때 사용)
 *   category: "generator" | "pump" | "motor" | "etc"
 *   rating:   규격. "숫자 단위" 형식 (예: "10 kVA")
 *   art:      사진이 없을 때 쓸 그림. "generator" | "pump" | "motor" | "compressor" | "welder"
 *   image:    실제 사진 주소 (있으면 그림 대신 표시)
 *   prices:   임대료(원). { day, week, month } 중 아는 것만. 없으면 "견적 문의"로 표시
 *   status:   "available" (출고 가능) | "reserved" (예약 중)
 */
const PRODUCTS = [
  { id: "gen-10kva", name: "디젤 발전기 10kVA", category: "generator", rating: "10 kVA", art: "generator",
    summary: "소규모 현장과 행사용", spec: ["연료 경유", "저소음 방음형"], status: "available" },
  { id: "gen-50kva", name: "디젤 발전기 50kVA", category: "generator", rating: "50 kVA", art: "generator",
    summary: "건설 현장 전원용", spec: ["연료 경유", "자동 전압 조정"], status: "available" },
  { id: "gen-150kva", name: "디젤 발전기 150kVA", category: "generator", rating: "150 kVA", art: "generator",
    summary: "공장 비상 전원용", spec: ["연료 경유", "ATS 연동"], status: "reserved" },
  { id: "gen-500kva", name: "디젤 발전기 500kVA", category: "generator", rating: "500 kVA", art: "generator",
    summary: "대형 설비 전원용", spec: ["연료 경유", "트레일러 탑재형"], status: "available" },
  { id: "pump-2inch", name: "엔진양수기 2인치", category: "pump", rating: "2 인치", art: "pump",
    summary: "배수와 관개용 휴대형", spec: ["분당 약 600L", "가솔린 엔진"], status: "available" },
  { id: "pump-4inch", name: "엔진양수기 4인치", category: "pump", rating: "4 인치", art: "pump",
    summary: "침수 복구 현장용", spec: ["분당 약 2,000L", "디젤 엔진"], status: "available" },
  { id: "pump-6inch", name: "엔진양수기 6인치", category: "pump", rating: "6 인치", art: "pump",
    summary: "저수지와 하천 공사용", spec: ["분당 약 4,500L", "디젤 엔진"], status: "reserved" },
  { id: "motor-3hp", name: "수중모터 3HP", category: "motor", rating: "3 HP", art: "motor",
    summary: "지하 공간과 터널 물빼기", spec: ["단상 220V", "자동 부유 스위치"], status: "available" },
  { id: "motor-10hp", name: "수중모터 10HP", category: "motor", rating: "10 HP", art: "motor",
    summary: "터파기 현장 배수용", spec: ["삼상 380V", "토출 구경 4인치"], status: "available" },
  { id: "etc-compressor", name: "스크루 공기압축기", category: "etc", rating: "7 bar", art: "compressor",
    summary: "연속 운전 현장용", spec: ["디젤 구동", "이동식"], status: "available" },
  { id: "etc-welder", name: "엔진 용접기", category: "etc", rating: "300 A", art: "welder",
    summary: "발전 겸용", spec: ["용접과 발전 겸용", "디젤 엔진"], status: "available" }
];

const CATEGORY_LABELS = {
  generator: "발전기",
  pump: "엔진양수기",
  motor: "수중모터",
  etc: "기타 장비",
  compressor: "공기압축기" // 이전 데이터 호환용
};

// 구분별 기본 그림 (art 값이 없을 때)
const CATEGORY_ART = { generator: "generator", pump: "pump", motor: "motor", etc: "compressor", compressor: "compressor" };

const STATUS_LABELS = {
  available: "출고 가능",
  reserved: "예약 중"
};

// 공지사항 (예시). 실제 공지로 바꿔 주세요. 최신순으로 적습니다.
const NOTICES = [
  { title: "동절기 발전기 임대 예약 안내", date: "2026-11-02" },
  { title: "엔진양수기 6인치 새로 들어왔습니다", date: "2026-10-20" },
  { title: "추석 연휴 운영 시간 안내", date: "2026-09-25" },
  { title: "장마철 양수기 임대는 미리 예약해 주세요", date: "2026-07-01" },
  { title: "홈페이지를 새로 열었습니다", date: "2026-06-15" }
];
