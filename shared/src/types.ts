// 공통 타입 예시

export enum WormType {
    Player = "player",
    Bot = "bot",
}

export enum BotType {
    FoodSeeker = 0,
    PlayerTracker = 1,
}

export interface WormSegment {
    x: number;
    y: number;
    radius: number;
}

export interface Food {
    id: string;
    x: number;
    y: number;
    radius: number;
    color: number;
}

export interface Worm {
    id: string;
    nickname: string;
    score: number;
    type: WormType;
    botType?: BotType; // 봇인 경우에만 사용되는 속성
    segments: WormSegment[];
    direction: { x: number; y: number };
    isSprinting: boolean;
    color: number; // 지렁이 색상
}

export interface GameRoom {
    id: string;
    worms: Worm[];
    status: "waiting" | "playing" | "finished";
}

export interface GameState {
    worms: Worm[];
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
