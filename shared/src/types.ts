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

export interface Worm {
    id: string;
    type: WormType;
    botType?: BotType; // 봇인 경우에만 사용되는 속성
    segments: WormSegment[];
    direction: { x: number; y: number };
    isSprinting: boolean;
    color: number; // 지렁이 색상
}

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
