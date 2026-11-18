# (주)신화건설기계 - 산업기계 임대 웹사이트

발전기·양수기 등 산업용 기계 임대 회사의 소개 사이트입니다.

- **공개 사이트** `index.html` : 회사 소개, 제품 카탈로그, 임대 문의 폼
- **관리자** `admin/index.html` : 콘텐츠 관리 (장비, 공지사항, 회사 정보, 배너). Firebase 로그인
- **관리자** `admin/inquiries.html` : 견적 요청 관리 (상태, 견적 금액, 메모, 처리 기록)

빌드 도구 없이 동작하는 정적 사이트이며, 데이터는 Firebase(Firestore, Authentication)에 저장됩니다.

```
index.html               임대/렌탈 (장비 목록, 메인)
about.html               회사소개
contact.html             견적문의 (문의 폼)
notice.html              공지사항
location.html            오시는 길
admin/                   관리자 페이지
css/style.css            공개 사이트 스타일
css/admin.css            관리자 스타일
js/firebase-config.js    Firebase 설정값 (직접 입력 필요)
js/firebase.js           Firebase 연결 및 데이터 함수
js/main.js               공개 사이트 동작 (카탈로그, 문의 폼)
data/content.json        기본 콘텐츠 (관리자가 처음 저장하기 전, Firebase를 못 읽을 때)
js/products.js           기본 데이터와 구분·상태 이름 (content.json을 못 읽을 때)
firestore.rules          Firestore 보안 규칙
images/equip/            장비 그림 (SVG)
tests/smoke.test.js      PC/모바일 동작 점검 테스트
docs/dev-check.md        프로젝트 점검표 (네 칸)
docs/plan.md             다음 작업 계획
.claude/skills/          Claude 작업 스킬
```

## 점검 테스트

```
npm install
npx playwright install chromium
npm test
```

---

## 콘텐츠 관리

1. `https://psw890513.github.io/shinhwa-webpage/admin/` 에 관리자 이메일과 비밀번호로 로그인합니다.
2. 장비, 공지사항, 회사 정보, 배너를 고치고 **저장**을 누르면 사이트에 바로 반영됩니다.
3. 내용은 Firestore `site/content` 문서에 저장됩니다. 한 번도 저장하지 않았으면 `data/content.json`의 기본 내용이 나옵니다.

Firebase 프로젝트: `shinhwa-11e7e` (설정값은 `js/firebase-config.js`에 입력됨). 아래는 처음 설정 순서입니다.

## 1. Firebase 프로젝트 만들기

1. https://console.firebase.google.com 에서 **프로젝트 추가**
2. **Firestore Database** → 데이터베이스 만들기 (위치: `asia-northeast3` 서울 권장, 운영 모드로 시작)
3. **Authentication** → 시작하기 → 로그인 방법에서 **이메일/비밀번호** 사용 설정
4. **프로젝트 설정 → 일반 → 내 앱 → 웹 앱 추가(</>)** 후 표시되는 `firebaseConfig` 값을 복사

## 2. 설정값 입력

`js/firebase-config.js` 의 `YOUR_...` 값을 2번에서 복사한 값으로 바꿉니다.

## 3. 보안 규칙 적용

Firestore → **규칙** 탭에 `firestore.rules` 내용을 붙여넣고 **게시**합니다. `firestore.rules`가 바뀌면 이 작업을 다시 해야 합니다.

- 사이트 콘텐츠(`site`): 누구나 읽기, 관리자만 쓰기.
- 견적 요청: 방문자는 새 요청 등록만 할 수 있습니다. 관리자는 읽기·삭제와 처리 정보(상태, 견적 금액, 처리 메모, 처리 기록) 수정만 할 수 있고, 손님이 쓴 내용은 바꿀 수 없습니다.

## 4. 관리자 계정 만들기

1. Authentication → **사용자** → **사용자 추가**: 관리자 이메일과 비밀번호 입력
2. 생성된 사용자의 **UID** 를 복사
3. Firestore → **컬렉션 시작** → 컬렉션 ID `admins` → 문서 ID에 **UID 붙여넣기** → 필드 `role` (string) 값 `admin` → 저장

이 `admins/{UID}` 문서가 있어야 관리자 페이지에 들어갈 수 있습니다.

## 5. 콘텐츠 첫 저장

`admin/index.html` 에 로그인하면 기본 콘텐츠(`data/content.json`)가 불러와집니다. 실제 회사 정보와 장비로 고친 뒤 **저장**하면 그때부터 Firestore 내용이 사이트에 나옵니다.

---

## 참고

- 공개 사이트의 문의 폼은 `inquiries` 컬렉션에 저장됩니다. 방문자는 등록만 할 수 있고 다른 문의는 볼 수 없습니다.
- 스팸 문의가 많아지면 Firebase App Check 또는 reCAPTCHA 도입을 검토하세요.
- 공개 사이트 호스팅은 GitHub Pages, Netlify, Firebase Hosting 중 편한 곳을 선택하면 됩니다. Firebase Hosting을 쓰면 `firebase deploy` 한 번으로 사이트와 규칙을 함께 배포할 수 있습니다.
- 관리자 페이지는 검색엔진에 노출되지 않도록 `noindex` 설정되어 있습니다.

## 페이지 주소

현재 GitHub Pages(`main` 브랜치)로 배포 중: https://psw890513.github.io/shinhwa-webpage/


| 페이지 | 경로 |
|---|---|
| 임대/렌탈 (메인) | `/` |
| 회사소개 | `/about.html` |
| 견적문의 | `/contact.html` |
| 공지사항 | `/notice.html` |
| 오시는 길 | `/location.html` |
| 제품 관리 | `/admin/` |
| 견적 요청 관리 | `/admin/inquiries.html` (설정 전 예시 화면: `?demo`) |
