const CONTACT_EMAIL = "info@example.com"; // Firebase 미설정 시 메일 작성용 주소

// Firebase는 동적으로 불러옵니다. CDN 로드에 실패해도 샘플 데이터로 사이트가 계속 동작하도록 하기 위함입니다.
let fb = null;
try {
  fb = await import("./firebase.js");
} catch (err) {
  console.warn("Firebase를 불러오지 못했습니다. 샘플 데이터로 표시합니다.", err);
}
const firebaseReady = Boolean(fb && fb.isConfigured);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent != null) node.textContent = textContent;
  return node;
}

/* ---------- 연도 ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- 모바일 메뉴 ---------- */
const navToggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("nav");
function setNav(open) {
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  nav.classList.toggle("is-open", open);
}
navToggle.addEventListener("click", () => setNav(navToggle.getAttribute("aria-expanded") !== "true"));
nav.addEventListener("click", (e) => { if (e.target.tagName === "A") setNav(false); });

/* ---------- 배너 슬라이드 ---------- */
(function initBanner() {
  const slides = [...document.querySelectorAll(".slide")];
  const dots = [...document.querySelectorAll(".dot")];
  let current = 0, timer = null;
  function go(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle("is-active", n === current));
    dots.forEach((d, n) => { d.classList.toggle("is-active", n === current); d.setAttribute("aria-selected", String(n === current)); });
  }
  function start() { if (reduceMotion) return; stop(); timer = setInterval(() => go(current + 1), 5000); }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  dots.forEach((d, n) => d.addEventListener("click", () => { go(n); start(); }));
  const banner = document.querySelector(".banner");
  banner.addEventListener("mouseenter", stop);
  banner.addEventListener("mouseleave", start);
  start();
})();

/* ---------- 공지사항 ---------- */
(function initNotices() {
  const list = document.getElementById("notice-list");
  const more = document.getElementById("notice-more");
  const items = typeof NOTICES !== "undefined" ? NOTICES : [];
  const LIMIT = 3;
  let expanded = false;
  function render() {
    list.innerHTML = "";
    (expanded ? items : items.slice(0, LIMIT)).forEach((n) => {
      const li = el("li");
      const date = el("time", "", n.date.slice(5).replace("-", "."));
      date.dateTime = n.date;
      li.append(date, el("span", "notice-title", n.title));
      list.appendChild(li);
    });
    if (!items.length) list.appendChild(el("li", "", "등록된 공지사항이 없습니다."));
    more.hidden = items.length <= LIMIT;
    more.textContent = expanded ? "접기" : "전체 보기";
  }
  more.addEventListener("click", () => { expanded = !expanded; render(); });
  render();
})();

/* ---------- 오시는 길: 지도 링크 ---------- */
(function initMapLinks() {
  const addr = document.getElementById("company-address");
  if (!addr || addr.textContent.includes("OO")) return; // 실제 주소 입력 전에는 지도 첫 화면으로
  const q = encodeURIComponent(addr.textContent.trim());
  document.getElementById("naver-map").href = "https://map.naver.com/p/search/" + q;
  document.getElementById("kakao-map").href = "https://map.kakao.com/?q=" + q;
})();

/* ---------- 장비 목록 ---------- */
const grid = document.getElementById("product-grid");
const emptyMsg = document.getElementById("empty-msg");
const pills = document.querySelectorAll(".pill");
const categorySelect = document.getElementById("category-select");
const sortSelect = document.getElementById("sort-select");
const countEl = document.getElementById("list-count");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchNote = document.getElementById("search-note");
let allProducts = [];
const state = { filter: "all", sort: "default", query: "" };

