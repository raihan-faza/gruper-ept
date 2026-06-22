import { ScriptseaDatabase } from './index';
import { createExpenseRepository } from './repositories/expense.repository';
import { createWalletRepository } from './repositories/wallet.repository';
import { createUserProfileRepository } from './repositories/user-profile.repository';
import { createLlmJobRepository } from './repositories/llm-job.repository';
import { syncExpense, syncWallet, syncUserProfile, syncLlmJob } from '@/lib/actions/sync';

export function createSyncManager(db: ScriptseaDatabase) {
    const expenseRepo = createExpenseRepository(db);
    const walletRepo = createWalletRepository(db);
    const userProfileRepo = createUserProfileRepository(db);
    const llmJobRepo = createLlmJobRepository(db);

    async function syncAll(): Promise<void> {
        // 1. Sync expenses
        const unsyncedExpenses = await expenseRepo.findUnsynced();
        for (const exp of unsyncedExpenses) {
            try {
                const serverData = await syncExpense(exp);
                if (serverData) {
                    await expenseRepo.upsertFromServer(serverData);
                }
            } catch (error) {
                console.error(`Failed to sync expense ${exp.id}:`, error);
            }
        }

        // 2. Sync wallets
        const unsyncedWallets = await walletRepo.findUnsynced();
        for (const wallet of unsyncedWallets) {
            try {
                const serverData = await syncWallet(wallet);
                if (serverData) {
                    await walletRepo.upsertFromServer(serverData);
                }
            } catch (error) {
                console.error(`Failed to sync wallet ${wallet.id}:`, error);
            }
        }

        // 3. Sync user profiles
        const unsyncedProfiles = await userProfileRepo.findUnsynced();
        for (const profile of unsyncedProfiles) {
            try {
                const serverData = await syncUserProfile(profile);
                if (serverData) {
                    await userProfileRepo.upsertFromServer(serverData);
                }
            } catch (error) {
                console.error(`Failed to sync user profile ${profile.id}:`, error);
            }
        }

        // 4. Sync LLM jobs
        const unsyncedJobs = await llmJobRepo.findUnsynced();
        for (const job of unsyncedJobs) {
            try {
                const serverData = await syncLlmJob(job);
                if (serverData) {
                    await llmJobRepo.upsertFromServer(serverData);
                }
            } catch (error) {
                console.error(`Failed to sync LLM job ${job.id}:`, error);
            }
        }
    }

    return {
        syncAll,

        /**
         * Listens to the window.online event and calls syncAll() when the browser comes online.
         * Returns a cleanup function to remove the event listener.
         */
        startAutoSync(): () => void {
            if (typeof window === 'undefined') {
                return () => {};
            }

            const handleOnline = () => {
                syncAll().catch(err => {
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
