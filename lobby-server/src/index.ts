import express, { Request, Response } from "express";
import cors from "cors";
import axios from "axios";
import { logDetailedError } from "@beyondworm/shared";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 1. 게임 서버 정보를 캐싱할 자료구조
interface GameServer {
    publicAddress: string;
    internalAddress: string;
    playerCount: number;
    lastSeen: number;
}

// 서버 ID를 키로 사용하여 서버 정보를 저장하는 Map
const serverCache = new Map<string, GameServer>();

// 1) 게임 서버 등록 및 정보 업데이트 엔드포인트
app.post("/server", (req: Request, res: Response) => {
    const { serverId, publicAddress, internalAddress } = req.body as {
        serverId: string;
        publicAddress: string;
        internalAddress: string;
    };

    if (!serverId || !publicAddress || !internalAddress) {
        return res
            .status(400)
            .json({ message: "Missing required server information: serverId, publicAddress, internalAddress" });
    }

    // 주소가 같은 기존 서버를 찾아 삭제
    for (const [id, server] of serverCache.entries()) {
        if (server.publicAddress === publicAddress || server.internalAddress === internalAddress) {
            serverCache.delete(id);
            console.log(`Removed existing server entry for address ${publicAddress} with old id ${id}.`);
            break;
        }
    }

    const now = Date.now();
    const serverInfo: GameServer = {
        publicAddress,
        internalAddress,
        playerCount: 0,
        lastSeen: now,
    };

    serverCache.set(serverId, serverInfo);
    console.log(`Server registered/updated: ${serverId} at ${publicAddress} (internal: ${internalAddress}).`);

    res.status(200).json({ message: "Server information received" });
});

// 2) 게임 서버 플레이어 수 업데이트 엔드포인트
app.patch("/server", (req: Request, res: Response) => {
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

    // console.log(`Server updated: ${serverId} now has ${playerCount} players.`);

    res.status(200).json({ message: "Player count updated" });
});

// 3) F/E 접속 요청 시, 서버 목록과 정보 반환 엔드포인트
app.get("/servers", (req: Request, res: Response) => {
    const serverList = Array.from(serverCache.entries()).map(([id, data]) => ({
        id,
        address: data.publicAddress, // 클라이언트에게는 publicAddress를 address로 전달
        playerCount: data.playerCount,
        lastSeen: data.lastSeen,
    }));
    res.status(200).json(serverList);
});

// 4) 헬스 체크 엔드포인트
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
});

// 주기적으로 게임 서버 헬스 체크
const HEALTH_CHECK_INTERVAL = 10000; // 10초마다
const HEALTH_CHECK_TIMEOUT = 5000; // 5초

const healthCheckInterval = setInterval(async () => {
    console.log("🩺 Running health checks...");
    if (serverCache.size === 0) {
        console.log("No servers to check.");
        return;
    }

    const serversToRemove: string[] = [];
    const checkPromises = Array.from(serverCache.entries()).map(async ([serverId, serverInfo]) => {
        try {
            // 헬스체크는 internalAddress 사용
            await axios.get(`${serverInfo.internalAddress}/health`, { timeout: HEALTH_CHECK_TIMEOUT });
            // Health check successful
            // console.log(`✅ Health check successful for server ${serverId}`);
            serverInfo.lastSeen = Date.now();
        } catch (error: unknown) {
            logDetailedError(error, `❌ Health check failed for server ${serverId} at ${serverInfo.internalAddress}:`);
            serversToRemove.push(serverId);
        }
    });

    await Promise.all(checkPromises);

    serversToRemove.forEach((serverId) => {
        serverCache.delete(serverId);
        console.log(`Removed unresponsive server: ${serverId}`);
    });
}, HEALTH_CHECK_INTERVAL);

// 서버 종료 시 interval 정리
function gracefulShutdown() {
    clearInterval(healthCheckInterval);
    console.log("Health check interval cleared. Shutting down server.");
    process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

app.listen(PORT, () => {
    console.log(`Lobby server is running on port ${PORT}`);
});
