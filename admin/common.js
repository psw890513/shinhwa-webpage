import { isConfigured, login, logout, onAuthChange } from "../js/firebase.js";

/*
 * 관리자 페이지 공통 로그인 게이트
 *  - 로그인 안 됨      → 로그인 폼
 *  - 로그인했지만 관리자 아님 → 권한 없음 안내
 *  - 관리자               → onReady(user) 호출 후 앱 화면 표시
 */
export function initAdminGate(onReady) {
  const loginView = document.getElementById("login-view");
  const deniedView = document.getElementById("denied-view");
  const appView = document.getElementById("app-view");
  const configWarn = document.getElementById("config-warning");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("logout-btn");
  const deniedLogout = document.getElementById("denied-logout-btn");

  let ready = false;

  function show(view) {
    [loginView, deniedView, appView].forEach((el) => {
      el.hidden = el !== view;
    });
    if (logoutBtn) logoutBtn.hidden = view !== appView;
  }

  if (configWarn) configWarn.hidden = isConfigured;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const btn = loginForm.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await login(loginForm.email.value.trim(), loginForm.password.value);
      loginForm.reset();
    } catch (err) {
      console.error(err);
      loginError.textContent = "이메일 또는 비밀번호가 올바르지 않습니다.";
    } finally {
      btn.disabled = false;
    }
  });

  const doLogout = () => logout();
  if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
  if (deniedLogout) deniedLogout.addEventListener("click", doLogout);

  onAuthChange((user, admin) => {
    if (!user) {
      ready = false;
      show(loginView);
      return;
    }
    if (!admin) {
      show(deniedView);
      return;
    }
    show(appView);
    if (!ready) {
      ready = true;
      onReady(user);
    }
  });
}

export function showMessage(el, msg, type) {
  el.textContent = msg;
  el.className = "notice" + (type === "error" ? " notice-error" : "");
  el.hidden = !msg;
  if (msg) setTimeout(() => { if (el.textContent === msg) el.hidden = true; }, 3000);
}
