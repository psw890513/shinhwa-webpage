import { fetchProducts, saveProduct, deleteProduct } from "../js/firebase.js";
import { initAdminGate, showMessage } from "./common.js";

// 상태 라벨 (js/products.js 의 STATUS_LABELS 와 동일)
const STATUS = { available: "임대 가능", reserved: "예약 중" };

const form = document.getElementById("product-form");
const formTitle = document.getElementById("form-title");
const cancelBtn = document.getElementById("cancel-edit");
const errorEl = document.getElementById("product-error");
const rowsEl = document.getElementById("product-rows");
const countEl = document.getElementById("product-count");
const seedBtn = document.getElementById("seed-btn");
const noticeEl = document.getElementById("admin-notice");

let products = [];

function resetForm() {
  form.reset();
  form.elements.id.value = "";
  formTitle.textContent = "새 제품 등록";
  cancelBtn.hidden = true;
  errorEl.textContent = "";
}

function fillForm(p) {
  form.elements.id.value = p.id;
  form.elements.name.value = p.name || "";
  form.elements.category.value = p.category || "generator";
  form.elements.summary.value = p.summary || "";
  form.elements.spec.value = (p.spec || []).join("\n");
  form.elements.status.value = p.status || "available";
  formTitle.textContent = "제품 수정: " + (p.name || "");
  cancelBtn.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRows() {
  rowsEl.innerHTML = "";
  countEl.textContent = products.length ? "(" + products.length + "개)" : "";
  seedBtn.hidden = products.length !== 0;

  if (!products.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "empty-row";
    td.textContent = "등록된 제품이 없습니다.";
    tr.appendChild(td);
    rowsEl.appendChild(tr);
    return;
  }

  products.forEach((p) => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = p.name;
    nameTd.appendChild(strong);

    const catTd = document.createElement("td");
    catTd.textContent = CATEGORY_LABELS[p.category] || p.category;

    const statusTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "status status-" + p.status;
    badge.textContent = STATUS[p.status] || p.status;
    statusTd.appendChild(badge);

    const specTd = document.createElement("td");
    specTd.className = "hint";
    specTd.textContent = (p.spec || []).join(" · ");

    const actTd = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "row-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "btn-small";
    editBtn.type = "button";
    editBtn.textContent = "수정";
    editBtn.addEventListener("click", () => fillForm(p));
    const delBtn = document.createElement("button");
    delBtn.className = "btn-small danger";
    delBtn.type = "button";
    delBtn.textContent = "삭제";
    delBtn.addEventListener("click", () => removeProduct(p));
    actions.append(editBtn, delBtn);
    actTd.appendChild(actions);

    tr.append(nameTd, catTd, statusTd, specTd, actTd);
    rowsEl.appendChild(tr);
  });
}

async function reload() {
  try {
    products = (await fetchProducts()) || [];
    renderRows();
  } catch (err) {
    console.error(err);
    showMessage(noticeEl, "제품 목록을 불러오지 못했습니다. Firestore 보안 규칙을 확인해 주세요.", "error");
  }
}

async function removeProduct(p) {
  if (!confirm("'" + p.name + "' 제품을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.")) return;
  try {
    await deleteProduct(p.id);
    showMessage(noticeEl, "삭제되었습니다.");
    if (form.elements.id.value === p.id) resetForm();
    await reload();
  } catch (err) {
    console.error(err);
    showMessage(noticeEl, "삭제에 실패했습니다.", "error");
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const name = form.elements.name.value.trim();
  if (!name) {
    errorEl.textContent = "제품명을 입력해 주세요.";
    form.elements.name.focus();
    return;
  }

  const data = {
    name,
    category: form.elements.category.value,
    summary: form.elements.summary.value.trim(),
    spec: form.elements.spec.value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    status: form.elements.status.value
  };

  const id = form.elements.id.value || null;
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await saveProduct(id, data);
    showMessage(noticeEl, id ? "제품 정보가 수정되었습니다." : "제품이 등록되었습니다.");
    resetForm();
    await reload();
  } catch (err) {
    console.error(err);
    errorEl.textContent = "저장에 실패했습니다. 권한 또는 네트워크를 확인해 주세요.";
  } finally {
    btn.disabled = false;
  }
});

cancelBtn.addEventListener("click", resetForm);

seedBtn.addEventListener("click", async () => {
  if (!confirm("샘플 제품 " + PRODUCTS.length + "개를 등록합니다. 계속할까요?")) return;
  seedBtn.disabled = true;
  try {
    for (const p of PRODUCTS) {
      const { id, ...data } = p;
      await saveProduct(id, data);
    }
    showMessage(noticeEl, "샘플 제품을 등록했습니다.");
    await reload();
  } catch (err) {
    console.error(err);
    showMessage(noticeEl, "샘플 등록에 실패했습니다.", "error");
  } finally {
    seedBtn.disabled = false;
  }
});

initAdminGate(() => {
  reload();
});
