import { NextResponse } from 'next/server';
import { SyncLlmJob } from '@/app/api/llm/llm';
import { getToken } from '@/app/api/auth/auth';
import { LlmJobDoc } from '@/lib/db/schema';

export async function POST(request: Request) {
    try {
        const token = await getToken(request.headers);
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const doc: LlmJobDoc = await request.json();

        const serverResponse = await SyncLlmJob(doc, token);

        // Forward error wrapped response from existing fetch client
        if (serverResponse?.error) {
            return NextResponse.json(serverResponse, { status: 400 });
        }

        // Return server response as JSON for upsertFromServer
        return NextResponse.json(serverResponse);

    } catch (error: any) {
        console.error("Error in sync llm-jobs route:", error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
