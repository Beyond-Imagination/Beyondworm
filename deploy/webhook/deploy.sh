#!/bin/sh
set -eu

LOG=/hooks/deploy.log

{
  TS=$(date "+%Y-%m-%dT%H:%M:%S%z")
  echo "[$TS] === deploy start ==="

  # 중복 배포 방지(락)
  if command -v flock >/dev/null 2>&1; then
    flock -n /tmp/bw-deploy.lock -c '
      # 1) GHCR 로그인 (PAT은 .env-webhook에서 주입됨)
      printf "%s" "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

      # 2) 최신 이미지 pull
      docker compose -f /webhook/docker-compose.yml pull

      # 3) 서비스 무중단 재기동
      docker compose -f /webhook/docker-compose.yml up -d

      # 4) 간단 헬스체크 (실패해도 스크립트 전체는 성공)
      curl -sfI http://127.0.0.1:8081/health || true
      curl -sfI http://127.0.0.1:7200/health || true
    '
  else
    echo "[warn] flock 없음 — 동시 실행 방지 기능 비활성"
  fi

  echo "[$TS] === deploy done ==="
} >>"$LOG" 2>&1
