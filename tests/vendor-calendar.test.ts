import {expect,it} from 'vitest';
import {lagosDayStart,lagosDateKey,lagosWeekStart} from '../src/lib/vendor-calendar';
it('uses Nigerian midnight across the UTC date boundary',()=>{const at=new Date('2026-11-02T23:30:00Z');expect(lagosDateKey(at)).toBe('2026-11-03');expect(lagosDayStart(at).toISOString()).toBe('2026-11-02T23:00:00.000Z');});
it('starts weeks on Monday in Nigerian time',()=>{expect(lagosWeekStart(new Date('2026-11-08T18:00:00Z')).toISOString()).toBe('2026-11-01T23:00:00.000Z');});
it('moves into the next week at local Monday midnight',()=>{expect(lagosWeekStart(new Date('2026-11-08T23:01:00Z')).toISOString()).toBe('2026-11-08T23:00:00.000Z');});
