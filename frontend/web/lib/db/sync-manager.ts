import { ScriptseaDatabase } from './index';
import { createExpenseRepository } from './repositories/expense.repository';
import { createWalletRepository } from './repositories/wallet.repository';
import { createUserProfileRepository } from './repositories/user-profile.repository';
import { createLlmJobRepository } from './repositories/llm-job.repository';
import { createPendingDeletionRepository } from './repositories/pending-deletion.repository';
import { syncExpense, syncWallet, syncUserProfile, syncLlmJob, syncDeleteExpense } from '@/lib/actions/sync';

export function createSyncManager(db: ScriptseaDatabase) {
    const expenseRepo = createExpenseRepository(db);
    const walletRepo = createWalletRepository(db);
    const userProfileRepo = createUserProfileRepository(db);
    const llmJobRepo = createLlmJobRepository(db);
    const pendingDeletionRepo = createPendingDeletionRepository(db);

    async function syncAll(userId: string): Promise<void> {
        // 1. Sync expenses
        const unsyncedExpenses = await expenseRepo.findUnsynced(userId);
        for (const exp of unsyncedExpenses) {
            try {
                const serverDataRaw = await syncExpense(exp);
                const serverData = serverDataRaw?.data ?? serverDataRaw;
                if (serverData && serverData.id) {
                    if (exp.id !== serverData.id) {
                        const localDoc = await db.expenses.findOne(exp.id).exec();
                        if (localDoc) {
                            await localDoc.remove();
                        }
                    }
                    await expenseRepo.upsertFromServer({
                        id: serverData.id,
                        user_id: serverData.user_id ?? exp.user_id,
                        wallet_id: serverData.wallet_id ?? exp.wallet_id,
                        category_id: serverData.category_id ?? exp.category_id,
                        expense_name: serverData.expense_name ?? exp.expense_name,
                        expense_details: serverData.expense_details ?? exp.expense_details,
                        expense_items: serverData.expense_items ?? exp.expense_items,
                        amount: serverData.amount ?? exp.amount,
                        status: serverData.status ?? 'completed',
                        date: serverData.date ?? exp.date,
                        idempotency_key: serverData.idempotency_key ?? exp.idempotency_key,
                        created_at: serverData.created_at ?? exp.created_at,
                        updated_at: serverData.updated_at ?? exp.updated_at,
                    });
                }
            } catch (error) {
                console.error(`Failed to sync expense ${exp.id}:`, error);
            }
        }

        // 2. Sync wallets
        const unsyncedWallets = await walletRepo.findUnsynced(userId);
        for (const wallet of unsyncedWallets) {
            try {
                const serverDataRaw = await syncWallet(wallet);
                const serverData = serverDataRaw?.data ?? serverDataRaw;
                if (serverData && serverData.id) {
                    if (wallet.id !== serverData.id) {
                        const localDoc = await db.wallets.findOne(wallet.id).exec();
                        if (localDoc) {
                            await localDoc.remove();
                        }
                    }
                    await walletRepo.upsertFromServer({
                        id: serverData.id,
                        name: serverData.name ?? wallet.name,
                        currency: serverData.currency ?? wallet.currency,
                        total_balance: serverData.total_balance ?? wallet.total_balance,
                        available_balance: serverData.available_balance ?? wallet.available_balance,
                        member_count: serverData.member_count ?? wallet.member_count,
                        owner_id: serverData.owner_id ?? wallet.owner_id,
                        idempotency_key: serverData.idempotency_key ?? wallet.idempotency_key,
                        created_at: serverData.created_at ?? wallet.created_at,
                        updated_at: serverData.updated_at ?? wallet.updated_at,
                    });
                }
            } catch (error) {
                console.error(`Failed to sync wallet ${wallet.id}:`, error);
            }
        }

        // 3. Sync user profiles
        const unsyncedProfiles = await userProfileRepo.findUnsynced(userId);
        for (const profile of unsyncedProfiles) {
            try {
                const serverDataRaw = await syncUserProfile(profile);
                const serverData = serverDataRaw?.data ?? serverDataRaw;
                if (serverData) {
                    await userProfileRepo.upsertFromServer(serverData);
                }
            } catch (error) {
                console.error(`Failed to sync user profile ${profile.id}:`, error);
            }
        }

        // 4. Sync LLM jobs
        const unsyncedJobs = await llmJobRepo.findUnsynced(userId);
        for (const job of unsyncedJobs) {
            try {
                const serverDataRaw = await syncLlmJob(job);
                const serverData = serverDataRaw?.data ?? serverDataRaw;
                if (serverData && serverData.id) {
                    if (job.id !== serverData.id) {
                        const localDoc = await db.llm_jobs.findOne(job.id).exec();
                        if (localDoc) {
                            await localDoc.remove();
                        }
                    }
                    await llmJobRepo.upsertFromServer({
                        id: serverData.id,
                        user_id: serverData.user_id ?? job.user_id,
                        wallet_id: serverData.wallet_id ?? job.wallet_id,
                        user_input: serverData.user_input ?? job.user_input,
                        status: serverData.status ?? job.status,
                        retry_count: serverData.retry_count ?? job.retry_count,
                        expense_id: serverData.expense_id ?? job.expense_id,
                        error_message: serverData.error_message ?? job.error_message,
                        llm_result: serverData.llm_result ?? job.llm_result,
                        llm_status: serverData.llm_status ?? job.llm_status,
                        expense_status: serverData.expense_status ?? job.expense_status,
                        idempotency_key: serverData.idempotency_key ?? job.idempotency_key,
                        created_at: serverData.created_at ?? job.created_at,
                        updated_at: serverData.updated_at ?? job.updated_at,
                    });
                }
            } catch (error) {
                console.error(`Failed to sync LLM job ${job.id}:`, error);
            }
        }

        // 5. Process pending deletions queued while offline
        const pendingDeletions = await pendingDeletionRepo.findAll(userId);
        for (const deletion of pendingDeletions) {
            try {
                await syncDeleteExpense(deletion.entity_id, deletion.wallet_id);
                await pendingDeletionRepo.remove(deletion.id);
            } catch (error) {
                console.error(`Failed to sync pending deletion for expense ${deletion.entity_id}:`, error);
            }
        }
    }

    return {
        syncAll,

        /**
         * Listens to the window.online event and calls syncAll() when the browser comes online.
         * Returns a cleanup function to remove the event listener.
         */
        startAutoSync(userId: string): () => void {
            if (typeof window === 'undefined') {
                return () => { };
            }

            const handleOnline = () => {
                syncAll(userId).catch(err => {
                    console.error('Auto-sync execution failed:', err);
                });
            };

            window.addEventListener('online', handleOnline);

            return () => {
                window.removeEventListener('online', handleOnline);
            };
        }
    };
}
