# ■ 1단계: 빌더 — shared → game 빌드
FROM node:20-alpine AS builder
WORKDIR /app

# (캐시 최적화) 메타 먼저
COPY shared/package*.json shared/
COPY game-server/package*.json game-server/

# shared 설치
WORKDIR /app/shared
RUN npm ci

# shared 소스 복사 + 빌드
COPY shared/tsconfig.json .
COPY shared/src ./src
RUN npm run build   # => /app/shared/dist 생성

# game 소스 복사
WORKDIR /app/game-server
COPY game-server/tsconfig.json .
COPY game-server/src ./src

# game 설치(로컬 file:../shared를 이미 /app/shared로 제공 중)
RUN npm ci
RUN npm run build  # => /app/game-server/dist/index.js

# ■ 2단계: 런타임 — 가볍게
FROM node:20-alpine
WORKDIR /app/game-server

ENV NODE_ENV=production
ENV PORT=7200

# 런타임 메타
COPY game-server/package*.json ./

# 빌더 산출물만 가져오기
COPY --from=builder /app/game-server/node_modules ./node_modules
COPY --from=builder /app/game-server/dist ./dist

# (중요) file: 링크의 안정성 위해 shared도 옆에 둔다
WORKDIR /app
COPY --from=builder /app/shared ./shared

# 실행
WORKDIR /app/game-server
EXPOSE 7200
CMD ["node","dist/index.js"]