function ratingOf(p) {
  const m = String(p.rating || p.name || "").match(/(\d[\d,.]*)\s*(kVA|kW|인치|HP|bar|A)/i);
  return m ? { value: m[1], unit: m[2], size: parseFloat(m[1].replace(/,/g, "")) } : { value: "", unit: "", size: 0 };
}
function inFilter(p, filter) {
  return filter === "all" || p.category === filter || (filter === "etc" && p.category === "compressor");
}
function matchesQuery(p, q) {
  if (!q) return true;
  const hay = [p.name, p.rating, p.summary, CATEGORY_LABELS[p.category], ...(p.spec || [])].join(" ").toLowerCase().replace(/\s+/g, "");
  return q.toLowerCase().replace(/\s+/g, "").split(/[,]/).every((t) => hay.includes(t));
}
const won = (n) => Number(n).toLocaleString("ko-KR") + "원";

function createCard(p) {
  const r = ratingOf(p);
  const li = el("li", "card");

  const media = el("div", "card-media");
  const img = document.createElement("img");
  if (p.image) {
    img.src = p.image; img.className = "is-photo"; img.alt = p.name;
  } else {
    img.src = "images/equip/" + (p.art || CATEGORY_ART[p.category] || "generator") + ".svg";
    img.alt = ""; // 장식용 그림 (이름이 바로 아래에 있음)
  }
  img.loading = "lazy"; img.width = 240; img.height = 180;
  media.append(img, el("span", "card-status status-" + p.status, STATUS_LABELS[p.status] || ""));

  const body = el("div", "card-body");
  body.appendChild(el("h3", "card-title", p.name));

  const meta = el("dl", "card-meta");
  const row = (parent, k, v, cls) => { const d = el("div", cls || ""); d.append(el("dt", "", k), el("dd", "", v)); parent.appendChild(d); };
  row(meta, "규격", r.value ? r.value + " " + r.unit : "-");
  row(meta, "구분", CATEGORY_LABELS[p.category] || "-");
  if (p.spec && p.spec.length) row(meta, "사양", p.spec[0]);
  body.appendChild(meta);

  const price = el("dl", "card-price");
  const pr = p.prices || {};
  if (pr.day || pr.week || pr.month) {
    if (pr.day) row(price, "1일", won(pr.day), "is-day");
    if (pr.week) row(price, "7일", won(pr.week));
    if (pr.month) row(price, "30일", won(pr.month));
  } else {
    row(price, "임대료", "견적 문의", "is-day");
  }
  body.appendChild(price);

  const foot = el("div", "card-foot");
  foot.appendChild(el("span", "card-code", "장비코드 " + String(p.id || "").toUpperCase()));
  const cta = el("a", "card-cta", "견적 요청");
  cta.href = "#contact"; cta.dataset.product = p.name;
  foot.appendChild(cta);
  body.appendChild(foot);

  li.append(media, body);
  return li;
}

function render() {
  let items = allProducts.filter((p) => inFilter(p, state.filter) && matchesQuery(p, state.query));
  const byName = (a, b) => a.name.localeCompare(b.name, "ko");
  if (state.sort === "name") items = [...items].sort(byName);
  if (state.sort === "rating-desc") items = [...items].sort((a, b) => ratingOf(b).size - ratingOf(a).size);
  if (state.sort === "rating-asc") items = [...items].sort((a, b) => ratingOf(a).size - ratingOf(b).size);
  if (state.sort === "available") items = [...items].sort((a, b) => (a.status === "available" ? 0 : 1) - (b.status === "available" ? 0 : 1));

  grid.innerHTML = "";
  items.forEach((p) => grid.appendChild(createCard(p)));
  emptyMsg.hidden = items.length !== 0;
  const label = state.filter === "all" ? "" : CATEGORY_LABELS[state.filter] + " ";
  countEl.textContent = "총 " + items.length + "개의 " + label + "장비가 준비되어 있습니다.";

  searchNote.hidden = !state.query;
  document.getElementById("search-text").textContent = "'" + state.query + "' 검색 결과";
}

