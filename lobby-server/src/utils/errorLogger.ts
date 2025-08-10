import axios from "axios";

export function logDetailedError(error: unknown, contextMessage: string) {
    console.error(contextMessage);
    if (axios.isAxiosError(error)) {
        const headersToLog: Record<string, string> = {};
        if (error.response && error.response.headers) {
            for (const key in error.response.headers) {
                if (Object.prototype.hasOwnProperty.call(error.response.headers, key)) {
                    headersToLog[key] = String(error.response.headers[key]);
                }
            }
        }
        let responseData: unknown = undefined;
        if (error.response?.data !== undefined) {
            // Attempt to stringify if it's an object, otherwise keep as is
            try {
                responseData =
                    typeof error.response.data === "object" && error.response.data !== null
                        ? JSON.stringify(error.response.data)
                        : error.response.data;
            } catch (e) {
                responseData = `[Could not stringify response data: ${String(e)}]`;
            }
        }

        const responseStatus: number | undefined = error.response?.status;

        console.error("Axios Error Details:", {
            message: error.message,
            code: error.code,
            response: responseData, // Now explicitly handled
            status: responseStatus, // Now explicitly handled
            headers: headersToLog,
        });
    } else if (error instanceof Error) {
        console.error("Standard Error Object:", error.message, error.stack);
    } else {
        console.error("Unknown Error Object:", error);
    }
}
