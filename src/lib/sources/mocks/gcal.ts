import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';

export const gcal = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('gcal', input)),
};
