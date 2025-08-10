import express, { Request, Response } from "express";
import cors from "cors";

const app = express();
app.use(cors());
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

// TODO: 현재 개발 단계라서 임시 값을 지정해둠. 실제 서비스를 할 때는 시간을 넉넉하게 잡아줘야하고, 게임 서버를 다시 띄워주는 로직도 있어야 한다.
const SERVER_TIMEOUT = 300000; // 300초

// 1) 게임 서버 등록 및 정보 업데이트 엔드포인트
app.post("/server/register", (req: Request, res: Response) => {
    const { serverId, address } = req.body as { serverId: string; address: string };

    if (!serverId || !address) {
        return res.status(400).json({ message: "Missing required server information: serverId, address" });
    }

    const now = Date.now();
    const serverInfo: GameServer = {
        address,
        playerCount: 0,
        lastSeen: now,
    };

    serverCache.set(serverId, serverInfo);
    console.log(`Server registered/updated: ${serverId} at ${address}.`);

    res.status(200).json({ message: "Server information received" });
});

// 2) 게임 서버 플레이어 수 업데이트 엔드포인트
app.post("/server/update", (req: Request, res: Response) => {
    const { serverId, playerCount } = req.body as { serverId: string; playerCount: number };

    if (!serverId || playerCount === undefined) {
        return res.status(400).json({ message: "Missing required server information: serverId, playerCount" });
    }

    const serverInfo = serverCache.get(serverId);
    if (!serverInfo) {
        return res.status(404).json({ message: "Server not found" });
    }

    serverInfo.playerCount = playerCount;
    serverInfo.lastSeen = Date.now();
    serverCache.set(serverId, serverInfo);

    console.log(`Server updated: ${serverId} now has ${playerCount} players.`);

    res.status(200).json({ message: "Player count updated" });
});

// 3) F/E 접속 요청 시, 서버 목록과 정보 반환 엔드포인트
app.get("/servers", (req: Request, res: Response) => {
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
