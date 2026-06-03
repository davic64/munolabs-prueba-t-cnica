import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';

export const granola = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('granola', input)),
};
