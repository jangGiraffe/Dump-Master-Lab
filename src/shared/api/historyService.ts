import { HistoryRecord } from '@/shared/model/types';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, limit } from 'firebase/firestore';

const STORAGE_KEY = 'dump_master_lab_history';
const STORAGE_MODE = import.meta.env.VITE_STORAGE_MODE || 'LOCAL';

// Track initial sync per user session to avoid redundant DB reads
const syncedUsers = new Set<string>();

export const historyService = {
    saveRecord: async (record: Omit<HistoryRecord, 'id' | 'timestamp'>, userId?: string): Promise<HistoryRecord> => {
        const timestamp = Date.now();
        const newRecordData = {
            ...record,
            userId: userId || 'anonymous',
            timestamp
        };

        let id = '';

        // 1. Save to Firestore ONLY if in CLOUD mode
        if (STORAGE_MODE === 'CLOUD') {
            try {
                const docRef = await addDoc(collection(db, 'history'), newRecordData);
                id = docRef.id;
            } catch (e) {
                console.error("Error adding document to Firestore: ", e);
                id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
            }
        } else {
            id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
        }

        const newRecord: HistoryRecord = { ...newRecordData, id };

        // 2. Update Local Cache
        const localRecords = historyService.getLocalRecords();
        const updatedRecords = [newRecord, ...localRecords].slice(0, 1000);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));

        return newRecord;
    },

    getRecords: async (userId?: string, forceFetch: boolean = false): Promise<HistoryRecord[]> => {
        // If LOCAL mode, just return local results filtered by user immediately
        if (STORAGE_MODE === 'LOCAL' || !userId) {
            return historyService.getLocalRecords(userId);
        }

        // Return local records if not forcing fetch and session already synced
        if (!forceFetch && syncedUsers.has(userId)) {
            return historyService.getLocalRecords(userId);
        }

        try {
            const q = query(
                collection(db, 'history'),
                where('userId', '==', userId),
                orderBy('timestamp', 'desc'),
                limit(1000)
            );

            const querySnapshot = await getDocs(q);
            const records: HistoryRecord[] = [];
            querySnapshot.forEach((doc) => {
                records.push({ id: doc.id, ...doc.data() } as HistoryRecord);
            });

            // Sync local cache: Merge with existing local records to not lose other users' data
            const allLocalData = localStorage.getItem(STORAGE_KEY);
            let allRecords: HistoryRecord[] = allLocalData ? JSON.parse(allLocalData) : [];

            allRecords = allRecords.filter(r => r.userId !== userId);
            const mergedRecords = [...records, ...allRecords].slice(0, 1000);

            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedRecords));

            // Mark as synced for this session
            syncedUsers.add(userId);

            return records;
        } catch (e: any) {
            console.error("Error fetching documents from Firestore: ", e);
            // If it's a missing index error, Firestore provides a link in the error message
            if (e.message && e.message.includes('index')) {
                console.error("FIREBASE INDEX ERROR: ", e.message);
                // We won't alert here to avoid annoying popups, but the console will have the link.
            }
            return historyService.getLocalRecords(userId);
        }
    },

    getLocalRecords: (userId?: string): HistoryRecord[] => {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        try {
            const allRecords: HistoryRecord[] = JSON.parse(data);
            if (!userId) return allRecords;
            return allRecords.filter(r => r.userId === userId);
        } catch (e) {
            return [];
        }
    },

    clearHistory: () => {
        localStorage.removeItem(STORAGE_KEY);
    },

    deleteRecord: async (id: string) => {
        return historyService.deleteRecords([id]);
    },

    deleteRecords: async (ids: string[]) => {
        if (ids.length === 0) return;
        console.log(`[HistoryService] Attempting to delete ${ids.length} records. (Mode: ${STORAGE_MODE})`);

        // 1. Delete from Firestore if in CLOUD mode
        if (STORAGE_MODE === 'CLOUD') {
            try {
                // Delete in parallel
                await Promise.all(ids.map(async (id) => {
                    const docRef = doc(db, 'history', id);
                    await deleteDoc(docRef);
                }));
                console.log(`[HistoryService] Successfully deleted ${ids.length} records from Firestore.`);
            } catch (e) {
                console.error("[HistoryService] Error deleting from Firestore:", e);
                throw e;
            }
        }

        // 2. Delete from Local Cache
        const allLocalData = localStorage.getItem(STORAGE_KEY);
        if (allLocalData) {
            const allRecords: HistoryRecord[] = JSON.parse(allLocalData);
            const idSet = new Set(ids);
            const filtered = allRecords.filter(r => !idSet.has(r.id));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            console.log(`[HistoryService] Deleted ${ids.length} records from local cache.`);
        }
    },

    syncLocalToCloud: async (userId: string): Promise<number> => {
        if (STORAGE_MODE !== 'CLOUD' || !userId) return 0;

        const allLocalRecords = historyService.getLocalRecords();
        // Only sync records belonging to this user or anonymous ones
        const localRecordsToSync = allLocalRecords.filter(r => r.userId === userId || r.userId === 'anonymous');

        if (localRecordsToSync.length === 0) return 0;

        // Fetch current cloud records for comparison
        const cloudRecords = await historyService.getRecords(userId, true);
        const cloudKeys = new Set(cloudRecords.map(r => `${r.timestamp}_${r.score}`));

        let syncCount = 0;
        const syncedIds: string[] = [];

        for (const local of localRecordsToSync) {
            const key = `${local.timestamp}_${local.score}`;
            if (!cloudKeys.has(key)) {
                try {
                    const { id: _, ...data } = local;
                    await addDoc(collection(db, 'history'), {
                        ...data,
                        userId
                    });
                    syncedIds.push(local.id);
                    syncCount++;
                } catch (e) {
                    console.error("[HistoryService] Failed to sync record:", local.id, e);
                }
            } else {
                // Already in cloud, mark for local removal to cleanup IDs
                syncedIds.push(local.id);
            }
        }

        // Cleanup local copies that are now in cloud (they'll be re-fetched with cloud IDs)
        if (syncedIds.length > 0) {
            const allData = localStorage.getItem(STORAGE_KEY);
            if (allData) {
                const allRecords: HistoryRecord[] = JSON.parse(allData);
                const remaining = allRecords.filter(r => !syncedIds.includes(r.id));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
            }
        }

        return syncCount;
    },

    getStorageMode: () => STORAGE_MODE
};

