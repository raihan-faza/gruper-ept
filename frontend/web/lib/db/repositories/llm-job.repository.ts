import { ScriptseaDatabase } from '../index';
import { LlmJobDoc } from '../schema';

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

export type CreateLlmJobData = {
    wallet_id: string;
    user_input: string;
    user_id?: string;
    retry_count?: number;
    expense_id?: string;
    error_message?: string;
    llm_result?: string;
    llm_status?: string;
    expense_status?: string;
    is_new?: boolean;
};
export type ServerLlmJobData = Omit<LlmJobDoc, 'is_synced' | 'is_new'> & { is_new?: boolean };

export function createLlmJobRepository(db: ScriptseaDatabase) {
    return {
        /**
         * Inserts a new LLM Job with auto-generated id, idempotency_key, status: 'pending',
         * is_synced: false, and ISO timestamps for created_at and updated_at.
         */
        async create(data: CreateLlmJobData): Promise<LlmJobDoc> {
            const now = new Date().toISOString();
            const job: LlmJobDoc = {
                id: generateUUID(),
                user_id: data.user_id || "",
                wallet_id: data.wallet_id || "",
                user_input: data.user_input || "",
                status: 'pending',
                retry_count: data.retry_count ?? 0,
                expense_id: data.expense_id || "",
                error_message: data.error_message || "",
                llm_result: data.llm_result || "",
                llm_status: data.llm_status || "pending",
                expense_status: data.expense_status || "",
                idempotency_key: generateUUID(),
                is_synced: false,
                is_new: true,
                created_at: now,
                updated_at: now,
            };
            const doc = await db.llm_jobs.insert(job);
            return doc.toJSON() as LlmJobDoc;
        },

        /**
         * Patches is_synced: true on a single LLM Job document.
         */
        async markSynced(id: string): Promise<LlmJobDoc> {
            const doc = await db.llm_jobs.findOne(id).exec();
            if (!doc) {
                throw new Error(`LLM Job with id ${id} not found`);
            }
            const updated = await doc.incrementalPatch({
                is_synced: true,
            });
            return updated.toJSON() as LlmJobDoc;
        },

        /**
         * Upserts the full server response with is_synced: true,
         * preserving server timestamps exactly as-is.
         */
        async upsertFromServer(data: ServerLlmJobData): Promise<LlmJobDoc> {
            const doc = await db.llm_jobs.upsert({
                ...data,
                is_synced: true,
                is_new: data.is_new ?? false,
            });
            return doc.toJSON() as LlmJobDoc;
        },

        /**
         * Finds all jobs by expense_id.
         */
        async findByExpense(expenseId: string): Promise<LlmJobDoc[]> {
            const docs = await db.llm_jobs.find({
                selector: {
                    expense_id: expenseId,
                },
            }).exec();
            return docs.map((doc) => doc.toJSON() as LlmJobDoc);
        },

        /**
         * Finds all LLM Job documents where is_synced is false.
         */
        async findUnsynced(): Promise<LlmJobDoc[]> {
            const docs = await db.llm_jobs.find({
                selector: {
                    is_synced: false,
                },
            }).exec();
            return docs.map((doc) => doc.toJSON() as LlmJobDoc);
        },

        /**
         * Finds all LLM Job documents in RxDB.
         */
        async findAll(): Promise<LlmJobDoc[]> {
            const docs = await db.llm_jobs.find().exec();
            return docs.map((doc) => doc.toJSON() as LlmJobDoc);
        },

        /**
         * Finds a single LLM Job by its idempotency_key.
         * Used during reconciliation to match a local draft against a server-confirmed record.
         */
        async findByIdempotencyKey(key: string): Promise<LlmJobDoc | null> {
            const doc = await db.llm_jobs.findOne({
                selector: { idempotency_key: key },
            }).exec();
            return doc ? (doc.toJSON() as LlmJobDoc) : null;
        },

        /**
         * Deletes stale records from local RxDB that are no longer returned by the server.
         * Only targets is_synced=true records (previously pulled from server).
         * Records with is_synced=false / is_new=true (local drafts queued for sync) are NEVER deleted here.
         */
        async deleteSyncedNotInList(keepIds: string[]): Promise<void> {
            const docs = await db.llm_jobs.find({
                selector: {
                    is_synced: { $eq: true },
                    id: { $nin: keepIds },
                },
            }).exec();
            for (const doc of docs) {
                await doc.remove();
            }
        },
    };
}
