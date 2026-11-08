import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { passwordQuestion } from './prompts.mjs';

try { process.loadEnvFile('.env.local'); } catch {}
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
if (!['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname)) throw new Error('Smoke test mutasi hanya boleh dijalankan di localhost.');
const password = process.env.AYYASHOP_TEST_PASSWORD || await passwordQuestion('Password admin untuk smoke test lokal: ');
let cookie = ''; let productId = ''; let orderId = ''; let oldSettings; let savedSettings = false;
let checks = 0;
function pass(text) { checks++; console.log(`PASS ${text}`); }
async function request(path, method = 'GET', body, auth = true, origin = base) {
  const response = await fetch(base+path, { method, redirect:'manual', signal:AbortSignal.timeout(20000), headers: { ...(body === undefined ? {} : {'Content-Type':'application/json'}), ...(method === 'GET' ? {} : {Origin:origin}), ...(auth && cookie ? {Cookie:cookie} : {}) }, body:body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => null); return { response, data };
}
try {
  const anonymous = await request('/api/admin/dashboard', 'GET', undefined, false);
  assert.equal(anonymous.response.status,401); pass('Admin API menolak akses tanpa login');
  const csrf = await request('/api/auth/login','POST',{email:process.env.ADMIN_EMAIL,password},false,'https://example.invalid');
  assert.equal(csrf.response.status,403); pass('Permintaan dari origin lain ditolak');
  const wrong = await request('/api/auth/login','POST',{email:process.env.ADMIN_EMAIL,password:'incorrect-local-test'},false);
  assert.equal(wrong.response.status,401); pass('Password yang salah ditolak');
  const login = await request('/api/auth/login','POST',{email:process.env.ADMIN_EMAIL,password},false);
  assert.equal(login.response.status,200,login.data?.error); const header=login.response.headers.get('set-cookie');
  assert.match(header,/HttpOnly/i); assert.match(header,/SameSite=Strict/i); cookie=header.split(';')[0]; pass('Login berhasil dengan cookie HttpOnly dan SameSite Strict');
  const dashboard = await request('/api/admin/dashboard'); assert.equal(dashboard.data.mode,'demo','Tes hanya boleh mengubah mode demo lokal.');
  oldSettings=dashboard.data.settings;
  const settings={shopName:oldSettings.shopName,tagline:oldSettings.tagline,whatsappNumber:'6281200000000',messageTemplate:'Halo {{nama}},\n{{pesanan}}\nTotal {{total}}\nMohon tunggu konfirmasi admin.',qrisEnabled:false};
  const save=await request('/api/admin/settings','PUT',settings); assert.equal(save.response.status,200); savedSettings=true;
  let catalog=await request('/api/catalog'); const publicText=JSON.stringify(catalog.data);
  assert.equal(catalog.data.settings.qrisEnabled,false); assert.equal(catalog.data.settings.whatsappReady,true);
  assert.ok(!publicText.includes(settings.whatsappNumber)); assert.ok(!publicText.includes('whatsappEncrypted')); assert.ok(!publicText.includes('messageTemplate')); pass('Nomor dan template tidak bocor lewat katalog publik');
  const invalidTemplate=await request('/api/admin/settings','PUT',{...settings,messageTemplate:'Template tanpa daftar barang.'}); assert.equal(invalidTemplate.response.status,400); pass('Template tanpa variabel pesanan ditolak');
  await request('/api/admin/settings','PUT',{...settings,qrisEnabled:true}); catalog=await request('/api/catalog'); assert.equal(catalog.data.settings.qrisEnabled,true); pass('QRIS Coming soon dapat dimatikan dan dinyalakan');
  const draft={name:'QA Produk sementara',category:'tas',description:'Produk sementara untuk pengujian otomatis lokal.',price:123450,originalPrice:150000,stock:3,image:'/images/bag.webp',badge:'QA',active:true,featured:false};
  const create=await request('/api/admin/products','POST',draft); assert.equal(create.response.status,201,create.data?.error); productId=create.data.product.id;
  let fresh=await request('/api/catalog'); assert.ok(fresh.data.products.some(p=>p.id===productId)); pass('Produk baru tersimpan dan tampil di katalog');
  const invalidImage=await request(`/api/admin/products/${productId}`,'PATCH',{...draft,image:'javascript:alert(1)'}); assert.equal(invalidImage.response.status,400); pass('URL gambar yang tidak aman ditolak');
  const checkoutKey=randomUUID(); const input={items:[{productId,quantity:2,price:1}],customer:{name:'Pelanggan Pengujian',phone:'081200000000',address:'Alamat pengujian lokal',note:'Tes, tidak dikirim ke WhatsApp'},paymentMethod:'whatsapp',checkoutKey};
  const negative=await request('/api/checkout','POST',{...input,checkoutKey:randomUUID(),items:[{productId,quantity:-1}]}); assert.equal(negative.response.status,400);
  const qris=await request('/api/checkout','POST',{...input,checkoutKey:randomUUID(),paymentMethod:'qris'}); assert.equal(qris.response.status,400); pass('Jumlah negatif dan pembayaran QRIS yang belum aktif ditolak');
  const checkout=await request('/api/checkout','POST',input); assert.equal(checkout.response.status,201,checkout.data?.error); orderId=checkout.data.orderId; assert.equal(checkout.data.total,246900); pass('Harga pesanan dihitung ulang dari data server');
  const duplicate=await request('/api/checkout','POST',input); assert.equal(duplicate.data.orderId,orderId); pass('Pengiriman ulang tidak membuat pesanan ganda');
  const redirect=await fetch(base+checkout.data.redirectUrl,{redirect:'manual'}); assert.equal(redirect.status,303); const destination=new URL(redirect.headers.get('location')); assert.equal(destination.hostname,'wa.me'); assert.equal(destination.pathname,'/6281200000000'); assert.match(destination.searchParams.get('text'),/Pelanggan Pengujian/); assert.match(destination.searchParams.get('text'),/QA Produk sementara × 2/); assert.ok(!destination.searchParams.get('text').includes('{{')); pass('Redirect WhatsApp memakai nomor admin dan pesan terisi otomatis (tanpa menghubungi WhatsApp)');
  const invalidToken=await request('/api/checkout/whatsapp?token=invalid','GET',undefined,false); assert.equal(invalidToken.response.status,410); pass('Tautan checkout palsu ditolak');
  let status=await request(`/api/admin/orders/${orderId}`,'PATCH',{status:'dikonfirmasi'}); assert.equal(status.response.status,200,status.data?.error); fresh=await request('/api/catalog'); assert.equal(fresh.data.products.find(p=>p.id===productId).stock,1); pass('Konfirmasi pesanan mengurangi stok tepat sekali');
  status=await request(`/api/admin/orders/${orderId}`,'PATCH',{status:'dikonfirmasi'}); assert.equal(status.response.status,200); fresh=await request('/api/catalog'); assert.equal(fresh.data.products.find(p=>p.id===productId).stock,1);
  const overstock=await request('/api/checkout','POST',{...input,checkoutKey:randomUUID()}); assert.equal(overstock.response.status,409); pass('Pesanan yang melebihi stok ditolak');
  await request(`/api/admin/orders/${orderId}`,'PATCH',{status:'dibatalkan'}); fresh=await request('/api/catalog'); assert.equal(fresh.data.products.find(p=>p.id===productId).stock,3); pass('Pembatalan mengembalikan stok');
  status=await request(`/api/admin/orders/${orderId}`,'PATCH',{status:'selesai'}); assert.equal(status.response.status,400); pass('Lompatan status yang tidak sah ditolak');
  const deleteResult=await request(`/api/admin/products/${productId}`,'DELETE'); assert.equal(deleteResult.response.status,200); productId=''; pass('Produk dapat dihapus dari katalog');
  console.log(`\n${checks} pemeriksaan lulus. Pesan WhatsApp tidak dikirim.`);
} finally {
  if(cookie && orderId) await request(`/api/admin/orders/${orderId}`,'PATCH',{status:'dibatalkan'}).catch(()=>{});
  if(cookie && productId) await request(`/api/admin/products/${productId}`,'DELETE').catch(()=>{});
  if(cookie && savedSettings && oldSettings) await request('/api/admin/settings','PUT',{shopName:oldSettings.shopName,tagline:oldSettings.tagline,whatsappNumber:oldSettings.whatsappNumber,messageTemplate:oldSettings.messageTemplate,qrisEnabled:oldSettings.qrisEnabled}).catch(()=>{});
  if(cookie) await request('/api/auth/logout','POST').catch(()=>{});
}
