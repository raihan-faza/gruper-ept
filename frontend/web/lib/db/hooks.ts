'use client';

import { useEffect, useState } from 'react';
import { getDatabase, ScriptseaDatabase } from './index';

export function useDatabase() {
    const [db, setDb] = useState<ScriptseaDatabase | null>(null);

    useEffect(() => {
        let active = true;

        async function initDb() {
            const database = await getDatabase();
            if (active) {
                setDb(database);
            }
        }

        initDb();

        return () => {
            active = false;
        };
    }, []);

    return db;
}
