import * as gh from "./github.js";

/*
 * 콘텐츠 관리: 장비, 공지사항, 회사 정보, 배너
 * 내용은 data/content.json 하나에 들어 있고, "GitHub에 저장"을 누르면 저장소에 기록됩니다.
 * 저장 전까지는 이 화면에서만 바뀝니다.
 */
const CATEGORIES = { generator: "발전기", pump: "엔진양수기", motor: "수중모터", etc: "기타 장비" };
const ARTS = { generator: "발전기", pump: "엔진양수기", motor: "수중모터", compressor: "공기압축기", welder: "용접기" };
const STATUS = { available: "출고 가능", reserved: "예약 중" };
const COMPANY_FIELDS = [
  ["phone", "대표 전화", "text", "예: 031-000-0000"],
  ["fax", "팩스", "text", ""],
  ["email", "이메일", "email", "견적 요청 메일을 받을 주소"],
  ["address", "주소", "text", "오시는 길과 지도 검색에 쓰임"],
  ["ceo", "대표이사", "text", ""],
  ["bizNo", "사업자등록번호", "text", "000-00-00000"],
  ["hours", "운영 시간", "textarea", "줄을 바꾸면 사이트에서도 줄이 바뀝니다"],
  ["intro", "회사소개 첫 문장", "textarea", "회사소개 페이지 맨 위 문장"]
];

const panel = document.getElementById("panel");
const noticeEl = document.getElementById("admin-notice");
const saveBar = document.getElementById("save-bar");
const saveBtn = document.getElementById("save-btn");

let data = null;      // 지금 화면의 내용
let original = "";    // 마지막으로 불러오거나 저장한 내용 (변경 확인용)
let sha = null;       // GitHub 파일 버전
let tab = "products";
let editing = null;   // { kind, index } 편집 중인 항목 (-1은 새 항목)

