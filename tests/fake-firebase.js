// 테스트용 가짜 Firebase. gstatic의 Firebase 모듈 주소를 이 코드로 바꿔치기해서
// 실제 사이트 코드(js/firebase.js)가 그대로 동작하는지 확인합니다. 데이터는 localStorage에 둡니다.
// 비밀번호 "right-password" 로만 로그인되고, 그 계정(uid u1)은 관리자로 등록되어 있습니다.
const APP = `export function initializeApp(c) { return { c }; }`;

const STORE = `
const KEY = "__fake_fs";
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = (s) => localStorage.setItem(KEY, JSON.stringify(s));
const revive = (v) => {
  if (v && typeof v === "object") {
    if ("__ts" in v) { const t = v.__ts; return { toDate: () => new Date(t) }; }
    if (Array.isArray(v)) return v.map(revive);
    const o = {}; for (const k in v) o[k] = revive(v[k]); return o;
  }
  return v;
};
const user = () => { try { return JSON.parse(localStorage.getItem("__fake_user")); } catch { return null; } };
const deny = () => { const e = new Error("permission-denied"); e.code = "permission-denied"; throw e; };
const canWrite = (col) => col === "inquiries" ? true : !!user();
`;

const FIRESTORE = STORE + `
export const getFirestore = () => ({});
export const collection = (db, col) => ({ col });
export const doc = (db, col, id) => ({ col, id });
export const query = (c) => c;
export const orderBy = () => null;
export const serverTimestamp = () => ({ __ts: Date.now() });
export const arrayUnion = (...items) => ({ __union: items });
export const Timestamp = { now: () => ({ __ts: Date.now() }) };
export async function getDoc(ref) {
  const rec = (read()[ref.col] || {})[ref.id];
  return { id: ref.id, exists: () => !!rec, data: () => revive(rec) };
}
export async function getDocs(c) {
  if (c.col !== "products" && !user()) deny();
  const recs = read()[c.col] || {};
  const docs = Object.entries(recs).map(([id, r]) => ({ id, data: () => revive(r) }));
  docs.sort((a, b) => ((b.data().createdAt || { toDate: () => 0 }).toDate() - (a.data().createdAt || { toDate: () => 0 }).toDate()));
  return { docs };
}
export async function addDoc(c, data) {
  if (!canWrite(c.col)) deny();
  const s = read(); const id = "id" + Date.now() + Math.random().toString(36).slice(2, 5);
  (s[c.col] ||= {})[id] = data; write(s); return { id };
}
export async function setDoc(ref, data) { if (!canWrite(ref.col)) deny(); const s = read(); (s[ref.col] ||= {})[ref.id] = data; write(s); }
export async function updateDoc(ref, data) {
  if (!user()) deny();
  const s = read(); const rec = (s[ref.col] ||= {})[ref.id] || {};
  for (const k in data) rec[k] = data[k] && data[k].__union ? [...(rec[k] || []), ...data[k].__union] : data[k];
  s[ref.col][ref.id] = rec; write(s);
}
export async function deleteDoc(ref) { if (!user()) deny(); const s = read(); delete (s[ref.col] || {})[ref.id]; write(s); }
`;

const AUTH = `
const listeners = [];
const user = () => { try { return JSON.parse(localStorage.getItem("__fake_user")); } catch { return null; } };
const emit = () => listeners.forEach((cb) => cb(user()));
export const getAuth = () => ({});
export async function signInWithEmailAndPassword(a, email, pw) {
  if (pw !== "right-password") { const e = new Error("auth/invalid-credential"); e.code = "auth/invalid-credential"; throw e; }
  localStorage.setItem("__fake_user", JSON.stringify({ uid: "u1", email })); emit();
}
export async function signOut() { localStorage.removeItem("__fake_user"); emit(); }
export function onAuthStateChanged(a, cb) { listeners.push(cb); setTimeout(() => cb(user()), 0); }
`;

// page.route 에 넣을 처리기. 관리자 계정(admins/u1)은 처음부터 있는 것으로 둡니다.
async function useFakeFirebase(page) {
  await page.addInitScript(() => {
    const s = JSON.parse(localStorage.getItem("__fake_fs") || "{}");
    s.admins = { u1: { role: "admin" } };
    localStorage.setItem("__fake_fs", JSON.stringify(s));
  });
  await page.route("https://www.gstatic.com/firebasejs/**", (r) => {
    const u = r.request().url();
    const body = u.endsWith("firebase-app.js") ? APP : u.endsWith("firebase-firestore.js") ? FIRESTORE : u.endsWith("firebase-auth.js") ? AUTH : "";
    return r.fulfill({ contentType: "text/javascript", body });
  });
}

module.exports = { useFakeFirebase };
