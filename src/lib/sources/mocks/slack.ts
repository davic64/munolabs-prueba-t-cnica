import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';

export const slack = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('slack', input)),
};
