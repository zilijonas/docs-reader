import {
  stripLithuanianSuffix,
  type LithuanianNameDataset,
} from '../../lib/detection/lt-morphology';

let cache: LithuanianNameDataset | null = null;
let loadPromise: Promise<LithuanianNameDataset> | null = null;

const DATASET_PATH = 'detection/lithuanian-names.json';

const normalize = (raw: string) => raw.trim().normalize('NFC').toLowerCase();

const buildDataset = (entries: unknown): LithuanianNameDataset => {
  const firstNames = new Set<string>();
  const firstNameStems = new Set<string>();
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      if (typeof entry !== 'string') continue;
      const cleaned = normalize(entry);
      if (cleaned.length < 2) continue;
      firstNames.add(cleaned);
      for (const stem of stripLithuanianSuffix(cleaned)) {
        if (stem.length >= 4 && stem !== cleaned) firstNameStems.add(stem);
      }
    }
  }
  return { firstNames, firstNameStems };
};

export const loadLithuanianNames = async (baseUrl: string): Promise<LithuanianNameDataset> => {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  const url = `${baseUrl}${DATASET_PATH}`;
  loadPromise = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return { firstNames: new Set<string>() };
      }
      const json = (await response.json()) as unknown;
      return buildDataset(json);
    } catch {
      return { firstNames: new Set<string>() };
    }
  })()
    .then((dataset) => {
      cache = dataset;
      return dataset;
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
};
