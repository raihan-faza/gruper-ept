import { baseUrl } from "../base";
import { ExtractExpensePayload } from "./payloads";

async function ExtractExpense(data: ExtractExpensePayload, token?: string | null) {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) {
            headers["Authorization"] = `Bearer ${token}`
        }
        const response = await fetch(
            `${baseUrl}/api/v1/llm/extract-expense`,
            {
                method: "POST",
                headers,
                body: JSON.stringify(data),
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `HTTP error ${response.status}`);
        }
        const extractedData = await response.json();
        return extractedData;
    } catch (error) {
        console.error("Error extracting expense data:", error);
        throw error;
    }
}

async function SyncLlmJob(data: any, token?: string | null) {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) {
            headers["Authorization"] = `Bearer ${token}`
        }
        const response = await fetch(
            `${baseUrl}/api/v1/llm-jobs`,
            {
                method: "POST",
                headers,
                body: JSON.stringify(data),
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `HTTP error ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error syncing llm job data:", error);
        return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function GetLLMJobs() {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/llm/jobs`,
            {
                method: "GET",
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `HTTP error ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching LLM jobs:", error);
        return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

export {
    ExtractExpense,
    SyncLlmJob,
    GetLLMJobs,
}