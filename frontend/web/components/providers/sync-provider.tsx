'use client';

import { useEffect } from 'react';
import { useDatabase } from '@/lib/db/hooks';
import { createSyncManager } from '@/lib/db/sync-manager';
import { authClient } from '@/lib/auth-client';

export default function SyncProvider() {
    const db = useDatabase();
    const { data: session } = authClient.useSession();
    const userId = session?.user?.id;

    useEffect(() => {
        if (!db || !userId) return;

        const syncManager = createSyncManager(db);

        // Run initial sync on mount (once database is available)
        syncManager.syncAll(userId).catch((err) => {
            console.error('Failed to run initial sync:', err);
        });

        // Start listening to online network events
        const cleanup = syncManager.startAutoSync(userId);

        return () => {
            cleanup();
        };
    }, [db, userId]);

    return null;
}
