import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 설정값이 아직 placeholder이면 Firebase를 연결하지 않고 샘플 데이터로 동작합니다.
export const isConfigured = !firebaseConfig.apiKey.startsWith("YOUR_");

let db = null;
let auth = null;

if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

/* ---------- 제품 ---------- */

// 설정 전이거나 실패하면 null을 반환하여 호출 측이 샘플 데이터를 쓰도록 합니다.
export async function fetchProducts() {
  if (!isConfigured) return null;
  const snap = await getDocs(query(collection(db, "products"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveProduct(id, data) {
  const payload = { ...data, updatedAt: serverTimestamp() };
  if (id) {
    await setDoc(doc(db, "products", id), payload, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(db, "products"), { ...payload, createdAt: serverTimestamp() });
  return ref.id;
}

export function deleteProduct(id) {
  return deleteDoc(doc(db, "products", id));
}

/* ---------- 문의 ---------- */

export function addInquiry(data) {
  return addDoc(collection(db, "inquiries"), {
    name: data.name,
    phone: data.phone,
    equipment: data.equipment,
    period: data.period,
    message: data.message,
    status: "new",
    createdAt: serverTimestamp()
  });
}

export async function fetchInquiries() {
  const snap = await getDocs(query(collection(db, "inquiries"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt ? data.createdAt.toDate() : null,
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
      history: (data.history || []).map((h) => ({ ...h, at: h.at && h.at.toDate ? h.at.toDate() : null }))
    };
  });
}

export function setInquiryStatus(id, status) {
  return updateDoc(doc(db, "inquiries", id), { status });
}

// 상태, 견적 금액, 처리 메모를 저장하고 처리 기록(history)에 한 줄을 더합니다.
export function updateInquiry(id, fields, historyNote) {
  const data = { ...fields, updatedAt: serverTimestamp() };
  if (historyNote) data.history = arrayUnion({ ...historyNote, at: Timestamp.now() });
  return updateDoc(doc(db, "inquiries", id), data);
}

export function deleteInquiry(id) {
  return deleteDoc(doc(db, "inquiries", id));
}

/* ---------- 인증 ---------- */

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

// cb(user, isAdmin) 형태로 로그인 상태가 바뀔 때마다 호출됩니다.
export function onAuthChange(cb) {
  if (!isConfigured) {
    cb(null, false);
    return;
  }
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      cb(null, false);
      return;
    }
    let admin = false;
    try {
      admin = (await getDoc(doc(db, "admins", user.uid))).exists();
    } catch (e) {
      admin = false;
    }
    cb(user, admin);
  });
}
