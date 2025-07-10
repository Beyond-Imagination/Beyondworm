// 공통 타입 예시

export interface Player {
    id: string;
    nickname: string;
    score: number;
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
    payload: any;
}

export interface GameServer {
    address: string;
    playerCount: number;
    lastSeen: number;
}
