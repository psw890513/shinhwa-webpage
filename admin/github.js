/*
 * GitHub 저장소에 사이트 콘텐츠(data/content.json)와 사진을 저장합니다.
 * 토큰은 관리자 기기의 브라우저(localStorage)에만 보관합니다.
 */
export const REPO = "psw890513/shinhwa-webpage";
export const BRANCH = "main";
export const CONTENT_PATH = "data/content.json";
const TOKEN_KEY = "shinhwa_github_token";
const API = "https://api.github.com/repos/" + REPO;

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
}
export function setToken(t) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch { /* 저장 불가: 이번 접속 동안만 사용 */ }
  memToken = t;
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
  memToken = "";
}
let memToken = getToken();
export const hasToken = () => Boolean(memToken);

async function gh(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: "Bearer " + memToken,
      ...(opts.body ? { "Content-Type": "application/json" } : {})
    }
  });
  if (!res.ok) {
    const err = new Error("GitHub " + res.status);
    err.status = res.status;
    try { err.detail = (await res.json()).message; } catch {}
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

// 토큰이 이 저장소에 쓸 수 있는지 확인
export async function checkToken() {
  const repo = await gh("");
  if (!repo.permissions || !repo.permissions.push) {
    const err = new Error("no-push");
    err.status = 403;
    throw err;
  }
  return repo;
}

/* UTF-8 문자열 ↔ base64 */
function toBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const textToBase64 = (s) => toBase64(new TextEncoder().encode(s));
const base64ToText = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, "")), (c) => c.charCodeAt(0)));

export async function loadContent() {
  const file = await gh("/contents/" + CONTENT_PATH + "?ref=" + BRANCH + "&t=" + Date.now());
  return { data: JSON.parse(base64ToText(file.content)), sha: file.sha };
}

export async function saveContent(data, sha, message) {
  const res = await gh("/contents/" + CONTENT_PATH, {
    method: "PUT",
    body: JSON.stringify({ message, content: textToBase64(JSON.stringify(data, null, 2) + "\n"), sha, branch: BRANCH })
  });
  return res.content.sha;
}

// 사진을 가로 최대 1600px JPEG로 줄여 images/uploads/ 에 올리고, 사이트에서 쓸 주소를 돌려줍니다.
export async function uploadImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const path = "images/uploads/" + stamp + "-" + Math.random().toString(36).slice(2, 6) + ".jpg";
  await gh("/contents/" + path, {
    method: "PUT",
    body: JSON.stringify({ message: "사진 올리기: " + (file.name || path), content: toBase64(bytes), branch: BRANCH })
  });
  return path;
}
