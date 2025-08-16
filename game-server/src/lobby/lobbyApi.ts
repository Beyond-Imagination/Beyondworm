import axios from "axios";
import { logDetailedError } from "@beyondworm/shared";
import { v4 as uuidv4 } from "uuid";

const LOBBY_SERVER_URL = process.env.LOBBY_SERVER_URL || "http://localhost:3000";
const SERVER_ID = process.env.SERVER_ID || `server.${uuidv4()}`;

export async function registerWithLobby() {
    const address = `http://localhost:${process.env.PORT || 3001}`;
    try {
        await axios.post(`${LOBBY_SERVER_URL}/server`, {
            serverId: SERVER_ID,
            address: address,
        });
        console.log(`Successfully registered with lobby server at ${LOBBY_SERVER_URL}`);
    } catch (error: unknown) {
        logDetailedError(error, "Failed to register with lobby server:");
        // Terminate the process if registration fails, as the server cannot function without it.
        process.exit(1);
    }
}

export async function updateServerStatus(status: { playerCount: number }) {
    try {
        await axios.patch(`${LOBBY_SERVER_URL}/server`, {
            serverId: SERVER_ID,
            playerCount: status.playerCount,
        });
        console.log(`Successfully updated server status: ${JSON.stringify(status)}`);
    } catch (error: unknown) {
        logDetailedError(error, "Failed to update server status on lobby server:");
    }
}
