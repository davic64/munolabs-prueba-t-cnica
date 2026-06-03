import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';

export const posthog = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('posthog', input)),
};
