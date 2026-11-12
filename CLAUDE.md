# 프로젝트 지침

## 프로젝트 개요
신화 건설의 산업기계(발전기, 양수기 등) 임대 웹사이트.
- 공개 사이트: `index.html` (정적 HTML/CSS/JS)
- 관리자: `admin/` (제품 관리, 접수 내역) — Firebase Firestore / Authentication 사용
- 개발 브랜치: `claude/affectionate-heisenberg-faf044`

## 답변 규칙
- 사용자의 질문에 답변한 뒤에는 **확인할 수 있는 링크를 항상 함께 알려준다.**
- 링크는 **최신 상태**여야 한다. 배포 전이면 GitHub 브랜치 링크 또는 최신 미리보기 링크를 준다.
- 최신 상태를 확인할 수 없으면 그 사실을 명시한다. 이전 버전 링크를 최신인 것처럼 제시하지 않는다.
- 링크를 줄 때는 어떤 버전인지(이전/최신)도 함께 적는다.
- **미리보기 아티팩트 링크는 답변의 맨 마지막 줄에 둔다.** 그 뒤에는 다른 문장을 쓰지 않는다.
- 미리보기 링크: https://claude.ai/artifact/ADFPrmTMhUgKNWTjeu53bF (최신 버전만 게시)

## 개발 규칙
- 빌드 도구 없이 동작하는 정적 구조를 유지한다.
- 제품 데이터 기본값은 `js/products.js`, 실제 데이터는 Firestore `products` 컬렉션이다.
- Firebase 설정값(`js/firebase-config.js`)은 placeholder 상태일 수 있다. 설정 전에도 공개 사이트가 샘플 데이터로 동작해야 한다.
- 보안 규칙은 `firestore.rules`에서 관리한다. 규칙을 바꾸면 README의 배포 안내도 함께 갱신한다.
- 관리자 페이지는 `noindex` 설정을 유지한다.
