# Beyondworm Monorepo

이 프로젝트는 웹 기반 I/O 게임 Beyondworm의 모노레포입니다.

## 구조

```
web-io-game/
├── apps/
│   ├── client/         # 클라이언트(Phaser, Vite)
│   ├── server_lobby/   # 로비/매칭 서버
│   └── server_game/    # 게임 서버
├── shared/             # 공통 타입/유틸
├── .husky/             # Git hooks (Husky)
├── .github/            # CI/CD 워크플로우
├── package.json        # 루트 패키지 및 워크스페이스 설정
└── ...
```

## 개발 환경

- Node.js 18+
- pnpm, npm, yarn 등 워크스페이스 지원 패키지 매니저

## 주요 명령어

- `npm install` : 모든 패키지 의존성 설치
- `npm run lint` : 전체 린트 및 포맷
- `npm run build` : 전체 빌드

## 하위 패키지

- [apps/client/README.md](./apps/client/README.md)
- [apps/server_lobby/README.md](./apps/server_lobby/README.md)
- [apps/server_game/README.md](./apps/server_game/README.md)

# Beyondworm Client

Phaser 기반의 웹 게임 클라이언트입니다.

## 주요 파일

- `index.html` : 엔트리 HTML
- `src/client.ts` : 메인 엔트리 포인트
- `vite.config.ts` : Vite 설정

## 개발/실행

```sh
npm install
npm run dev
```

## 빌드

```sh
npm run build
```

## 의존성

- Phaser
- Vite
- @beyondworm/shared (공통 타입/유틸)
