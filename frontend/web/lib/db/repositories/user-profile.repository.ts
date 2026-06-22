import { ScriptseaDatabase } from '../index';
import { UserProfileDoc } from '../schema';

export type UpdateUserProfileData = Partial<Omit<UserProfileDoc, 'id' | 'created_at' | 'updated_at' | 'is_synced'>>;
export type ServerUserProfileData = Omit<UserProfileDoc, 'is_synced'>;

export function createUserProfileRepository(db: ScriptseaDatabase) {
    return {
        /**
         * Patches an existing user profile with new data, setting is_synced: false
         * and updated_at to the current time.
         */
        async update(id: string, data: UpdateUserProfileData): Promise<UserProfileDoc> {
            const doc = await db.user_profile.findOne(id).exec();
            if (!doc) {
                throw new Error(`UserProfile with id ${id} not found`);
            }
            const updated = await doc.incrementalPatch({
                ...data,
                is_synced: false,
                updated_at: new Date().toISOString(),
            });
            return updated.toJSON() as UserProfileDoc;
        },

        /**
         * Patches is_synced: true on a single user profile document.
         */
        async markSynced(id: string): Promise<UserProfileDoc> {
            const doc = await db.user_profile.findOne(id).exec();
            if (!doc) {
                throw new Error(`UserProfile with id ${id} not found`);
            }
            const updated = await doc.incrementalPatch({
                is_synced: true,
            });
            return updated.toJSON() as UserProfileDoc;
        },

        /**
         * Upserts the full server response with is_synced: true,
         * preserving server timestamps exactly as-is.
         */
        async upsertFromServer(data: any): Promise<UserProfileDoc> {
            const mappedData: Omit<UserProfileDoc, 'is_synced'> = {
                id: data.id,
                username: data.username || data.name || "",
                first_name: data.first_name || data.firstName || "",
                last_name: data.last_name || data.lastName || "",
                phone_number: data.phone_number || data.phoneNumber || "",
                created_at: data.created_at || new Date().toISOString(),
                updated_at: data.updated_at || new Date().toISOString(),
            };

            const doc = await db.user_profile.upsert({
                ...mappedData,
                is_synced: true,
            });
            return doc.toJSON() as UserProfileDoc;
        },

        /**
         * Finds a single user profile by id.
         */
        async findById(id: string): Promise<UserProfileDoc | null> {
            const doc = await db.user_profile.findOne(id).exec();
            return doc ? (doc.toJSON() as UserProfileDoc) : null;
        },

        /**
         * Finds all user profile documents where is_synced is false.
         */
        async findUnsynced(): Promise<UserProfileDoc[]> {
            const docs = await db.user_profile.find({
                selector: {
                    is_synced: false,
                },
            }).exec();
            return docs.map((doc) => doc.toJSON() as UserProfileDoc);
        },
    };
}
