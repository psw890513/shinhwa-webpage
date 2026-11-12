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

/* ---------- 메인 슬라이드 ---------- */
(function initSlider() {
  const slides = [...document.querySelectorAll(".slide")];
  const dots = [...document.querySelectorAll(".slide-dots .dot")];
  if (!slides.length) return;
  let current = 0;
  let timer = null;

  // 사진 파일이 있을 때만 배경으로 적용
  slides.forEach((slide) => {
    const src = slide.dataset.img;
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      slide.style.backgroundImage = "url('" + src + "')";
      slide.classList.add("has-img");
    };
    img.src = src;
  });

  function go(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle("is-active", n === current));
    dots.forEach((d, n) => {
      d.classList.toggle("is-active", n === current);
      d.setAttribute("aria-selected", String(n === current));
    });
  }
  function start() {
    if (reduceMotion) return;
    stop();
    timer = setInterval(() => go(current + 1), 5000);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  dots.forEach((d, n) => d.addEventListener("click", () => { go(n); start(); }));
  const hero = document.querySelector(".hero");
  hero.addEventListener("mouseenter", stop);
  hero.addEventListener("mouseleave", start);
  start();
})();

/* ---------- 바로가기: 제품 탭 ---------- */
(function initQuickTabs() {
  const tabs = document.querySelectorAll(".qtab");
  const panels = document.querySelectorAll(".qtab-panel");
  tabs.forEach((tab) => {
    const activate = () => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
      panels.forEach((p) => {
        p.hidden = p.dataset.panel !== tab.dataset.tab;
      });
    };
    tab.addEventListener("click", activate);
    tab.addEventListener("mouseenter", activate);
  });
})();

/* ---------- 공지사항 ---------- */
(function initNotices() {
  const list = document.getElementById("notice-list");
  const more = document.getElementById("notice-more");
  const items = typeof NOTICES !== "undefined" ? NOTICES : [];
  const LIMIT = 5;
  let expanded = false;

  function render() {
    list.innerHTML = "";
    const shown = expanded ? items : items.slice(0, LIMIT);
    shown.forEach((n) => {
      const li = document.createElement("li");
      const title = document.createElement("span");
      title.className = "notice-title";
      title.textContent = n.title;
      const date = document.createElement("time");
      date.dateTime = n.date;
      date.textContent = n.date;
      li.append(title, date);
      list.appendChild(li);
    });
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "등록된 공지사항이 없습니다.";
      list.appendChild(li);
    }
    more.hidden = items.length <= LIMIT;
    more.textContent = expanded ? "접기 «" : "더보기 »";
  }
  more.addEventListener("click", () => { expanded = !expanded; render(); });
  render();
})();

/* ---------- 오시는길: 지도 링크 ---------- */
(function initMapLinks() {
  const addr = document.getElementById("company-address");
  if (!addr || addr.textContent.includes("OO")) return; // 실제 주소 입력 전에는 지도 첫 화면으로
  const q = encodeURIComponent(addr.textContent.trim());
  document.getElementById("naver-map").href = "https://map.naver.com/p/search/" + q;
  document.getElementById("kakao-map").href = "https://map.kakao.com/?q=" + q;
})();

/* ---------- 전화문의 팝업 ---------- */
(function initPopup() {
  const popup = document.getElementById("call-popup");
  if (!popup) return;
  const KEY = "callPopupHideUntil";
  let hideUntil = 0;
  try { hideUntil = Number(localStorage.getItem(KEY)) || 0; } catch (e) { hideUntil = 0; }
  if (Date.now() < hideUntil) return;

  popup.hidden = false;

  function close() {
    const checked = popup.querySelector('input[name="popup-hide"]:checked');
    if (checked) {
      const days = Number(checked.value);
      try { localStorage.setItem(KEY, String(Date.now() + days * 86400000)); } catch (e) { /* 저장 불가 시 무시 */ }
    }
    popup.hidden = true;
  }
  popup.querySelector(".popup-close").addEventListener("click", close);
  popup.querySelectorAll('input[name="popup-hide"]').forEach((r) => r.addEventListener("change", close));
})();

/* ---------- 임대장비 규격표 ---------- */
const grid = document.getElementById("product-grid");
const emptyMsg = document.getElementById("empty-msg");
const filterBtns = document.querySelectorAll(".filter-btn");
let allProducts = [];
let currentFilter = "all";

