import { NextResponse } from 'next/server';
import { UpdateWallet, UpdateWalletPayload } from '@/app/api/wallet/wallet';
import { getToken } from '@/app/api/auth/auth';
import { WalletDoc } from '@/lib/db/schema';

export async function POST(request: Request) {
    try {
        const token = await getToken(request.headers);
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const doc: WalletDoc = await request.json();

        // Map WalletDoc to UpdateWalletPayload
        const payload: UpdateWalletPayload = {
            wallet_name: doc.name,
        };

        const serverResponse = await UpdateWallet(doc.id, payload, token);

        // Forward error wrapped response from existing fetch client
        if (serverResponse?.error) {
            return NextResponse.json(serverResponse, { status: 400 });
        }

        // Return server response as JSON for upsertFromServer
        return NextResponse.json(serverResponse);

    } catch (error: any) {
        console.error("Error in sync wallets route:", error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
