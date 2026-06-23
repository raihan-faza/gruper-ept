import { ScriptseaDatabase } from '../index';
import { PendingDeletionDoc } from '../schema';

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

export function createPendingDeletionRepository(db: ScriptseaDatabase) {
    return {
        /**
         * Queues an entity for deletion once the device comes back online.
         */
        async queue(entityId: string, walletId: string, userId: string): Promise<PendingDeletionDoc> {
            const doc = await db.pending_deletions.insert({
                id: generateUUID(),
                entity_type: 'expense',
                entity_id: entityId,
                wallet_id: walletId,
                created_at: new Date().toISOString(),
                user_id: userId,
            });
            return doc.toJSON() as PendingDeletionDoc;
        },

        /**
         * Finds all pending deletions.
         * harus difilter pake user_id biar kalau multiple user dia datanya gak nyampur
         */
        async findAll(user_id: string): Promise<PendingDeletionDoc[]> {
            const docs = await db.pending_deletions.find().where('user_id').equals(user_id).exec();
            return docs.map((doc) => doc.toJSON() as PendingDeletionDoc);
        },

        /**
         * Removes a single pending deletion record after it has been successfully synced.
         */
        async remove(id: string): Promise<void> {
            const doc = await db.pending_deletions.findOne(id).exec();
            if (doc) {
                await doc.remove();
            }
        },
    };
}
