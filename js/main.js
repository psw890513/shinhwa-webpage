const CONTACT_EMAIL = "info@example.com"; // Firebase 미설정 시 메일 작성용 주소

// Firebase는 동적으로 불러옵니다. CDN 로드에 실패해도 샘플 데이터로 사이트가 계속 동작하도록 하기 위함입니다.
let fb = null;
try {
  fb = await import("./firebase.js");
} catch (err) {
  console.warn("Firebase를 불러오지 못했습니다. 샘플 데이터로 표시합니다.", err);
}
const firebaseReady = Boolean(fb && fb.isConfigured);

(function () {
  "use strict";

  /* ---------- 연도 표시 ---------- */
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

  navToggle.addEventListener("click", () => {
    setNav(navToggle.getAttribute("aria-expanded") !== "true");
  });

  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") setNav(false);
  });

  /* ---------- 제품 카탈로그 ---------- */
  const grid = document.getElementById("product-grid");
  const emptyMsg = document.getElementById("empty-msg");
  const filterBtns = document.querySelectorAll(".filter-btn");
  let allProducts = [];
  let currentFilter = "all";

  // 규격표의 한 행: 구분 | 장비명(+설명) | 주요 규격 | 상태 | 문의
  function createCard(product) {
    const tr = document.createElement("tr");

    const cat = document.createElement("td");
    cat.className = "col-cat";
    cat.dataset.label = "구분";
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
    spec.dataset.label = "규격";
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
    status.dataset.label = "상태";
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
    cta.textContent = "문의";
    action.appendChild(cta);

    tr.append(cat, name, spec, status, action);
    return tr;
  }

  function renderProducts(filter) {
    currentFilter = filter;
    grid.innerHTML = "";
    const items = allProducts.filter((p) => filter === "all" || p.category === filter);
    items.forEach((p) => grid.appendChild(createCard(p)));
    emptyMsg.hidden = items.length !== 0;
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      renderProducts(btn.dataset.filter);
    });
  });

  // 카드의 "문의하기" 클릭 시 필요 장비 항목을 미리 선택
  grid.addEventListener("click", (e) => {
    const cta = e.target.closest(".product-cta");
    if (!cta) return;
    const product = allProducts.find((p) => p.name === cta.dataset.product);
    const select = document.getElementById("equipment");
    const label = product && CATEGORY_LABELS[product.category];
    if (select && label) {
      const option = [...select.options].find((o) => o.textContent === label);
      if (option) select.value = option.value || option.textContent;
    }
    const message = document.getElementById("message");
    if (message && !message.value) {
      message.value = "[" + cta.dataset.product + "] 임대 문의드립니다.\n";
    }
  });

  // Firestore에서 제품을 가져오고, 없거나 실패하면 샘플 데이터를 사용
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

  /* ---------- 문의 폼 ---------- */
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
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();

    showError("name", "");
    showError("phone", "");

    if (!name) {
      showError("name", "회사명 또는 성명을 입력해 주세요.");
      ok = false;
    }
    if (!/^[0-9+\-\s()]{9,20}$/.test(phone)) {
      showError("phone", "올바른 연락처를 입력해 주세요.");
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
      setStatus("입력 내용을 확인해 주세요.", "error");
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
      const mailto =
        "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent("[임대 문의] " + payload.name) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      window.location.href = mailto;
      setStatus("메일 작성 창이 열리지 않으면 " + CONTACT_EMAIL + " 로 직접 보내주세요.", "success");
      return;
    }

    submitBtn.disabled = true;
    try {
      await fb.addInquiry(payload);
      form.reset();
      setStatus("문의가 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.", "success");
    } catch (err) {
      console.error(err);
      setStatus("전송에 실패했습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
