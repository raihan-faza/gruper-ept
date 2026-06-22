'use client';

import { useEffect } from 'react';
import { useDatabase } from '@/lib/db/hooks';
import { createSyncManager } from '@/lib/db/sync-manager';

export default function SyncProvider() {
    const db = useDatabase();

    useEffect(() => {
        if (!db) return;

        const syncManager = createSyncManager(db);

        // Run initial sync on mount (once database is available)
        syncManager.syncAll().catch((err) => {
            console.error('Failed to run initial sync:', err);
        });

        // Start listening to online network events
        const cleanup = syncManager.startAutoSync();

        return () => {
            cleanup();
        };
    }, [db]);

    return null;
}
