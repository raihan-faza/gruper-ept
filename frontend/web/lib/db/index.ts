import { createRxDatabase, RxDatabase, RxCollection, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

// Add plugins
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBQueryBuilderPlugin);


import {
    expenseSchema,
    walletSchema,
    userProfileSchema,
    llmJobSchema,
    walletMemberSchema,
    pendingDeletionSchema,
    ExpenseDoc,
    WalletDoc,
    UserProfileDoc,
    LlmJobDoc,
    WalletMemberDoc,
    PendingDeletionDoc
} from './schema';

// Export types
export type ScriptseaCollections = {
    expenses: RxCollection<ExpenseDoc>;
    wallets: RxCollection<WalletDoc>;
    user_profile: RxCollection<UserProfileDoc>;
    llm_jobs: RxCollection<LlmJobDoc>;
    wallet_members: RxCollection<WalletMemberDoc>;
    pending_deletions: RxCollection<PendingDeletionDoc>;
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
                ignoreDuplicate: process.env.NODE_ENV === 'development', // Prevents errors during hot module reloading in dev mode
            });

            await db.addCollections({
                expenses: {
                    schema: expenseSchema,
                    migrationStrategies: {
                        1: (oldDoc: any) => oldDoc,
                    },
                },
                wallets: { schema: walletSchema },
                user_profile: { schema: userProfileSchema },
                llm_jobs: {
                    schema: llmJobSchema,
                    migrationStrategies: {
                        1: (oldDoc: any) => oldDoc,
                    },
                },
                wallet_members: { schema: walletMemberSchema },
                pending_deletions: {
                    schema: pendingDeletionSchema,
                    migrationStrategies: {
                        1: (oldDoc: any) => {
                            oldDoc.user_id = oldDoc.user_id || '';
                            return oldDoc;
                        },
                    },
                },
            });

            return db;
        })();
    }

    return dbPromise;
}

