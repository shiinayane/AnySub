// 站点适配器注册表。新增一个站点 = 建 ./<site>.ts 导出一个 SiteAdapter,再在这里 import 并加进数组。
// 顺序 = 匹配优先级(getSiteAdapter 取第一个 match() 命中的)。
import { dmm } from './dmm.js';
import { prime } from './prime.js';
import { unext } from './unext.js';
import type { SiteAdapter } from '../../types.js';

export const ADAPTERS: SiteAdapter[] = [dmm, prime, unext];
