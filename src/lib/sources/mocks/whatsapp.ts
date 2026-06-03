import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';

export const whatsapp = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('whatsapp', input)),
};
