import { initAdminGate, showMessage, isDemo } from "./common.js";

/*
 * 견적 요청 관리
 *  - 상태 흐름: 신규 → 연락함 → 견적 발송 → 계약 → 완료 (중간에 취소 가능)
 *  - 요청마다 견적 금액, 처리 메모, 처리 기록을 남깁니다.
 *  - ?demo 로 열면 예시 데이터로 동작하고 아무것도 저장하지 않습니다.
 */
const STATUSES = [
  ["new", "신규"],
  ["contacted", "연락함"],
  ["quoted", "견적 발송"],
  ["contracted", "계약"],
  ["done", "완료"],
  ["canceled", "취소"]
];
const LABEL = Object.fromEntries(STATUSES);
LABEL.in_progress = "연락함"; // 이전 버전 상태 이름
const OPEN = ["new", "contacted", "quoted", "contracted"]; // 아직 끝나지 않은 상태
const OVERDUE_HOURS = 24; // 사이트에 "영업일 기준 하루 안에" 견적을 보낸다고 안내함

const tabsEl = document.getElementById("status-tabs");
const listEl = document.getElementById("inq-list");
const detailEl = document.getElementById("inq-detail");
const searchEl = document.getElementById("inq-search");
const refreshBtn = document.getElementById("refresh-btn");
const noticeEl = document.getElementById("admin-notice");
const overdueEl = document.getElementById("overdue");

let items = [];
let tab = "open";
let selectedId = null;
let adminEmail = "";

/* ---------- 데이터 (Firebase 또는 예시) ---------- */
const hoursAgo = (h) => new Date(Date.now() - h * 3600e3);
const DEMO = [
  { id: "d1", name: "예시건설 김예시", phone: "010-0000-0001", equipment: "발전기", period: "11월 20일부터 12월 5일까지", message: "[디젤 발전기 50kVA] 임대 견적을 요청합니다.\n현장: OO시 OO동 신축 현장, 1대", status: "new", createdAt: hoursAgo(3), history: [] },
  { id: "d2", name: "예시토건", phone: "010-0000-0002", equipment: "엔진양수기", period: "2주", message: "터파기 현장 배수용 4인치 2대 필요합니다.", status: "new", createdAt: hoursAgo(30), history: [] },
  { id: "d3", name: "박예시", phone: "010-0000-0003", equipment: "수중모터", period: "", message: "지하 주차장 침수 복구용", status: "contacted", createdAt: hoursAgo(52), adminMemo: "현장 사진 받기로 함", history: [{ at: hoursAgo(50), status: "contacted", by: "demo@example.com", note: "통화함" }] },
  { id: "d4", name: "예시이벤트", phone: "010-0000-0004", equipment: "발전기", period: "12월 24일 하루", message: "야외 행사 조명용 소형 발전기", status: "quoted", quoteAmount: 0, createdAt: hoursAgo(80), history: [] },
  { id: "d5", name: "예시설비", phone: "010-0000-0005", equipment: "기타 장비", period: "1개월", message: "공기압축기 임대 가능할까요?", status: "done", createdAt: hoursAgo(200), history: [] }
];
const api = isDemo
  ? {
      fetchInquiries: async () => DEMO.map((d) => ({ ...d, history: [...d.history] })),
      updateInquiry: async () => {},
      deleteInquiry: async () => {}
    }
  : await import("../js/firebase.js");

/* ---------- 도움 함수 ---------- */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
const pad = (n) => String(n).padStart(2, "0");
function fmt(d) {
  if (!d) return "-";
  return d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function ago(d) {
  if (!d) return "";
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 60) return m + "분 전";
  if (m < 60 * 24) return Math.floor(m / 60) + "시간 전";
  return Math.floor(m / 1440) + "일 전";
}
const isOverdue = (i) => i.status === "new" && i.createdAt && Date.now() - i.createdAt.getTime() > OVERDUE_HOURS * 3600e3;
const telHref = (p) => "tel:" + String(p || "").replace(/[^0-9+]/g, "");
const won = (n) => Number(n).toLocaleString("ko-KR") + "원";

function matches(i, q) {
  if (!q) return true;
  const hay = [i.name, i.phone, i.equipment, i.period, i.message, i.adminMemo].join(" ").toLowerCase().replace(/\s+/g, "");
  return hay.includes(q.toLowerCase().replace(/\s+/g, ""));
}
function inTab(i) {
  if (tab === "all") return true;
  if (tab === "open") return OPEN.includes(i.status) || i.status === "in_progress";
  return i.status === tab || (tab === "contacted" && i.status === "in_progress");
}

