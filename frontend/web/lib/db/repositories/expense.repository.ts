import { ScriptseaDatabase } from '../index';
import { ExpenseDoc } from '../schema';

const generateUUID = (): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export type CreateExpenseData = Omit<ExpenseDoc, 'id' | 'created_at' | 'updated_at' | 'is_synced' | 'idempotency_key' | 'is_new'> & { is_new?: boolean, idempotency_key?: string };
export type UpdateExpenseData = Partial<Omit<ExpenseDoc, 'id' | 'created_at' | 'updated_at' | 'is_synced' | 'idempotency_key'>>;
export type ServerExpenseData = Omit<ExpenseDoc, 'is_synced' | 'is_new'> & { is_new?: boolean };

export function createExpenseRepository(db: ScriptseaDatabase) {
    return {
        /**
         * Inserts a new expense with auto-generated id, idempotency_key, is_synced: false,
         * and ISO timestamps for created_at and updated_at.
         */
        async create(data: CreateExpenseData): Promise<ExpenseDoc> {
            const now = new Date().toISOString();
            const expense: ExpenseDoc = {
                ...data,
                id: generateUUID(),
                idempotency_key: data.idempotency_key ?? generateUUID(),
                is_synced: false,
                is_new: data.is_new ?? true,
                created_at: now,
                updated_at: now,
            };
            const doc = await db.expenses.insert(expense);
            return doc.toJSON() as ExpenseDoc;
        },

        /**
         * Patches an existing document with the new data, setting is_synced: false
         * and updated_at to the current time.
         */
        async update(id: string, data: UpdateExpenseData): Promise<ExpenseDoc> {
            const doc = await db.expenses.findOne(id).exec();
            if (!doc) {
                throw new Error(`Expense with id ${id} not found`);
            }
            const updated = await doc.incrementalPatch({
                ...data,
                is_synced: (data as any).is_synced ?? false,
                updated_at: new Date().toISOString(),
            });
            return updated.toJSON() as ExpenseDoc;
        },

        /**
         * Patches is_synced: true on a single document.
         */
        async markSynced(id: string): Promise<ExpenseDoc> {
            const doc = await db.expenses.findOne(id).exec();
            if (!doc) {
                throw new Error(`Expense with id ${id} not found`);
            }
            const updated = await doc.incrementalPatch({
                is_synced: true,
            });
            return updated.toJSON() as ExpenseDoc;
        },

        /**
         * Upserts the full server response with is_synced: true,
         * preserving server timestamps exactly as-is.
         */
        async upsertFromServer(data: ServerExpenseData): Promise<ExpenseDoc> {
            const doc = await db.expenses.upsert({
                ...data,
                is_synced: true,
                is_new: data.is_new ?? false,
            });
            return doc.toJSON() as ExpenseDoc;
        },

        /**
         * Finds all expenses by wallet_id + user_id, biar ga ke mix
         */
        async findByWallet(walletId: string, userId: string): Promise<ExpenseDoc[]> {
            const docs = await db.expenses.find({
                selector: {
                    wallet_id: walletId,
                    user_id: userId,
                },
            }).exec();
            return docs.map((doc) => doc.toJSON() as ExpenseDoc);
        },

        /**
         * Finds all documents where is_synced is false.
         */
        async findUnsynced(userId: string): Promise<ExpenseDoc[]> {
            const docs = await db.expenses.find({
                selector: {
                    is_synced: false,
                    user_id: userId,
                },
            }).exec();
            return docs.map((doc) => doc.toJSON() as ExpenseDoc);
        },

        /**
         * Finds all expense documents in RxDB.
         */
        async findAll(userId: string): Promise<ExpenseDoc[]> {
            const docs = await db.expenses.find({
                selector: {
                    user_id: userId,
                }
            }).exec();
            return docs.map((doc) => doc.toJSON() as ExpenseDoc);
        },

        /**
         * Finds a single expense by its idempotency_key.
         * Used during reconciliation to match a local draft against a server-confirmed record.
         */
        async findByIdempotencyKey(key: string): Promise<ExpenseDoc | null> {
            const doc = await db.expenses.findOne({
                selector: { idempotency_key: key },
            }).exec();
            return doc ? (doc.toJSON() as ExpenseDoc) : null;
        },

        /**
         * Deletes stale records from local RxDB that are no longer returned by the server.
         * Only targets is_synced=true records (previously pulled from server).
         * Records with is_synced=false / is_new=true (local drafts) are NEVER deleted here.
         * If walletId is provided, only deletes stale synced expenses under that specific wallet.
         */
        async deleteSyncedNotInList(keepIds: string[], walletId?: string, userId?: string): Promise<void> {
            const selector: any = {
                is_synced: { $eq: true },
                id: { $nin: keepIds },
                user_id: userId,
            };
            if (walletId) {
                selector.wallet_id = { $eq: walletId };
            }
            const docs = await db.expenses.find({ selector }).exec();
            for (const doc of docs) {
                await doc.remove();
            }
        },
    };
}
