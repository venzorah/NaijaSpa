import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({user:{id:'owner',vendorId:'vendor'},ticket:vi.fn(),updateTicket:vi.fn(),image:vi.fn(),updateVendor:vi.fn(),notifications:vi.fn(),invalidate:vi.fn()}));
vi.mock('../src/lib/vendor-auth',()=>({requireVendor:async()=>mocks.user}));
vi.mock('../src/lib/http',()=>({rateLimit:vi.fn(),jsonError:(e:Error&{status?:number})=>Response.json({error:e.message},{status:e.status??400})}));
vi.mock('next/cache',()=>({revalidateTag:mocks.invalidate}));
vi.mock('../src/lib/db',()=>({prisma:{$transaction:async(fn:(tx:unknown)=>unknown)=>fn({supportTicket:{findFirst:mocks.ticket,update:mocks.updateTicket}}),therapistGalleryImage:{findFirst:mocks.image},vendor:{update:mocks.updateVendor},notification:{updateMany:mocks.notifications}}}));
import {replyToVendorTicket,vendorTicketSelect} from '../src/lib/vendor-support';
import {PATCH as updateProfile} from '../src/app/api/vendor/profile/route';
import {PATCH as markRead} from '../src/app/api/vendor/notifications/route';
beforeEach(()=>vi.clearAllMocks());
describe('vendor ticket privacy and ownership',()=>{
 it('always excludes internal notes and internal messages',()=>{expect(vendorTicketSelect).not.toHaveProperty('internalNotes');expect(vendorTicketSelect.messages.where).toEqual({internal:false});});
 it('cannot reply to another account’s ticket',async()=>{mocks.ticket.mockResolvedValue(null);await expect(replyToVendorTicket('other','owner','Reply')).rejects.toMatchObject({status:404});expect(mocks.ticket).toHaveBeenCalledWith(expect.objectContaining({where:{id:'other',authorId:'owner'}}));expect(mocks.updateTicket).not.toHaveBeenCalled();});
 it('cannot reply to a resolved ticket',async()=>{mocks.ticket.mockResolvedValue({id:'ticket',status:'resolved'});await expect(replyToVendorTicket('ticket','owner','Reply')).rejects.toMatchObject({status:409});expect(mocks.updateTicket).not.toHaveBeenCalled();});
 it('stores an owner reply as public without changing ownership',async()=>{mocks.ticket.mockResolvedValue({id:'ticket',status:'pending'});await replyToVendorTicket('ticket','owner','New reply');expect(mocks.updateTicket).toHaveBeenCalledWith({where:{id:'ticket'},data:{status:'open',messages:{create:{authorId:'owner',body:'New reply',internal:false}}},select:vendorTicketSelect});});
});
describe('vendor profile media',()=>{
 const req=(body:unknown)=>new Request('http://localhost/api/vendor/profile',{method:'PATCH',body:JSON.stringify(body)});
 it('rejects images outside the authenticated business',async()=>{mocks.image.mockResolvedValue(null);expect((await updateProfile(req({imageId:'foreign',target:'cover'}))).status).toBe(404);expect(mocks.image).toHaveBeenCalledWith({where:{id:'foreign',gallery:{vendorId:'vendor'}},select:{url:true}});expect(mocks.updateVendor).not.toHaveBeenCalled();});
 it('changes only the selected owned cover field',async()=>{mocks.image.mockResolvedValue({url:'/api/media/galleries/vendor/owned.png'});expect((await updateProfile(req({imageId:'owned',target:'cover',vendorId:'other'}))).status).toBe(200);expect(mocks.updateVendor).toHaveBeenCalledWith({where:{id:'vendor'},data:{coverUrl:'/api/media/galleries/vendor/owned.png'}});expect(mocks.invalidate).toHaveBeenCalledWith('home-catalog');});
});
it('marking notifications read always scopes the update to the authenticated account',async()=>{await markRead(new Request('http://localhost/api/vendor/notifications',{method:'PATCH',body:JSON.stringify({id:'other-notification',userId:'other-user'})}));expect(mocks.notifications).toHaveBeenCalledWith({where:{userId:'owner',readAt:null,id:'other-notification'},data:{readAt:expect.any(Date)}});});
