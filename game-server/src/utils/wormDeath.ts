import { Worm, WormDeathData, WormDeathReason } from "@beyondworm/shared";

interface CreateWormDeathPayloadParams {
    killedWormId: string;
    killerWorm?: Worm | null;
    deathReason: WormDeathReason;
}

export function createWormDeathPayload(params: Readonly<CreateWormDeathPayloadParams>): WormDeathData {
    return {
        killedWormId: params.killedWormId,
        killerWormId: params.killerWorm?.id ?? null,
        deathReason: params.deathReason,
        killerNickname: params.killerWorm?.nickname ?? null,
    };
}
