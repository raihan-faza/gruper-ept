import { ScriptseaDatabase } from '../index';
import { WalletDoc } from '../schema';

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

export type CreateWalletData = Omit<WalletDoc, 'id' | 'created_at' | 'updated_at' | 'is_synced' | 'idempotency_key' | 'is_new'> & { is_new?: boolean };
export type UpdateWalletData = Partial<Omit<WalletDoc, 'id' | 'created_at' | 'updated_at' | 'is_synced' | 'idempotency_key'>>;
export type ServerWalletData = Omit<WalletDoc, 'is_synced' | 'is_new'> & { is_new?: boolean };

export function createWalletRepository(db: ScriptseaDatabase) {
    return {
        /**
         * Inserts a new wallet with auto-generated id, idempotency_key, is_synced: false,
         * and ISO timestamps for created_at and updated_at.
         */
        async create(data: CreateWalletData): Promise<WalletDoc> {
            const now = new Date().toISOString();
            const wallet: WalletDoc = {
                ...data,
                id: generateUUID(),
                idempotency_key: generateUUID(),
                is_synced: false,
                is_new: data.is_new ?? true,
                created_at: now,
                updated_at: now,
            };
            const doc = await db.wallets.insert(wallet);
            return doc.toJSON() as WalletDoc;
        },

        /**
         * Patches an existing wallet with new data, setting is_synced: false
         * and updated_at to the current time.
         */
        async update(id: string, data: UpdateWalletData): Promise<WalletDoc> {
            const doc = await db.wallets.findOne(id).exec();
            if (!doc) {
                throw new Error(`Wallet with id ${id} not found`);
            }
            const updated = await doc.incrementalPatch({
                ...data,
                is_synced: false,
                updated_at: new Date().toISOString(),
            });
            return updated.toJSON() as WalletDoc;
        },

        /**
         * Patches is_synced: true on a single wallet document.
         */
        async markSynced(id: string): Promise<WalletDoc> {
            const doc = await db.wallets.findOne(id).exec();
            if (!doc) {
                throw new Error(`Wallet with id ${id} not found`);
            }
            const updated = await doc.incrementalPatch({
                is_synced: true,
            });
            return updated.toJSON() as WalletDoc;
        },

        /**
         * Upserts the full server response with is_synced: true,
         * preserving server timestamps exactly as-is.
         */
        async upsertFromServer(data: ServerWalletData): Promise<WalletDoc> {
            const doc = await db.wallets.upsert({
                ...data,
                is_synced: true,
                is_new: data.is_new ?? false,
            });
            return doc.toJSON() as WalletDoc;
        },

        /**
         * Finds all wallets by owner_id.
         */
        async findByOwner(ownerId: string): Promise<WalletDoc[]> {
            const docs = await db.wallets.find({
                selector: {
                    owner_id: ownerId,
                },
            }).exec();
            return docs.map((doc) => doc.toJSON() as WalletDoc);
        },

        /**
         * Finds all wallet documents where is_synced is false.
         */
        async findUnsynced(): Promise<WalletDoc[]> {
            const docs = await db.wallets.find({
                selector: {
                    is_synced: false,
                },
            }).exec();
            return docs.map((doc) => doc.toJSON() as WalletDoc);
        },

        /**
         * Finds a single wallet by ID.
         */
        async findById(id: string): Promise<WalletDoc | null> {
            const doc = await db.wallets.findOne(id).exec();
            return doc ? (doc.toJSON() as WalletDoc) : null;
        },

        /**
         * Finds all wallet documents in RxDB.
         */
        async findAll(): Promise<WalletDoc[]> {
            const docs = await db.wallets.find().exec();
            return docs.map((doc) => doc.toJSON() as WalletDoc);
        },

        /**
         * Finds a single wallet by its idempotency_key.
         * Used during reconciliation to match a local draft against a server-confirmed record.
         */
        async findByIdempotencyKey(key: string): Promise<WalletDoc | null> {
            const doc = await db.wallets.findOne({
                selector: { idempotency_key: key },
            }).exec();
            return doc ? (doc.toJSON() as WalletDoc) : null;
        },

        /**
         * Deletes stale records from local RxDB that are no longer returned by the server.
         * Only targets is_synced=true records (previously pulled from server).
         * Records with is_synced=false / is_new=true (local drafts) are NEVER deleted here.
         */
        async deleteSyncedNotInList(keepIds: string[]): Promise<void> {
            const docs = await db.wallets.find({
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