/* ---------- 도움 함수 ---------- */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function message(msg, type) {
  noticeEl.textContent = msg;
  noticeEl.className = "notice" + (type === "error" ? " notice-error" : type === "ok" ? " notice-ok" : "");
  noticeEl.hidden = !msg;
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const imgSrc = (p) => (!p ? "" : /^(https?:|data:|\/)/.test(p) ? p : "../" + p);
const won = (n) => (n ? Number(n).toLocaleString("ko-KR") + "원" : "");
function markDirty() {
  saveBar.hidden = JSON.stringify(data) === original;
}
function field(label, input, opts = {}) {
  const f = el("div", "field" + (opts.full ? " full" : ""));
  const l = el("label", "", label);
  l.htmlFor = input.id;
  f.append(l, input);
  if (opts.hint) f.append(el("p", "hint", opts.hint));
  return f;
}
let uid = 0;
function input(type, value, placeholder) {
  const i = document.createElement(type === "textarea" ? "textarea" : "input");
  if (type !== "textarea") i.type = type;
  i.id = "f" + ++uid;
  i.value = value == null ? "" : value;
  if (placeholder) i.placeholder = placeholder;
  if (type === "textarea") i.rows = 3;
  return i;
}
function select(options, value) {
  const s = document.createElement("select");
  s.id = "f" + ++uid;
  Object.entries(options).forEach(([v, l]) => {
    const o = el("option", "", l);
    o.value = v;
    s.appendChild(o);
  });
  s.value = value || Object.keys(options)[0];
  return s;
}
function button(text, cls, onClick) {
  const b = el("button", cls || "btn-small", text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}
// 두 번 눌러야 지워지는 삭제 버튼
function deleteButton(onConfirm) {
  let armed = false;
  const b = button("삭제", "btn-small danger", () => {
    if (!armed) {
      armed = true; b.textContent = "한 번 더 눌러 삭제";
      setTimeout(() => { armed = false; b.textContent = "삭제"; }, 4000);
      return;
    }
    onConfirm();
  });
  return b;
}
function move(list, i, d) {
  const j = i + d;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  markDirty(); render();
}

// 사진 올리기 입력: 주소 칸 + 파일 선택 + 미리보기
function photoField(value, onChange) {
  const wrap = el("div", "field full photo-field");
  const text = input("text", value, "images/uploads/... 또는 https://... (비우면 그림 사용)");
  const lab = el("label", "", "사진");
  lab.htmlFor = text.id;
  const row = el("div", "photo-row");
  const file = document.createElement("input");
  file.type = "file"; file.accept = "image/*"; file.id = "f" + ++uid;
  const fileLab = el("label", "btn-small photo-btn", "사진 올리기");
  fileLab.htmlFor = file.id;
  const preview = el("img", "photo-preview");
  preview.alt = "";
  const status = el("span", "hint");
  const show = () => { preview.src = imgSrc(text.value.trim()); preview.hidden = !text.value.trim(); };
  text.addEventListener("input", () => { onChange(text.value.trim()); show(); });
  file.addEventListener("change", async () => {
    if (!file.files[0]) return;
    if (!gh.hasToken()) { status.textContent = "사진을 올리려면 먼저 GitHub에 연결해 주세요."; return; }
    status.textContent = "올리는 중…";
    try {
      const path = await gh.uploadImage(file.files[0]);
      text.value = path; onChange(path); show();
      status.textContent = "올렸습니다. 'GitHub에 저장'을 눌러야 사이트에 반영됩니다.";
    } catch (err) {
      console.error(err);
      status.textContent = "사진을 올리지 못했습니다. (" + (err.detail || err.message) + ")";
    }
    file.value = "";
  });
  row.append(text, fileLab, file);
  wrap.append(lab, row, status, preview);
  show();
  return wrap;
}

/* ---------- 장비 ---------- */
function renderProducts() {
  const list = data.products;
  if (editing && editing.kind === "product") return renderProductForm();
  const head = el("div", "toolbar");
  head.append(el("h2", "", "장비 " + list.length + "개"), button("+ 장비 추가", "btn btn-primary btn-inline", () => { editing = { kind: "product", index: -1 }; render(); }));
  panel.append(head, el("p", "hint", "목록 순서가 사이트의 '기본순' 순서입니다. 임대료를 비우면 사이트에 '견적 문의'로 나옵니다."));
  const wrap = el("div", "table-wrap");
  const t = el("table");
  t.innerHTML = "<thead><tr><th>순서</th><th>장비</th><th>구분</th><th>규격</th><th>상태</th><th>1일 임대료</th><th></th></tr></thead>";
  const tb = el("tbody");
  list.forEach((p, i) => {
    const tr = el("tr");
    const ord = el("td"); ord.append(button("↑", "btn-small icon", () => move(list, i, -1)), button("↓", "btn-small icon", () => move(list, i, 1)));
    const name = el("td"); name.append(el("strong", "", p.name)); if (p.image) name.append(el("span", "hint", " 사진"));
    const act = el("td"); const a = el("div", "row-actions");
    a.append(button("수정", "btn-small", () => { editing = { kind: "product", index: i }; render(); }),
      deleteButton(() => { list.splice(i, 1); markDirty(); render(); }));
    act.append(a);
    tr.append(ord, name, el("td", "", CATEGORIES[p.category] || p.category), el("td", "", p.rating || "-"),
      el("td", "", STATUS[p.status] || p.status), el("td", "", won(p.prices && p.prices.day) || "견적 문의"), act);
    tb.appendChild(tr);
  });
  t.appendChild(tb); wrap.appendChild(t); panel.appendChild(wrap);
}

function renderProductForm() {
  const isNew = editing.index < 0;
  const p = isNew ? { id: "", name: "", category: "generator", rating: "", art: "", image: "", prices: {}, summary: "", spec: [], status: "available" } : clone(data.products[editing.index]);
  panel.append(el("h2", "", isNew ? "새 장비" : "장비 수정: " + p.name));
  const form = el("form", "form-grid");
  form.noValidate = true;
  const f = {
    name: input("text", p.name, "예: 디젤 발전기 50kVA"),
    id: input("text", p.id, "비우면 자동으로 만듦"),
    category: select(CATEGORIES, p.category),
    rating: input("text", p.rating, "예: 50 kVA, 4 인치, 3 HP"),
    status: select(STATUS, p.status),
    art: select({ "": "구분에 맞춰 자동", ...ARTS }, p.art || ""),
    day: input("number", (p.prices || {}).day, "비우면 '견적 문의'"),
    week: input("number", (p.prices || {}).week, ""),
    month: input("number", (p.prices || {}).month, ""),
    summary: input("text", p.summary, "예: 건설 현장 전원용"),
    spec: input("textarea", (p.spec || []).join("\n"), "한 줄에 하나씩. 첫 줄이 카드에 나옵니다")
  };
  [f.day, f.week, f.month].forEach((x) => { x.min = 0; x.step = 1000; });
  let image = p.image || "";
  form.append(
    field("장비 이름 *", f.name), field("장비코드", f.id, { hint: "카드에 '장비코드'로 표시됩니다." }),
    field("구분", f.category), field("규격", f.rating),
    field("임대 상태", f.status), field("사진이 없을 때 그림", f.art),
    photoField(image, (v) => (image = v)),
    field("임대료 1일 (원)", f.day), field("임대료 7일 (원)", f.week), field("임대료 30일 (원)", f.month),
    field("한 줄 설명", f.summary, { full: true }), field("주요 사양", f.spec, { full: true })
  );
  const err = el("p", "error"); err.setAttribute("role", "alert");
  const actions = el("div", "form-actions full");
  const ok = el("button", "btn btn-primary btn-inline", isNew ? "목록에 추가" : "변경 적용"); ok.type = "submit";
  actions.append(ok, button("취소", "btn-small", () => { editing = null; render(); }));
  form.append(err, actions);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = f.name.value.trim();
    if (!name) { err.textContent = "장비 이름을 입력해 주세요."; f.name.focus(); return; }
    let id = f.id.value.trim().replace(/\s+/g, "-") || f.category.value.slice(0, 4) + "-" + Date.now().toString(36).slice(-5);
    if (data.products.some((x, i) => x.id === id && i !== editing.index)) { err.textContent = "같은 장비코드가 이미 있습니다."; f.id.focus(); return; }
    const num = (x) => Number(x.value) || null;
    const prices = {};
    if (num(f.day)) prices.day = num(f.day);
    if (num(f.week)) prices.week = num(f.week);
    if (num(f.month)) prices.month = num(f.month);
    const item = {
      id, name, category: f.category.value, rating: f.rating.value.trim(), art: f.art.value, image,
      prices, summary: f.summary.value.trim(),
      spec: f.spec.value.split("\n").map((s) => s.trim()).filter(Boolean), status: f.status.value
    };
    if (isNew) data.products.push(item); else data.products[editing.index] = item;
    editing = null; markDirty(); render();
    message((isNew ? "장비를 추가했습니다." : "장비를 고쳤습니다.") + " 'GitHub에 저장'을 눌러야 사이트에 반영됩니다.", "ok");
  });
  panel.appendChild(form);
  f.name.focus();
}

