FROM node:20-alpine AS builder
WORKDIR /app

COPY shared/package*.json shared/
COPY lobby-server/package*.json lobby-server/

WORKDIR /app/shared
RUN npm ci

COPY shared/tsconfig.json .
COPY shared/src ./src
RUN npm run build

WORKDIR /app/lobby-server
COPY lobby-server/tsconfig.json .
COPY lobby-server/src ./src
RUN npm ci
RUN npm run build   # => /app/lobby-server/dist/index.js

# 개발용 의존성 제거
RUN npm prune --production

FROM node:20-alpine
WORKDIR /app/lobby-server

ENV NODE_ENV=production
ENV PORT=8080

COPY lobby-server/package*.json ./
COPY --from=builder /app/lobby-server/node_modules ./node_modules
COPY --from=builder /app/lobby-server/dist ./dist
WORKDIR /app
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/shared/dist ./shared/dist

WORKDIR /app/lobby-server
EXPOSE 8080
CMD ["node","dist/index.js"]
