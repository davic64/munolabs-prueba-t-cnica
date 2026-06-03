import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';

export const obsidian = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('obsidian', input)),
};