/* ---------- 공지사항 ---------- */
function renderNotices() {
  const list = data.notices;
  if (editing && editing.kind === "notice") return renderNoticeForm();
  const head = el("div", "toolbar");
  head.append(el("h2", "", "공지 " + list.length + "개"), button("+ 공지 추가", "btn btn-primary btn-inline", () => { editing = { kind: "notice", index: -1 }; render(); }));
  panel.append(head, el("p", "hint", "날짜가 최신인 공지가 위에 나옵니다. 첫 화면에는 최신 3개만 보입니다."));
  const ul = el("ul", "admin-list");
  if (!list.length) ul.append(el("li", "hint", "공지가 없습니다."));
  list.forEach((n, i) => {
    const li = el("li");
    const txt = el("div");
    txt.append(el("time", "hint", n.date), el("strong", "", n.title));
    if (n.body) txt.append(el("span", "hint", "내용 있음"));
    const a = el("div", "row-actions");
    a.append(button("수정", "btn-small", () => { editing = { kind: "notice", index: i }; render(); }),
      deleteButton(() => { list.splice(i, 1); markDirty(); render(); }));
    li.append(txt, a);
    ul.appendChild(li);
  });
  panel.appendChild(ul);
}

function renderNoticeForm() {
  const isNew = editing.index < 0;
  const n = isNew ? { title: "", date: new Date().toISOString().slice(0, 10), body: "" } : clone(data.notices[editing.index]);
  panel.append(el("h2", "", isNew ? "새 공지" : "공지 수정"));
  const form = el("form", "form-grid"); form.noValidate = true;
  const title = input("text", n.title, "예: 설 연휴 운영 시간 안내");
  const date = input("date", n.date);
  const body = input("textarea", n.body, "비워 두면 제목만 나옵니다");
  body.rows = 6;
  form.append(field("제목 *", title, { full: true }), field("날짜", date), field("내용", body, { full: true }));
  const err = el("p", "error"); err.setAttribute("role", "alert");
  const actions = el("div", "form-actions full");
  const ok = el("button", "btn btn-primary btn-inline", isNew ? "목록에 추가" : "변경 적용"); ok.type = "submit";
  actions.append(ok, button("취소", "btn-small", () => { editing = null; render(); }));
  form.append(err, actions);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!title.value.trim()) { err.textContent = "제목을 입력해 주세요."; title.focus(); return; }
    const item = { title: title.value.trim(), date: date.value || new Date().toISOString().slice(0, 10), body: body.value.trim() };
    if (isNew) data.notices.push(item); else data.notices[editing.index] = item;
    data.notices.sort((a, b) => b.date.localeCompare(a.date));
    editing = null; markDirty(); render();
    message("공지를 " + (isNew ? "추가" : "수정") + "했습니다. 'GitHub에 저장'을 눌러야 사이트에 반영됩니다.", "ok");
  });
  panel.appendChild(form);
  title.focus();
}

