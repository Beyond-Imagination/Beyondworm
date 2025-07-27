// 공통 타입 예시

export interface Player {
    id: string;
    nickname: string;
    score: number;
    worm: {
        x: number;
        y: number;
        direction: { x: number; y: number }; // 지렁이의 현재 방향 벡터
    };
}

export interface GameRoom {
    id: string;
    players: Player[];
    status: "waiting" | "playing" | "finished";
}

export interface GameState {
    players: Player[];
    currentTurn: string;
    gameOver: boolean;
}

export interface Action {
    type: string;
    payload: unknown;
}

export interface GameServer {
    address: string;
    playerCount: number;
    lastSeen: number;
}
