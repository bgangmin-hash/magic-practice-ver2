# Magic Practice

마술 연습 기록 웹앱. 3분 타이머 + 세트 카운트 + 레벨 시스템 + 픽셀 마술사 + 우측 메뉴형 연습 다이어리.

---

## 이번 버전에서 추가된 기능

- 우측 슬라이드 메뉴
  - Practice: 연습기록, 통계보기, 오늘의 루틴, 칭호 시스템
  - Magic Notes: 오늘의 깨달음 작성 및 최근 노트 확인
  - Links: 추천 마술 채널, 추천 마술샵, 추천 자료 자리
  - Settings: 다크/라이트 모드, 사운드 효과, 데이터 백업/불러오기, 홈화면 설치 안내
- Web Audio API 기반 사운드 효과
  - 시작 / 완료 / 레벨업 사운드
  - 외부 음원 파일 필요 없음
- Streak 표시
  - 며칠 연속 연습했는지 계산
- 통계 요약
  - 총 연습 시간
  - 평균 세트
  - 최고 기록 및 최고 기록일
- 연습 루틴
  - 카드마술 / 동전마술 / 멘탈마술 / 연출연습 / 공연준비 / 기타 카테고리
  - 오늘의 루틴 추가, 완료 체크, 삭제
- 칭호 / 업적 시스템
  - 첫 시전
  - 3일의 마법
  - 손끝의 감각
  - 집요한 마술사
  - 기록하는 마술사
  - 루틴 설계자
- 데이터 백업
  - JSON 파일로 내보내기
  - JSON 파일 다시 불러오기
- 홈화면 설치 안내
  - iPhone Safari / Android Chrome 기준 안내 문구 포함

---

## 링크 수정 방법

`app/page.jsx` 상단의 `RESOURCE_LINKS`를 수정하면 됩니다.

```jsx
const RESOURCE_LINKS = [
  {
    title: '친구의 마술 채널',
    description: '추천 영상, 공연 기록, 렉처 후기 등을 모아둘 공간입니다.',
    url: '여기에 유튜브 링크',
    label: 'YouTube 보러가기',
  },
];
```

---

## 배포하기

### 1단계: GitHub에 코드 올리기

1. GitHub 로그인 후 우측 상단 `+` → `New repository` 클릭
2. Repository 이름 입력
3. `Create repository` 클릭
4. 이 폴더 안의 모든 파일을 업로드
5. `Commit changes` 클릭

### 2단계: Vercel에서 배포

1. Vercel 로그인
2. `Add New...` → `Project`
3. GitHub 저장소 Import
4. 기본값 그대로 `Deploy`
5. 배포 완료 후 생성된 주소를 공유

---

## 폴더 구조

```text
magic-practice-updated/
├── package.json
├── next.config.mjs
├── app/
│   ├── layout.js
│   └── page.jsx
└── README.md
```

---

## 메모

현재 버전은 브라우저 `localStorage` 기반입니다. 따라서 같은 브라우저에서는 기록이 유지되지만, 기기 간 자동 동기화는 되지 않습니다. 기기 변경 전에는 Settings의 데이터 백업하기 기능으로 JSON 파일을 저장해두는 것을 권장합니다.
