import { ScriptseaDatabase } from '../index';
import { WalletMemberDoc } from '../schema';

export type UpsertWalletMemberData = Omit<WalletMemberDoc, 'id'>;

export function createWalletMemberRepository(db: ScriptseaDatabase) {
    return {
        /**
         * Upserts a wallet member using a composite key of wallet_id + "_" + user_id.
         */
        async upsert(data: UpsertWalletMemberData): Promise<WalletMemberDoc> {
            const doc = await db.wallet_members.upsert({
                ...data,
                id: `${data.wallet_id}_${data.user_id}`,
            });
            return doc.toJSON() as WalletMemberDoc;
        },

        /**
         * Finds all members for a given wallet_id.
         */
        async findByWallet(walletId: string): Promise<WalletMemberDoc[]> {
            const docs = await db.wallet_members.find({
                selector: { wallet_id: walletId },
            }).exec();
            return docs.map((doc) => doc.toJSON() as WalletMemberDoc);
        },

        /**
         * Finds a single member by wallet_id and user_id.
         */
        async findByWalletAndUser(walletId: string, userId: string): Promise<WalletMemberDoc | null> {
            const id = `${walletId}_${userId}`;
            const doc = await db.wallet_members.findOne(id).exec();
            return doc ? (doc.toJSON() as WalletMemberDoc) : null;
        },

        /**
         * Deletes stale wallet members for a wallet that are not in the provided user ID list.
         * Used during reconciliation to clean up removed members.
         */
        async deleteNotInList(walletId: string, keepUserIds: string[]): Promise<void> {
            const keepIds = keepUserIds.map((uid) => `${walletId}_${uid}`);
            const docs = await db.wallet_members.find({
                selector: {
                    wallet_id: { $eq: walletId },
                    id: { $nin: keepIds },
                },
            }).exec();
            for (const doc of docs) {
                await doc.remove();
            }
        },
    };
}
