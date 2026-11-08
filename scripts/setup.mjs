import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes, scryptSync } from 'node:crypto';
import { question, passwordQuestion } from './prompts.mjs';

let existing = '';
try { existing = await readFile('.env.local', 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const get = key => existing.split(/\r?\n/).find(line => line.startsWith(`${key}=`))?.slice(key.length+1) || '';
console.log('\nAyyashop — persiapan akun admin lokal\n');
const defaultEmail = get('ADMIN_EMAIL') || 'ayyasoelaiman20@gmail.com';
const email = (await question(`Email admin [${defaultEmail}]: `)) || defaultEmail;
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email tidak valid.');
const password = await passwordQuestion('Password admin (minimal 10 karakter): ');
if (password.length < 10 || password.length > 256) throw new Error('Password harus berisi 10–256 karakter.');
const salt = randomBytes(16).toString('hex');
const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const uri = get('MONGODB_URI');
const content = [
  '# PRIVAT — jangan unggah ke GitHub. Dibuat oleh npm run setup.',
  `MONGODB_URI=${uri}`, `MONGODB_DB=${get('MONGODB_DB') || 'ayyashop'}`, `ADMIN_EMAIL=${email.toLowerCase()}`,
  `ADMIN_PASSWORD_HASH=${hash}`, `SESSION_SECRET=${randomBytes(48).toString('hex')}`,
  `DATA_ENCRYPTION_KEY=${get('DATA_ENCRYPTION_KEY') || randomBytes(32).toString('hex')}`,
  `AYYASHOP_DEMO_MODE=${uri ? 'false' : 'true'}`, `APP_URL=${get('APP_URL')}`
].join('\n') + '\n';
await writeFile('.env.local', content, { mode: 0o600 });
console.log('\nSelesai. Kredensial tersimpan di .env.local, password berupa hash.');
console.log('Kunci enkripsi lama dipertahankan agar nomor WhatsApp tetap dapat dibaca.');
console.log('Jalankan npm run dev lalu buka http://localhost:3000/admin.');
console.log('Untuk Vercel: masukkan variabel dari .env.local melalui pengaturan Vercel, set AYYASHOP_DEMO_MODE=false, dan tambahkan MONGODB_URI.');
