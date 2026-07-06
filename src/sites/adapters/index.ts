// Site adapter registry. Adding a site = create ./<site>.ts exporting a SiteAdapter, then import it here and add it to the array.
// Order = match priority (getSiteAdapter takes the first one whose match() hits).
import { dmm } from './dmm.js';
import { prime } from './prime.js';
import { unext } from './unext.js';
import type { SiteAdapter } from '../../types.js';

export const ADAPTERS: SiteAdapter[] = [dmm, prime, unext];
