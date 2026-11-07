import {beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({put:vi.fn()}));
vi.mock('../src/lib/object-storage',()=>({uploadStorage:()=>"r2",putMediaObject:mock.put}));
vi.mock('../src/lib/db',()=>({prisma:{}}));
import {saveServiceImage} from '../src/lib/service-images';
beforeEach(()=>{vi.clearAllMocks();mock.put.mockResolvedValue(undefined);});
it('uses actual image signatures instead of the supplied filename or MIME type',async()=>{await expect(saveServiceImage('vendor',new Blob(['<svg onload="alert(1)"></svg>'],{type:'image/png'}))).rejects.toMatchObject({status:400});expect(mock.put).not.toHaveBeenCalled();});
it('rejects oversize images before reading or uploading them',async()=>{const file=new Blob([new Uint8Array(2097153)]);const read=vi.spyOn(file,'arrayBuffer');await expect(saveServiceImage('vendor',file)).rejects.toMatchObject({status:400});expect(read).not.toHaveBeenCalled();expect(mock.put).not.toHaveBeenCalled();});
it('uploads a validated PNG to its own immutable R2 object',async()=>{const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64');const url=await saveServiceImage('vendor',new Blob([bytes]));expect(url).toMatch(/^\/api\/media\/galleries\/vendor\/service-[\w-]+\.png$/);expect(mock.put).toHaveBeenCalledWith(expect.stringMatching(/^galleries\/vendor\/service-/),expect.any(Uint8Array),'image/png');});
