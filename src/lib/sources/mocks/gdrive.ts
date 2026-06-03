import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';

export const gdrive = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('gdrive', input)),
};
