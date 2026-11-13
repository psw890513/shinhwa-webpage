const CONTACT_EMAIL = "info@example.com"; // Firebase 미설정 시 메일 작성용 주소

// Firebase는 동적으로 불러옵니다. CDN 로드에 실패해도 샘플 데이터로 사이트가 계속 동작하도록 하기 위함입니다.
let fb = null;
try {
  fb = await import("./firebase.js");
} catch (err) {
  console.warn("Firebase를 불러오지 못했습니다. 샘플 데이터로 표시합니다.", err);
}
const firebaseReady = Boolean(fb && fb.isConfigured);

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
nav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") setNav(false);
});

/* ---------- 공지사항 ---------- */
(function initNotices() {
  const list = document.getElementById("notice-list");
  const more = document.getElementById("notice-more");
  const items = typeof NOTICES !== "undefined" ? NOTICES : [];
  const LIMIT = 3;
  let expanded = false;

  function render() {
    list.innerHTML = "";
    const shown = expanded ? items : items.slice(0, LIMIT);
    shown.forEach((n) => {
      const li = document.createElement("li");
      const date = document.createElement("time");
      date.dateTime = n.date;
      date.textContent = n.date.slice(5).replace("-", "."); // 2026-11-02 → 11.02
      const title = document.createElement("span");
      title.className = "notice-title";
      title.textContent = n.title;
      li.append(date, title);
      list.appendChild(li);
    });
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "등록된 공지사항이 없습니다.";
      list.appendChild(li);
    }
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

/* ---------- 전화 상담 팝업 ---------- */
(function initPopup() {
  const popup = document.getElementById("call-popup");
  if (!popup) return;
  const KEY = "callPopupHideUntil";
  let hideUntil = 0;
  try { hideUntil = Number(localStorage.getItem(KEY)) || 0; } catch (e) { hideUntil = 0; }
  if (Date.now() < hideUntil) return;

  popup.hidden = false;
  popup.querySelector(".popup-close").addEventListener("click", () => { popup.hidden = true; });
  popup.querySelector(".popup-hide").addEventListener("click", () => {
    try { localStorage.setItem(KEY, String(Date.now() + 86400000)); } catch (e) { /* 저장 불가 시 이번만 닫음 */ }
    popup.hidden = true;
  });
})();

/* ---------- 장비 데이터 ---------- */
const grid = document.getElementById("product-grid");
const emptyMsg = document.getElementById("empty-msg");
const filterBtns = document.querySelectorAll(".filter-btn");
const boardList = document.getElementById("board-list");
let allProducts = [];
let currentFilter = "all";

// 규격을 숫자와 단위로 나눔. rating 값이 없으면 장비명에서 찾음 (예: "디젤 발전기 10kVA")
function ratingOf(product) {
  const m = String(product.rating || product.name || "").match(/(\d[\d,.]*)\s*(kVA|kW|인치|HP|bar|A)/i);
  return m ? { value: m[1], unit: m[2] } : { value: "", unit: "" };
}
function inFilter(p, filter) {
  return filter === "all" || p.category === filter || (filter === "etc" && p.category === "compressor");
}
function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent != null) node.textContent = textContent;
  return node;
}
function statusBadge(product) {
  return el("span", "status status-" + product.status, STATUS_LABELS[product.status] || "");
}

/* ---------- 현황판: 구분별로 큰 규격부터 5종 ---------- */
function renderBoard() {
  const size = (p) => parseFloat(ratingOf(p).value.replace(/,/g, "")) || 0;
  const picked = [];
  for (const [cat, n] of [["generator", 2], ["pump", 2], ["motor", 1]]) {
    picked.push(...allProducts.filter((p) => p.category === cat).sort((a, b) => size(b) - size(a)).slice(0, n));
  }
  for (const p of allProducts) {
    if (picked.length >= 5) break;
    if (!picked.includes(p)) picked.push(p);
  }

  boardList.innerHTML = "";
  picked.slice(0, 5).forEach((p) => {
    const r = ratingOf(p);
    const li = el("li");
    const cap = el("div", "board-cap");
    cap.append(el("span", "num", r.value), el("span", "unit", r.unit));
    const name = el("div", "board-name");
    const label = CATEGORY_LABELS[p.category] || "";
    name.append(el("strong", "", p.name.replace(r.value + r.unit, "").trim() || p.name), el("span", "", label));
    li.append(cap, name, statusBadge(p));
    boardList.appendChild(li);
  });

  const available = allProducts.filter((p) => p.status === "available").length;
  document.getElementById("board-summary").textContent = "출고 가능 " + available + "종";
  document.getElementById("board-count").textContent =
    allProducts.length + "종 중 " + Math.min(5, picked.length) + "종 표시";
}

