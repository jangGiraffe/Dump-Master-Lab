
import { HistoryRecord } from '../types';

const STORAGE_KEY = 'dump_master_lab_history';

export const historyService = {
    saveRecord: (record: Omit<HistoryRecord, 'id' | 'timestamp'>): HistoryRecord => {
        const records = historyService.getRecords();
        const newRecord: HistoryRecord = {
            ...record,
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
            timestamp: Date.now()
        };

        // Limit to last 50 records to prevent bloating
        const updatedRecords = [newRecord, ...records].slice(0, 50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
        return newRecord;
    },

    getRecords: (): HistoryRecord[] => {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse history records', e);
            return [];
        }
    },

    clearHistory: () => {
        localStorage.removeItem(STORAGE_KEY);
    },

    deleteRecord: (id: string) => {
        const records = historyService.getRecords();
        const filtered = records.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
};
