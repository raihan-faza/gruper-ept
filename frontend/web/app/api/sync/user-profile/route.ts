import { NextResponse } from 'next/server';
import { UpdateUser } from '@/app/api/user/user';
import { getToken } from '@/app/api/auth/auth';
import { UserProfileDoc } from '@/lib/db/schema';
import { UpdateUserPayload } from '@/app/api/user/payloads';

export async function POST(request: Request) {
    try {
        const token = await getToken(request.headers);
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const doc: UserProfileDoc = await request.json();

        // Map UserProfileDoc to UpdateUserPayload
        const payload: UpdateUserPayload = {
            username: doc.username,
            first_name: doc.first_name,
            last_name: doc.last_name,
            phone_number: doc.phone_number,
        };

        const serverResponse = await UpdateUser(payload, token);

        // Forward error wrapped response from existing fetch client
        if (serverResponse?.error) {
            return NextResponse.json(serverResponse, { status: 400 });
        }

        // Return server response as JSON for upsertFromServer
        return NextResponse.json(serverResponse);

    } catch (error: any) {
        console.error("Error in sync user-profile route:", error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
