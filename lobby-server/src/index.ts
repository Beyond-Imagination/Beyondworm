import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 1. 게임 서버 정보를 캐싱할 자료구조
interface GameServer {
  address: string;
  playerCount: number;
  lastSeen: number;
}

// 서버 ID를 키로 사용하여 서버 정보를 저장하는 Map
const serverCache = new Map<string, GameServer>();

const SERVER_TIMEOUT = 30000; // 30초

// 1) 게임 서버 등록 및 정보 업데이트 엔드포인트
app.post('/server/register', (req: Request, res: Response) => {
  const { serverId, address } = req.body;

  if (!serverId || !address) {
    return res.status(400).json({ message: 'Missing required server information: serverId, address, playerCount' });
  }

  const now = Date.now();
  const serverInfo: GameServer = {
    address,
    playerCount: 0,
    lastSeen: now,
  };

  serverCache.set(serverId, serverInfo);
  console.log(`Server registered/updated: ${serverId} at ${address}.`);
  
  res.status(200).json({ message: 'Server information received' });
});

// 2) F/E 접속 요청 시, 서버 목록과 정보 반환 엔드포인트
app.get('/servers', (req: Request, res: Response) => {
  const serverList = Array.from(serverCache.entries()).map(([id, data]) => ({
    id,
    ...data,
  }));
  res.status(200).json(serverList);
});

// 오래된 서버를 주기적으로 정리하는 로직
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [serverId, serverInfo] of serverCache.entries()) {
    if (now - serverInfo.lastSeen > SERVER_TIMEOUT) {
      serverCache.delete(serverId);
      console.log(`Removed stale server: ${serverId}`);
    }
  }
}, 10000); // 10초마다 체크

// 서버 종료 시 interval 정리
function gracefulShutdown() {
  clearInterval(cleanupInterval);
  console.log("Interval cleared. Shutting down server.");
  process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

app.listen(PORT, () => {
  console.log(`Lobby server is running on port ${PORT}`);
});
