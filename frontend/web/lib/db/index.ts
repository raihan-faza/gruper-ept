import { createRxDatabase, RxDatabase, RxCollection, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import {
    expenseSchema,
    walletSchema,
    userProfileSchema,
    llmJobSchema,
    ExpenseDoc,
    WalletDoc,
    UserProfileDoc,
    LlmJobDoc
} from './schema';

// Export types
export type ScriptseaCollections = {
    expenses: RxCollection<ExpenseDoc>;
    wallets: RxCollection<WalletDoc>;
    user_profile: RxCollection<UserProfileDoc>;
    llm_jobs: RxCollection<LlmJobDoc>;
};

export type ScriptseaDatabase = RxDatabase<ScriptseaCollections>;

// Import dev-mode plugin conditionally in development
if (process.env.NODE_ENV === 'development') {
    // We require dev-mode plugin inside a require block or imports
    // rxdb requires dev mode plugin to help debug
    import('rxdb/plugins/dev-mode').then(({ RxDBDevModePlugin }) => {
        addRxPlugin(RxDBDevModePlugin);
    }).catch(err => {
        console.warn('Failed to load RxDB dev-mode plugin:', err);
    });
}

let dbPromise: Promise<ScriptseaDatabase> | null = null;

export async function getDatabase(): Promise<ScriptseaDatabase | null> {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!dbPromise) {
        dbPromise = (async () => {
            const db = await createRxDatabase<ScriptseaCollections>({
                name: 'scriptsea_db',
                storage: wrappedValidateAjvStorage({
                    storage: getRxStorageDexie(),
                }),
                ignoreDuplicate: true, // Prevents errors during hot module reloading
            });

            await db.addCollections({
                expenses: { schema: expenseSchema },
                wallets: { schema: walletSchema },
                user_profile: { schema: userProfileSchema },
                llm_jobs: { schema: llmJobSchema }
            });

            return db;
        })();
    }

    return dbPromise;
}