/* ---------- 화면 ---------- */
function renderTabs() {
  const count = (fn) => items.filter(fn).length;
  const defs = [
    ["open", "처리할 요청", count((i) => OPEN.includes(i.status) || i.status === "in_progress")],
    ...STATUSES.map(([v, l]) => [v, l, count((i) => i.status === v || (v === "contacted" && i.status === "in_progress"))]),
    ["all", "전체", items.length]
  ];
  tabsEl.innerHTML = "";
  defs.forEach(([v, l, n]) => {
    const b = el("button", "inq-tab" + (v === "new" && n ? " has-new" : ""));
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(tab === v));
    b.dataset.tab = v;
    b.append(el("span", "", l), el("span", "inq-tab-n", String(n)));
    b.addEventListener("click", () => { tab = v; render(); });
    tabsEl.appendChild(b);
  });

  const late = items.filter(isOverdue);
  overdueEl.hidden = !late.length;
  overdueEl.textContent = late.length
    ? "접수 후 " + OVERDUE_HOURS + "시간이 지나도록 연락하지 않은 신규 요청이 " + late.length + "건 있습니다: " + late.map((i) => i.name).join(", ")
    : "";
}

function renderList() {
  const q = searchEl.value.trim();
  const rows = items.filter((i) => inTab(i) && matches(i, q));
  listEl.innerHTML = "";
  if (!rows.length) {
    listEl.appendChild(el("li", "inq-empty", items.length ? "조건에 맞는 요청이 없습니다." : "아직 들어온 견적 요청이 없습니다."));
    return;
  }
  rows.forEach((i) => {
    const li = el("li");
    const b = el("button", "inq-item" + (i.id === selectedId ? " is-selected" : ""));
    b.type = "button";
    b.dataset.id = i.id;
    const top = el("div", "inq-item-top");
    top.append(el("span", "st st-" + i.status, LABEL[i.status] || i.status));
    if (isOverdue(i)) top.append(el("span", "st st-late", "지연"));
    top.append(el("time", "inq-time", ago(i.createdAt)));
    b.append(top, el("strong", "inq-name", i.name || "(이름 없음)"),
      el("span", "inq-sub", [i.equipment || "장비 미선택", i.phone].filter(Boolean).join(" · ")));
    b.addEventListener("click", () => select(i.id));
    li.appendChild(b);
    listEl.appendChild(li);
  });
}

function row(dl, k, v) {
  const d = el("div");
  d.append(el("dt", "", k));
  const dd = el("dd");
  if (v instanceof Node) dd.appendChild(v); else dd.textContent = v || "-";
  d.appendChild(dd);
  dl.appendChild(d);
}

function renderDetail() {
  const i = items.find((x) => x.id === selectedId);
  detailEl.innerHTML = "";
  if (!i) {
    detailEl.appendChild(el("p", "hint", items.length ? "왼쪽 목록에서 견적 요청을 고르세요." : "견적 요청이 들어오면 여기에서 처리합니다."));
    return;
  }

  const head = el("div", "inq-d-head");
  const back = el("button", "btn-small inq-back", "← 목록");
  back.type = "button";
  back.addEventListener("click", () => { selectedId = null; render(); });
  head.append(back, el("span", "st st-" + i.status, LABEL[i.status] || i.status));
  if (isOverdue(i)) head.append(el("span", "st st-late", "지연"));
  detailEl.append(head, el("h2", "inq-d-name", i.name || "(이름 없음)"));

  // 연락 버튼
  const contact = el("div", "inq-contact");
  const call = el("a", "btn btn-primary btn-sm", "전화 걸기");
  call.href = telHref(i.phone);
  const sms = el("a", "btn-small", "문자 보내기");
  sms.href = "sms:" + String(i.phone || "").replace(/[^0-9+]/g, "");
  const copy = el("button", "btn-small", "번호 복사");
  copy.type = "button";
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(i.phone || ""); copy.textContent = "복사됨"; }
    catch { copy.textContent = i.phone; }
    setTimeout(() => (copy.textContent = "번호 복사"), 1500);
  });
  contact.append(call, sms, copy);
  detailEl.appendChild(contact);

  // 요청 내용
  const dl = el("dl", "inq-fields");
  row(dl, "연락처", i.phone);
  row(dl, "필요한 장비", i.equipment);
  row(dl, "임대 기간", i.period);
  row(dl, "접수", fmt(i.createdAt) + " (" + ago(i.createdAt) + ")");
  row(dl, "요청 사항", el("p", "inq-msg", i.message || "-"));
  detailEl.appendChild(dl);

  // 처리
  const form = el("form", "inq-form");
  form.noValidate = true;
  form.innerHTML = "";
  const stWrap = el("fieldset", "inq-status-pick");
  stWrap.appendChild(el("legend", "", "처리 상태"));
  const cur = i.status === "in_progress" ? "contacted" : i.status;
  STATUSES.forEach(([v, l]) => {
    const lab = el("label");
    const r = document.createElement("input");
    r.type = "radio"; r.name = "status"; r.value = v; r.checked = v === cur;
    lab.append(r, el("span", "", l));
    stWrap.appendChild(lab);
  });
  form.appendChild(stWrap);

  const grid = el("div", "form-grid");
  grid.innerHTML =
    '<div class="field"><label for="f-quote">견적 금액 (원)</label><input id="f-quote" name="quote" type="number" min="0" step="1000" placeholder="견적을 보냈다면 입력"></div>' +
    '<div class="field full"><label for="f-memo">처리 메모</label><textarea id="f-memo" name="memo" rows="3" placeholder="통화 내용, 현장 조건, 다음에 할 일"></textarea></div>' +
    '<div class="field full"><label for="f-note">처리 기록에 남길 한 줄 (선택)</label><input id="f-note" name="note" type="text" placeholder="예: 견적서 문자로 보냄"></div>';
  form.appendChild(grid);
  form.elements.quote.value = i.quoteAmount || "";
  form.elements.memo.value = i.adminMemo || "";

  const actions = el("div", "form-actions");
  const save = el("button", "btn btn-primary btn-inline", "저장");
  save.type = "submit";
  const del = el("button", "btn-small danger", "삭제");
  del.type = "button";
  let armed = false;
  del.addEventListener("click", () => {
    if (!armed) { armed = true; del.textContent = "한 번 더 누르면 삭제"; setTimeout(() => { armed = false; del.textContent = "삭제"; }, 4000); return; }
    removeItem(i);
  });
  actions.append(save, del);
  form.appendChild(actions);
  form.addEventListener("submit", (e) => { e.preventDefault(); saveItem(i, form, save); });
  detailEl.appendChild(form);

  // 처리 기록
  const hist = (i.history || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
  const hWrap = el("div", "inq-history");
  hWrap.appendChild(el("h3", "", "처리 기록"));
  const ul = el("ul");
  hist.forEach((h) => {
    const li = el("li");
    li.append(el("time", "", fmt(h.at)), el("span", "", [LABEL[h.status] ? "상태: " + LABEL[h.status] : "", h.note, h.quoteAmount ? "견적 " + won(h.quoteAmount) : ""].filter(Boolean).join(" · ")));
    if (h.by) li.append(el("span", "hint", h.by));
    ul.appendChild(li);
  });
  const first = el("li");
  first.append(el("time", "", fmt(i.createdAt)), el("span", "", "견적 요청 접수"));
  ul.appendChild(first);
  hWrap.appendChild(ul);
  detailEl.appendChild(hWrap);
}