/* ---------- 회사 정보 ---------- */
function renderCompany() {
  panel.append(el("h2", "", "회사 정보"), el("p", "hint", "여기서 바꾸면 5개 페이지의 머리글, 본문, 하단, 전화 버튼에 한 번에 반영됩니다."));
  const form = el("div", "form-grid");
  COMPANY_FIELDS.forEach(([key, label, type, ph]) => {
    const i = input(type, data.company[key], ph);
    i.addEventListener("input", () => { data.company[key] = i.value; markDirty(); });
    form.append(field(label, i, { full: type === "textarea" || key === "address" }));
  });
  panel.appendChild(form);
}

/* ---------- 배너 ---------- */
function renderBanner() {
  const list = data.banner;
  const head = el("div", "toolbar");
  head.append(el("h2", "", "첫 화면 배너 " + list.length + "장"));
  if (list.length < 5) head.append(button("+ 배너 추가", "btn btn-primary btn-inline", () => {
    list.push({ bg: "", art: "generator", image: "", title: "", desc: "" }); markDirty(); render();
  }));
  panel.append(head, el("p", "hint", "5초마다 넘어갑니다. 큰 글자는 그림 뒤에 옅게 깔리는 글자입니다(짧게: 500kVA, 6INCH)."));
  list.forEach((b, i) => {
    const box = el("fieldset", "banner-box");
    box.append(el("legend", "", (i + 1) + "번 배너"));
    const grid = el("div", "form-grid");
    const bind = (key, node) => node.addEventListener("input", () => { b[key] = node.value; markDirty(); });
    const bg = input("text", b.bg, "예: 500kVA"); bind("bg", bg);
    const art = select(ARTS, b.art); art.addEventListener("change", () => { b.art = art.value; markDirty(); });
    const title = input("text", b.title, "예: 디젤 발전기 500kVA"); bind("title", title);
    const desc = input("text", b.desc, "예: 대형 설비 전원용"); bind("desc", desc);
    grid.append(field("제목 (굵은 글씨)", title), field("설명", desc), field("큰 배경 글자", bg), field("그림 (사진이 없을 때)", art),
      photoField(b.image, (v) => { b.image = v; markDirty(); }));
    const actions = el("div", "row-actions");
    actions.append(button("↑ 앞으로", "btn-small", () => move(list, i, -1)), button("↓ 뒤로", "btn-small", () => move(list, i, 1)));
    if (list.length > 1) actions.append(deleteButton(() => { list.splice(i, 1); markDirty(); render(); }));
    box.append(grid, actions);
    panel.appendChild(box);
  });
}

