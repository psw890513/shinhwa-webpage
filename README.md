# 신화 건설 - 산업기계 임대 웹사이트

발전기·양수기 등 산업용 기계 임대 회사의 소개 사이트입니다.

- **공개 사이트** `index.html` : 회사 소개, 제품 카탈로그, 임대 문의 폼
- **관리자** `admin/index.html` : 제품 등록·수정·삭제
- **관리자** `admin/inquiries.html` : 접수된 문의 확인, 상태 변경, 삭제

빌드 도구 없이 동작하는 정적 사이트이며, 데이터는 Firebase(Firestore, Authentication)에 저장됩니다.

```
index.html               공개 사이트
admin/                   관리자 페이지
css/style.css            공개 사이트 스타일
css/admin.css            관리자 스타일
js/firebase-config.js    Firebase 설정값 (직접 입력 필요)
js/firebase.js           Firebase 연결 및 데이터 함수
js/main.js               공개 사이트 동작 (카탈로그, 문의 폼)
js/products.js           샘플 제품 데이터 (Firebase 미설정 시 사용)
firestore.rules          Firestore 보안 규칙
```

---

## 1. Firebase 프로젝트 만들기

1. https://console.firebase.google.com 에서 **프로젝트 추가**
2. **Firestore Database** → 데이터베이스 만들기 (위치: `asia-northeast3` 서울 권장, 운영 모드로 시작)
3. **Authentication** → 시작하기 → 로그인 방법에서 **이메일/비밀번호** 사용 설정
4. **프로젝트 설정 → 일반 → 내 앱 → 웹 앱 추가(</>)** 후 표시되는 `firebaseConfig` 값을 복사

## 2. 설정값 입력

`js/firebase-config.js` 의 `YOUR_...` 값을 2번에서 복사한 값으로 바꿉니다.

## 3. 보안 규칙 적용

Firestore → **규칙** 탭에 `firestore.rules` 내용을 붙여넣고 **게시**합니다.

## 4. 관리자 계정 만들기

1. Authentication → **사용자** → **사용자 추가**: 관리자 이메일과 비밀번호 입력
2. 생성된 사용자의 **UID** 를 복사
3. Firestore → **데이터 시작** → 컬렉션 ID `admins` → 문서 ID에 **UID 붙여넣기** → 필드 없이 저장

이 `admins/{UID}` 문서가 있어야 관리자 페이지에 들어갈 수 있습니다.

## 5. 제품 등록

`admin/index.html` 에 로그인 → 제품이 없으면 **샘플 제품 10개 불러오기** 버튼으로 예시 데이터를 넣고, 실제 장비로 수정하세요.

---

## 참고

- 공개 사이트의 문의 폼은 `inquiries` 컬렉션에 저장됩니다. 방문자는 등록만 할 수 있고 다른 문의는 볼 수 없습니다.
- 스팸 문의가 많아지면 Firebase App Check 또는 reCAPTCHA 도입을 검토하세요.
- 공개 사이트 호스팅은 GitHub Pages, Netlify, Firebase Hosting 중 편한 곳을 선택하면 됩니다. Firebase Hosting을 쓰면 `firebase deploy` 한 번으로 사이트와 규칙을 함께 배포할 수 있습니다.
- 관리자 페이지는 검색엔진에 노출되지 않도록 `noindex` 설정되어 있습니다.

## 페이지 주소 (배포 후 예시)

| 페이지 | 경로 |
|---|---|
| 공개 사이트 | `/` |
| 제품 관리 | `/admin/` |
| 접수 내역 | `/admin/inquiries.html` |