function render() {
  renderTabs();
  renderList();
  renderDetail();
  document.querySelector(".inq-layout").classList.toggle("has-detail", Boolean(selectedId));
}

function select(id) {
  selectedId = id;
  render();
  if (window.matchMedia("(max-width: 860px)").matches) detailEl.scrollIntoView({ block: "start" });
}

/* ---------- 저장 / 삭제 ---------- */
async function saveItem(i, form, btn) {
  const status = form.elements.status.value;
  const quote = Number(form.elements.quote.value) || null;
  const memo = form.elements.memo.value.trim();
  const note = form.elements.note.value.trim();
  const changed = status !== i.status;
  const quoteChanged = (quote || null) !== (i.quoteAmount || null);
  const fields = { status, quoteAmount: quote, adminMemo: memo };
  const entry = changed || note || quoteChanged
    ? { status: changed ? status : "", note, quoteAmount: quoteChanged ? quote : null, by: adminEmail }
    : null;

  btn.disabled = true;
  try {
    await api.updateInquiry(i.id, fields, entry);
    Object.assign(i, fields);
    if (entry) i.history = [...(i.history || []), { ...entry, at: new Date() }];
    showMessage(noticeEl, changed ? "'" + LABEL[status] + "'(으)로 바꾸고 저장했습니다." : "저장했습니다.");
    render();
  } catch (err) {
    console.error(err);
    showMessage(noticeEl, "저장하지 못했습니다. 인터넷 연결이나 관리자 권한을 확인해 주세요.", "error");
  } finally {
    btn.disabled = false;
  }
}

async function removeItem(i) {
  try {
    await api.deleteInquiry(i.id);
    items = items.filter((x) => x.id !== i.id);
    selectedId = null;
    showMessage(noticeEl, "삭제했습니다.");
    render();
  } catch (err) {
    console.error(err);
    showMessage(noticeEl, "삭제하지 못했습니다.", "error");
  }
}

async function load() {
  refreshBtn.disabled = true;
  try {
    items = await api.fetchInquiries();
    if (selectedId && !items.some((i) => i.id === selectedId)) selectedId = null;
    render();
  } catch (err) {
    console.error(err);
    showMessage(noticeEl, "견적 요청을 불러오지 못했습니다. Firestore 보안 규칙을 확인해 주세요.", "error");
  } finally {
    refreshBtn.disabled = false;
  }
}

searchEl.addEventListener("input", renderList);
refreshBtn.addEventListener("click", load);

initAdminGate((user) => {
  adminEmail = (user && user.email) || "";
  load();
  // 열어 둔 동안 5분마다 새 요청을 확인
  if (!isDemo) setInterval(load, 5 * 60 * 1000);
});