// 규격표의 한 행: 구분 | 장비명(+설명) | 주요 규격 | 상태 | 문의
function createRow(product) {
  const tr = document.createElement("tr");

  const cat = document.createElement("td");
  cat.className = "col-cat";
  cat.textContent = CATEGORY_LABELS[product.category] || "";

  const name = document.createElement("td");
  name.className = "col-name";
  const strong = document.createElement("strong");
  strong.textContent = product.name;
  name.appendChild(strong);
  if (product.summary) {
    const small = document.createElement("span");
    small.className = "product-summary";
    small.textContent = product.summary;
    name.appendChild(small);
  }

  const spec = document.createElement("td");
  spec.className = "col-spec";
  const list = document.createElement("ul");
  list.className = "spec-list";
  (product.spec || []).forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s;
    list.appendChild(li);
  });
  spec.appendChild(list);

  const status = document.createElement("td");
  status.className = "col-status";
  const badge = document.createElement("span");
  badge.className = "status status-" + product.status;
  badge.textContent = STATUS_LABELS[product.status] || "";
  status.appendChild(badge);

  const action = document.createElement("td");
  action.className = "col-action";
  const cta = document.createElement("a");
  cta.className = "product-cta";
  cta.href = "#contact";
  cta.dataset.product = product.name;
  cta.textContent = "견적문의";
  action.appendChild(cta);

  tr.append(cat, name, spec, status, action);
  return tr;
}

function renderProducts(filter) {
  currentFilter = filter;
  grid.innerHTML = "";
  const items = allProducts.filter((p) =>
    filter === "all" ||
    p.category === filter ||
    (filter === "etc" && p.category === "compressor")
  );
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

// 메뉴·바로가기의 장비 링크: 규격표로 이동하면서 해당 구분만 보여 줌
document.querySelectorAll("[data-goto-filter]").forEach((a) => {
  a.addEventListener("click", () => selectFilter(a.dataset.gotoFilter));
});

// 규격표의 "견적문의" → 문의 폼의 필요 장비를 미리 선택
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
    message.value = "[" + cta.dataset.product + "] 임대 견적 문의드립니다.\n";
  }
});

async function loadProducts() {
  let data = null;
  try {
    data = firebaseReady ? await fb.fetchProducts() : null;
  } catch (err) {
    console.error("제품 목록을 불러오지 못했습니다.", err);
  }
  allProducts = data && data.length ? data : PRODUCTS;
  renderProducts(currentFilter);
}
loadProducts();

/* ---------- 견적문의 폼 ---------- */
const form = document.getElementById("contact-form");
const statusEl = document.getElementById("form-status");
const submitBtn = form.querySelector('button[type="submit"]');

function showError(name, msg) {
  const el = form.querySelector('[data-error-for="' + name + '"]');
  if (el) el.textContent = msg;
  const input = form.elements[name];
  if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
}

function validate() {
  let ok = true;
  showError("name", "");
  showError("phone", "");
  if (!form.elements.name.value.trim()) {
    showError("name", "회사명 또는 성명을 입력해 주세요.");
    ok = false;
  }
  if (!/^[0-9+\-\s()]{9,20}$/.test(form.elements.phone.value.trim())) {
    showError("phone", "연락처를 숫자와 - 로 입력해 주세요. 예: 010-1234-5678");
    ok = false;
  }
  return ok;
}

function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = "form-status" + (type ? " is-" + type : "");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("", "");
  if (!validate()) {
    setStatus("필수 항목을 확인해 주세요.", "error");
    return;
  }

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
      "회사명 / 성명: " + payload.name,
      "연락처: " + payload.phone,
      "필요 장비: " + (payload.equipment || "미선택"),
      "임대 기간: " + (payload.period || "미입력"),
      "",
      "문의 내용:",
      payload.message || "(없음)"
    ];
    window.location.href =
      "mailto:" + CONTACT_EMAIL +
      "?subject=" + encodeURIComponent("[견적 문의] " + payload.name) +
      "&body=" + encodeURIComponent(lines.join("\n"));
    setStatus("메일 작성 창이 열리지 않으면 " + CONTACT_EMAIL + " 로 보내 주세요.", "success");
    return;
  }

  submitBtn.disabled = true;
  try {
    await fb.addInquiry(payload);
    form.reset();
    setStatus("문의가 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.", "success");
  } catch (err) {
    console.error(err);
    setStatus("전송하지 못했습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});