/* ---------- 임대장비 표 ---------- */
function createRow(product) {
  const r = ratingOf(product);
  const tr = el("tr");

  const cap = el("td", "col-cap");
  cap.append(el("span", "num", r.value), el("span", "unit", r.unit));

  const name = el("td", "col-name");
  name.appendChild(el("strong", "", product.name));
  if (product.summary) name.appendChild(el("span", "", product.summary));

  const spec = el("td", "col-spec", (product.spec || []).join(", "));

  const status = el("td", "col-status");
  status.appendChild(statusBadge(product));

  const action = el("td", "col-action");
  const cta = el("a", "product-cta", "견적 요청");
  cta.href = "#contact";
  cta.dataset.product = product.name;
  action.appendChild(cta);

  tr.append(cap, name, spec, status, action);
  return tr;
}

function renderProducts(filter) {
  currentFilter = filter;
  grid.innerHTML = "";
  const items = allProducts.filter((p) => inFilter(p, filter));
  items.forEach((p) => grid.appendChild(createRow(p)));
  emptyMsg.hidden = items.length !== 0;
}

function selectFilter(filter) {
  filterBtns.forEach((b) => {
    const on = b.dataset.filter === filter;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", String(on));
  });
  renderProducts(filter);
}
filterBtns.forEach((btn) => btn.addEventListener("click", () => selectFilter(btn.dataset.filter)));

// 장비 사진을 누르면 그 구분만 표에 보여 줌
document.querySelectorAll("[data-goto-filter]").forEach((el) => {
  el.addEventListener("click", () => {
    selectFilter(el.dataset.gotoFilter);
    document.querySelector(".filters").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

function renderCounts() {
  filterBtns.forEach((b) => {
    b.querySelector(".count").textContent = allProducts.filter((p) => inFilter(p, b.dataset.filter)).length;
  });
}

// 표의 "견적 요청" → 문의 폼의 필요한 장비를 미리 선택
grid.addEventListener("click", (e) => {
  const cta = e.target.closest(".product-cta");
  if (!cta) return;
  const product = allProducts.find((p) => p.name === cta.dataset.product);
  const select = document.getElementById("equipment");
  let label = product && CATEGORY_LABELS[product.category];
  if (label === "공기압축기") label = "기타 장비";
  if (select && label) {
    const option = [...select.options].find((o) => o.textContent === label);
    if (option) select.value = option.value || option.textContent;
  }
  const message = document.getElementById("message");
  if (message && !message.value) {
    message.value = "[" + cta.dataset.product + "] 임대 견적을 요청합니다.\n";
  }
});

async function loadProducts() {
  let data = null;
  try {
    data = firebaseReady ? await fb.fetchProducts() : null;
  } catch (err) {
    console.error("장비 목록을 불러오지 못했습니다.", err);
  }
  allProducts = data && data.length ? data : PRODUCTS;
  renderCounts();
  renderBoard();
  renderProducts(currentFilter);
}
loadProducts();

/* ---------- 견적 요청 폼 ---------- */
const form = document.getElementById("contact-form");
const statusEl = document.getElementById("form-status");
const submitBtn = form.querySelector('button[type="submit"]');

function showError(name, msg) {
  const errEl = form.querySelector('[data-error-for="' + name + '"]');
  if (errEl) errEl.textContent = msg;
  const input = form.elements[name];
  if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
}

function validate() {
  let firstInvalid = null;
  showError("name", "");
  showError("phone", "");
  if (!form.elements.name.value.trim()) {
    showError("name", "회사명이나 성함을 입력해 주세요.");
    firstInvalid = form.elements.name;
  }
  if (!/^[0-9+\-\s()]{9,20}$/.test(form.elements.phone.value.trim())) {
    showError("phone", "연락처를 숫자와 - 로 입력해 주세요. 예: 010-1234-5678");
    firstInvalid = firstInvalid || form.elements.phone;
  }
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
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

  // Firebase 설정 전: 메일 작성 창으로 대신 전달
  if (!firebaseReady) {
    const lines = [
      "회사명 또는 성함: " + payload.name,
      "연락처: " + payload.phone,
      "필요한 장비: " + (payload.equipment || "미선택"),
      "임대 기간: " + (payload.period || "미입력"),
      "",
      "현장 위치와 요청 사항:",
      payload.message || "(없음)"
    ];
    window.location.href =
      "mailto:" + CONTACT_EMAIL +
      "?subject=" + encodeURIComponent("[견적 요청] " + payload.name) +
      "&body=" + encodeURIComponent(lines.join("\n"));
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
