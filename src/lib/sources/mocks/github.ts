import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';

export const github = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('github', input)),
};
