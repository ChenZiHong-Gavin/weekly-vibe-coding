export interface MeasurementRecord {
  date: string;
  distance: number;
  timestamp: number;
  imageUrl: string;
}

const STORAGE_KEY = 'hairline_measurements';

export const saveMeasurement = (distance: number, imageUrl: string): MeasurementRecord => {
  const record: MeasurementRecord = {
    date: new Date().toISOString().split('T')[0],
    distance,
    timestamp: Date.now(),
    imageUrl,
  };

  const records = getMeasurements();
  records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  
  return record;
};

export const getMeasurements = (): MeasurementRecord[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const getAverageDistance = (): number => {
  const records = getMeasurements();
  if (records.length === 0) return 0;
  
  const sum = records.reduce((acc, record) => acc + record.distance, 0);
  return sum / records.length;
};

export const clearMeasurements = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