/* ---------- 화면 전환 ---------- */
function render() {
  panel.innerHTML = "";
  document.querySelectorAll(".inq-tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === tab)));
  if (!data) { panel.append(el("p", "hint", "콘텐츠를 불러오지 못했습니다. 새로고침해 주세요.")); return; }
  ({ products: renderProducts, notices: renderNotices, company: renderCompany, banner: renderBanner })[tab]();
  markDirty();
}
document.querySelectorAll(".inq-tab").forEach((t) => t.addEventListener("click", () => {
  tab = t.dataset.tab; editing = null; message(""); render();
}));

/* ---------- 불러오기 / 저장 ---------- */
async function load() {
  try {
    if (gh.hasToken()) {
      const r = await gh.loadContent();
      data = r.data; sha = r.sha;
    } else {
      const res = await fetch("../data/content.json?v=" + Date.now());
      data = await res.json(); sha = null;
    }
    data.products ||= []; data.notices ||= []; data.banner ||= []; data.company ||= {};
    original = JSON.stringify(data);
  } catch (err) {
    console.error(err);
    message(err.status === 401 ? "GitHub 토큰이 만료되었거나 잘못되었습니다. 다시 연결해 주세요." : "콘텐츠를 불러오지 못했습니다.", "error");
    if (err.status === 401) { gh.clearToken(); showConnection(); return load(); }
  }
  render();
}

function summarize() {
  try {
    const before = JSON.parse(original);
    const parts = [];
    if (JSON.stringify(before.products) !== JSON.stringify(data.products)) parts.push("장비");
    if (JSON.stringify(before.notices) !== JSON.stringify(data.notices)) parts.push("공지");
    if (JSON.stringify(before.company) !== JSON.stringify(data.company)) parts.push("회사 정보");
    if (JSON.stringify(before.banner) !== JSON.stringify(data.banner)) parts.push("배너");
    return "콘텐츠 수정: " + (parts.join(", ") || "내용");
  } catch { return "콘텐츠 수정"; }
}

saveBtn.addEventListener("click", async () => {
  if (!gh.hasToken()) {
    message("저장하려면 먼저 위에서 GitHub에 연결해 주세요. 고친 내용은 이 화면에 그대로 남아 있습니다.", "error");
    document.getElementById("gh-card").scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (editing) { message("편집 중인 항목을 먼저 '변경 적용'하거나 취소해 주세요.", "error"); return; }
  saveBtn.disabled = true; saveBtn.textContent = "저장하는 중…";
  try {
    data.updatedAt = new Date().toISOString().slice(0, 10);
    if (!sha) sha = (await gh.loadContent()).sha;
    sha = await gh.saveContent(data, sha, summarize());
    original = JSON.stringify(data);
    markDirty();
    message("저장했습니다. 1~2분 뒤 사이트에 반영됩니다.", "ok");
  } catch (err) {
    console.error(err);
    if (err.status === 409 || err.status === 422) message("그사이 다른 곳에서 내용이 바뀌었습니다. 지금 화면의 변경 내용을 따로 적어 두고, 페이지를 새로고침한 뒤 다시 고쳐 주세요.", "error");
    else if (err.status === 401 || err.status === 403) message("저장 권한이 없습니다. 토큰의 Contents 권한이 'Read and write'인지 확인해 주세요.", "error");
    else message("저장하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.", "error");
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = "GitHub에 저장";
  }
});
document.getElementById("revert-btn").addEventListener("click", () => {
  data = JSON.parse(original); editing = null; message("저장하지 않은 변경을 되돌렸습니다."); render();
});
window.addEventListener("beforeunload", (e) => { if (JSON.stringify(data) !== original) e.preventDefault(); });

/* ---------- GitHub 연결 ---------- */
function showConnection(login) {
  document.getElementById("gh-off").hidden = gh.hasToken();
  document.getElementById("gh-on").hidden = !gh.hasToken();
  document.getElementById("gh-who").textContent = login ? "(" + login + ")" : "";
}
document.getElementById("gh-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("gh-error");
  const t = document.getElementById("gh-token").value.trim();
  errEl.textContent = "";
  if (!t) { errEl.textContent = "토큰을 붙여 넣어 주세요."; return; }
  gh.setToken(t);
  try {
    const repo = await gh.checkToken();
    document.getElementById("gh-token").value = "";
    showConnection(repo.owner && repo.owner.login);
    const pending = JSON.stringify(data) !== original ? data : null;
    await load();
    if (pending) { data = pending; render(); message("연결했습니다. 고치던 내용은 그대로 있습니다. 'GitHub에 저장'을 눌러 주세요.", "ok"); }
    else message("연결했습니다.", "ok");
  } catch (err) {
    gh.clearToken();
    errEl.textContent = err.status === 401 ? "토큰이 올바르지 않습니다. 다시 복사해 붙여 넣어 주세요."
      : err.status === 403 || err.status === 404 ? "이 토큰으로는 shinhwa-webpage 저장소에 쓸 수 없습니다. 저장소 선택과 Contents 'Read and write' 권한을 확인해 주세요."
      : "연결하지 못했습니다. 인터넷 연결을 확인해 주세요.";
  }
});
document.getElementById("gh-disconnect").addEventListener("click", () => {
  gh.clearToken(); showConnection(); message("연결을 해제했습니다. 이 기기에서 토큰을 지웠습니다.");
});

showConnection();
load();
document.documentElement.dataset.ready = "true";
