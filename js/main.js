(function () {
  "use strict";

  const CONTACT_EMAIL = "info@example.com"; // 실제 문의 이메일로 변경하세요

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

  function createCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";

    const top = document.createElement("div");
    top.className = "product-top";

    const cat = document.createElement("span");
    cat.className = "tag";
    cat.textContent = CATEGORY_LABELS[product.category] || "";

    const status = document.createElement("span");
    status.className = "status status-" + product.status;
    status.textContent = STATUS_LABELS[product.status] || "";

    top.append(cat, status);

    const title = document.createElement("h3");
    title.textContent = product.name;

    const summary = document.createElement("p");
    summary.className = "product-summary";
    summary.textContent = product.summary;

    const list = document.createElement("ul");
    list.className = "spec-list";
    product.spec.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      list.appendChild(li);
    });

    const cta = document.createElement("a");
    cta.className = "product-cta";
    cta.href = "#contact";
    cta.dataset.product = product.name;
    cta.textContent = "이 장비 문의하기 →";

    card.append(top, title, summary, list, cta);
    return card;
  }

  function renderProducts(filter) {
    grid.innerHTML = "";
    const items = PRODUCTS.filter((p) => filter === "all" || p.category === filter);
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
    const select = document.getElementById("equipment");
    const category = PRODUCTS.find((p) => p.name === cta.dataset.product)?.category;
    if (select && category) {
      const label = CATEGORY_LABELS[category];
      const option = [...select.options].find((o) => o.textContent === label);
      if (option) select.value = option.value || option.textContent;
    }
    const message = document.getElementById("message");
    if (message && !message.value) {
      message.value = "[" + cta.dataset.product + "] 임대 문의드립니다.\n";
    }
  });

  renderProducts("all");

  /* ---------- 문의 폼 (유효성 검사 후 메일 작성 창으로 전달) ---------- */
  const form = document.getElementById("contact-form");
  const statusEl = document.getElementById("form-status");

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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    statusEl.textContent = "";
    statusEl.className = "form-status";

    if (!validate()) {
      statusEl.textContent = "입력 내용을 확인해 주세요.";
      statusEl.classList.add("is-error");
      return;
    }

    const data = new FormData(form);
    const lines = [
      "회사명 / 성명: " + data.get("name"),
      "연락처: " + data.get("phone"),
      "필요 장비: " + (data.get("equipment") || "미선택"),
      "임대 기간: " + (data.get("period") || "미입력"),
      "",
      "문의 내용:",
      data.get("message") || "(없음)"
    ];

    const subject = "[임대 문의] " + data.get("name");
    const mailto =
      "mailto:" + CONTACT_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(lines.join("\n"));

    window.location.href = mailto;
    statusEl.textContent = "메일 작성 창이 열리지 않으면 " + CONTACT_EMAIL + " 로 직접 보내주세요.";
    statusEl.classList.add("is-success");
  });
})();
