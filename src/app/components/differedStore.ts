

export interface DifferedStore {
    saveAllChangedData(): Promise<void>;
}