import { fetchInquiries, setInquiryStatus, deleteInquiry } from "../js/firebase.js";
import { initAdminGate, showMessage } from "./common.js";

const STATUS_TEXT = { new: "신규", in_progress: "진행 중", done: "완료" };

const rowsEl = document.getElementById("inquiry-rows");
const summaryEl = document.getElementById("summary");
const filterEl = document.getElementById("status-filter");
const refreshBtn = document.getElementById("refresh-btn");
const noticeEl = document.getElementById("admin-notice");

let inquiries = [];

function formatDate(d) {
  if (!d) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
    " " + pad(d.getHours()) + ":" + pad(d.getMinutes())
  );
}

function cell(text, className) {
  const td = document.createElement("td");
  if (className) td.className = className;
  td.textContent = text || "-";
  return td;
}

function render() {
  const filter = filterEl.value;
  const items = inquiries.filter((i) => filter === "all" || i.status === filter);

  const newCount = inquiries.filter((i) => i.status === "new").length;
  summaryEl.textContent = "전체 " + inquiries.length + "건 · 신규 " + newCount + "건";

  rowsEl.innerHTML = "";
  if (!items.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 8;
    td.className = "empty-row";
    td.textContent = "해당하는 접수 내역이 없습니다.";
    tr.appendChild(td);
    rowsEl.appendChild(tr);
    return;
  }

  items.forEach((i) => {
    const tr = document.createElement("tr");

    tr.appendChild(cell(formatDate(i.createdAt)));
    tr.appendChild(cell(i.name));
    tr.appendChild(cell(i.phone));
    tr.appendChild(cell(i.equipment));
    tr.appendChild(cell(i.period));
    tr.appendChild(cell(i.message, "msg"));

    // 상태 변경
    const statusTd = document.createElement("td");
    const select = document.createElement("select");
    select.setAttribute("aria-label", "접수 상태 변경");
    Object.entries(STATUS_TEXT).forEach(([value, label]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      if (value === i.status) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => changeStatus(i, select.value, select));
    statusTd.appendChild(select);
    tr.appendChild(statusTd);

    // 삭제
    const actTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "btn-small danger";
    delBtn.type = "button";
    delBtn.textContent = "삭제";
    delBtn.addEventListener("click", () => removeInquiry(i));
    actTd.appendChild(delBtn);
    tr.appendChild(actTd);

    rowsEl.appendChild(tr);
  });
}

async function load() {
  refreshBtn.disabled = true;
  try {
    inquiries = await fetchInquiries();
    render();
  } catch (err) {
    console.error(err);
    showMessage(noticeEl, "접수 내역을 불러오지 못했습니다. Firestore 보안 규칙을 확인해 주세요.", "error");
  } finally {
    refreshBtn.disabled = false;
  }
}

async function changeStatus(item, status, selectEl) {
  try {
    await setInquiryStatus(item.id, status);
    item.status = status;
    render();
    showMessage(noticeEl, "상태를 '" + STATUS_TEXT[status] + "'(으)로 변경했습니다.");
  } catch (err) {
    console.error(err);
    selectEl.value = item.status;
    showMessage(noticeEl, "상태 변경에 실패했습니다.", "error");
  }
}

async function removeInquiry(item) {
  if (!confirm("'" + (item.name || "익명") + "' 님의 문의를 삭제할까요?\n삭제하면 되돌릴 수 없습니다.")) return;
  try {
    await deleteInquiry(item.id);
    inquiries = inquiries.filter((i) => i.id !== item.id);
    render();
    showMessage(noticeEl, "삭제되었습니다.");
  } catch (err) {
    console.error(err);
    showMessage(noticeEl, "삭제에 실패했습니다.", "error");
  }
}

filterEl.addEventListener("change", render);
refreshBtn.addEventListener("click", load);

initAdminGate(() => {
  load();
});