function selectFilter(filter) {
  state.filter = filter;
  pills.forEach((b) => { const on = b.dataset.filter === filter; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
  categorySelect.value = filter;
  render();
}
pills.forEach((b) => b.addEventListener("click", () => selectFilter(b.dataset.filter)));
categorySelect.addEventListener("change", () => selectFilter(categorySelect.value));
sortSelect.addEventListener("change", () => { state.sort = sortSelect.value; render(); });

/* 검색: 좁은 화면에서는 돋보기를 누르면 입력창이 열림 */
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const narrow = window.matchMedia("(max-width: 900px)").matches;
  if (narrow && !searchForm.classList.contains("is-open")) {
    searchForm.classList.add("is-open"); searchInput.focus(); return;
  }
  state.query = searchInput.value.trim();
  searchForm.classList.remove("is-open");
  render();
  document.getElementById("catalog").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
});
searchInput.addEventListener("keydown", (e) => { if (e.key === "Escape") searchForm.classList.remove("is-open"); });
document.getElementById("search-clear").addEventListener("click", () => { state.query = ""; searchInput.value = ""; render(); });

// 카드의 "견적 요청" → 문의 폼의 필요한 장비를 미리 선택
grid.addEventListener("click", (e) => {
  const cta = e.target.closest(".card-cta");
  if (!cta) return;
  const product = allProducts.find((p) => p.name === cta.dataset.product);
  let label = product && CATEGORY_LABELS[product.category];
  if (label === "공기압축기") label = "기타 장비";
  const select = document.getElementById("equipment");
  const option = label && [...select.options].find((o) => o.textContent === label);
  if (option) select.value = option.value || option.textContent;
  const message = document.getElementById("message");
  if (!message.value) message.value = "[" + cta.dataset.product + "] 임대 견적을 요청합니다.\n";
});

async function loadProducts() {
  let data = null;
  try { data = firebaseReady ? await fb.fetchProducts() : null; }
  catch (err) { console.error("장비 목록을 불러오지 못했습니다.", err); }
  allProducts = data && data.length ? data : PRODUCTS;
  render();
}
loadProducts();

/* ---------- 견적 요청 폼 ---------- */
const form = document.getElementById("contact-form");
const statusEl = document.getElementById("form-status");
const submitBtn = form.querySelector('button[type="submit"]');

function showError(name, msg) {
  const errEl = form.querySelector('[data-error-for="' + name + '"]');
  if (errEl) errEl.textContent = msg;
  form.elements[name].setAttribute("aria-invalid", msg ? "true" : "false");
}
function validate() {
  let first = null;
  showError("name", ""); showError("phone", "");
  if (!form.elements.name.value.trim()) { showError("name", "회사명이나 성함을 입력해 주세요."); first = form.elements.name; }
  if (!/^[0-9+\-\s()]{9,20}$/.test(form.elements.phone.value.trim())) {
    showError("phone", "연락처를 숫자와 - 로 입력해 주세요. 예: 010-1234-5678");
    first = first || form.elements.phone;
  }
  if (first) first.focus();
  return !first;
}
function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = "form-status" + (type ? " is-" + type : "");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("", "");
  if (!validate()) return;
  const data = new FormData(form);
  const payload = {
    name: (data.get("name") || "").trim().slice(0, 100),
    phone: (data.get("phone") || "").trim().slice(0, 30),
    equipment: data.get("equipment") || "",
    period: (data.get("period") || "").trim().slice(0, 100),
    message: (data.get("message") || "").trim().slice(0, 2000)
  };

  if (!firebaseReady) {
    const lines = [
      "회사명 또는 성함: " + payload.name, "연락처: " + payload.phone,
      "필요한 장비: " + (payload.equipment || "미선택"), "임대 기간: " + (payload.period || "미입력"),
      "", "현장 위치와 요청 사항:", payload.message || "(없음)"
    ];
    window.location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent("[견적 요청] " + payload.name) + "&body=" + encodeURIComponent(lines.join("\n"));
    setStatus("메일 작성 창이 열리지 않으면 " + CONTACT_EMAIL + " 로 보내 주세요.", "success");
    return;
  }

  submitBtn.disabled = true;
  try {
    await fb.addInquiry(payload);
    form.reset();
    setStatus("견적 요청을 보냈습니다. 영업일 기준 하루 안에 연락드립니다.", "success");
  } catch (err) {
    console.error(err);
    setStatus("보내지 못했습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});
