import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Initialize Database
const db = new Database('app.db');

const ADMIN_USERNAMES = ['mininskoe', 'zhekagracia'];

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    has_used_promo BOOLEAN DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    marketplace TEXT,
    description TEXT,
    style_wishes TEXT,
    category TEXT,
    original_images TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS slides (
    id TEXT PRIMARY KEY,
    generation_id TEXT,
    slide_index INTEGER,
    image_url TEXT,
    prompt TEXT
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    amount INTEGER,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Try to add columns if they don't exist
const columns = db.prepare("PRAGMA table_info(generations)").all() as any[];
const columnNames = columns.map(c => c.name);

if (!columnNames.includes('original_images')) {
  try { db.exec('ALTER TABLE generations ADD COLUMN original_images TEXT DEFAULT "[]"'); } catch (e) { console.error('Error adding original_images:', e); }
}
if (!columnNames.includes('style_wishes')) {
  try { db.exec('ALTER TABLE generations ADD COLUMN style_wishes TEXT'); } catch (e) { console.error('Error adding style_wishes:', e); }
}
if (!columnNames.includes('category')) {
  try { db.exec('ALTER TABLE generations ADD COLUMN category TEXT'); } catch (e) { console.error('Error adding category:', e); }
}

const slideColumns = db.prepare("PRAGMA table_info(slides)").all() as any[];
const slideColumnNames = slideColumns.map(c => c.name);
if (!slideColumnNames.includes('prompt')) {
  try { db.exec('ALTER TABLE slides ADD COLUMN prompt TEXT'); } catch (e) { console.error('Error adding prompt to slides:', e); }
}

// Try to add telegram fields to users table
try { db.exec('ALTER TABLE users ADD COLUMN telegram_id TEXT'); } catch (e) {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN first_name TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN last_name TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN username TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN photo_url TEXT'); } catch (e) {}

// Seed examples
function seedExamples() {
  const examples = [
    {
      id: 'example-1',
      marketplace: 'ozon',
      description: 'Беспроводные наушники с шумоподавлением, премиальный дизайн. Отличное качество звука, глубокие басы.',
      original_images: JSON.stringify([
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
      ]),
      slides: [
        { url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80', prompt: 'Главный слайд' },
        { url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80', prompt: 'Характеристики' },
        { url: 'https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?w=800&q=80', prompt: 'Описание' },
        { url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80', prompt: 'Вживую 1' },
        { url: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&q=80', prompt: 'Вживую 2' }
      ]
    },
    {
      id: 'example-2',
      marketplace: 'wildberries',
      description: 'Стильная базовая футболка, минимализм, на модели, студийная съемка. 100% хлопок, дышащая ткань.',
      original_images: JSON.stringify([
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80'
      ]),
      slides: [
        { url: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=800&q=80', prompt: 'Главный слайд' },
        { url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80', prompt: 'Характеристики' },
        { url: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=800&q=80', prompt: 'Описание' },
        { url: 'https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=800&q=80', prompt: 'Вживую 1' },
        { url: 'https://images.unsplash.com/photo-1489987707023-afc232dce9f2?w=800&q=80', prompt: 'Вживую 2' }
      ]
    }
  ];

  const insertGen = db.prepare('INSERT INTO generations (id, user_id, marketplace, description, original_images) VALUES (?, ?, ?, ?, ?)');
  const insertSlide = db.prepare('INSERT INTO slides (id, generation_id, slide_index, image_url, prompt) VALUES (?, ?, ?, ?, ?)');

  for (const ex of examples) {
    const exists = db.prepare('SELECT id FROM generations WHERE id = ?').get(ex.id);
    if (!exists) {
      insertGen.run(ex.id, 'system', ex.marketplace, ex.description, ex.original_images);
      ex.slides.forEach((slide, i) => {
        insertSlide.run(uuidv4(), ex.id, i, slide.url, slide.prompt);
      });
    }
  }
}
seedExamples();

// API Routes

// Get examples
app.get('/api/examples', (req, res) => {
  const examples = db.prepare("SELECT * FROM generations WHERE user_id = 'system'").all() as any[];
  for (const ex of examples) {
    ex.slides = db.prepare('SELECT * FROM slides WHERE generation_id = ? ORDER BY slide_index ASC').all(ex.id);
    try {
      ex.original_images = JSON.parse(ex.original_images || '[]');
    } catch (e) {
      ex.original_images = [];
    }
  }
  res.json(examples);
});

// Seed example from client
app.post('/api/examples/seed', (req, res) => {
  const { id, marketplace, description, originalImages, slides } = req.body;
  
  db.prepare('DELETE FROM generations WHERE id = ?').run(id);
  db.prepare('DELETE FROM slides WHERE generation_id = ?').run(id);
  
  db.prepare('INSERT INTO generations (id, user_id, marketplace, description, original_images) VALUES (?, ?, ?, ?, ?)').run(id, 'system', marketplace, description, JSON.stringify(originalImages));
  
  const insertSlide = db.prepare('INSERT INTO slides (id, generation_id, slide_index, image_url, prompt) VALUES (?, ?, ?, ?, ?)');
  for (let i = 0; i < slides.length; i++) {
    insertSlide.run(uuidv4(), id, i, slides[i].imageUrl, slides[i].prompt);
  }
  
  res.json({ success: true });
});

// Telegram Auth
app.post('/api/auth/telegram', (req, res) => {
  const data = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!botToken) {
    return res.status(500).json({ error: 'Telegram bot token not configured' });
  }

  const { hash, ...userData } = data;

  // Allow dev mock login
  if (hash === 'dev_mock_hash' && req.headers.origin?.includes('ais-dev')) {
    // Skip validation
  } else {
    // Telegram: include only non-empty values, sort keys, build key=value per line
    const checkString = Object.keys(userData)
      .filter(k => userData[k] != null && userData[k] !== '')
      .sort()
      .map(k => `${k}=${userData[k]}`)
      .join('\n');

    const secret = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex');

    if (hmac !== hash) {
      return res.status(401).json({ error: 'Invalid Telegram authentication' });
    }

    // Reject if auth_date is too old (replay protection, Telegram recommends)
    const authDate = Number(userData.auth_date);
    if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > 86400) {
      return res.status(401).json({ error: 'Telegram authentication expired' });
    }
  }

  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(userData.id);
  
  if (!user) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO users (id, telegram_id, first_name, last_name, username, photo_url, balance, has_used_promo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userData.id, userData.first_name, userData.last_name, userData.username, userData.photo_url, 0, 0);
    
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  } else {
    db.prepare(`
      UPDATE users SET first_name = ?, last_name = ?, username = ?, photo_url = ? WHERE id = ?
    `).run(userData.first_name, userData.last_name, userData.username, userData.photo_url, (user as any).id);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get((user as any).id);
  }

  res.json(user);
});

// Get user
app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// Top up balance (Mock YooKassa)
app.post('/api/users/:id/topup', (req, res) => {
  const { id } = req.params;
  const { amount, description } = req.body;
  
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, id);
  db.prepare('INSERT INTO transactions (id, user_id, amount, description) VALUES (?, ?, ?, ?)').run(uuidv4(), id, amount, description);
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json(user);
});

// Deduct balance for generation
app.post('/api/users/:id/deduct', (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, isPromo } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!user || user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(amount, id);
    if (isPromo) {
      db.prepare('UPDATE users SET has_used_promo = 1 WHERE id = ?').run(id);
    }
    
    db.prepare('INSERT INTO transactions (id, user_id, amount, description) VALUES (?, ?, ?, ?)').run(uuidv4(), id, -amount, description);
    
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json(updatedUser);
  } catch (error: any) {
    console.error('Error deducting balance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save generation history
app.post('/api/generations', (req, res) => {
  try {
    const { userId, marketplace, description, styleWishes, category, slides, originalImages } = req.body;
    const generationId = uuidv4();
    
    db.prepare('INSERT INTO generations (id, user_id, marketplace, description, style_wishes, category, original_images) VALUES (?, ?, ?, ?, ?, ?, ?)').run(generationId, userId, marketplace, description, styleWishes, category, JSON.stringify(originalImages || []));
    
    const insertSlide = db.prepare('INSERT INTO slides (id, generation_id, slide_index, image_url, prompt) VALUES (?, ?, ?, ?, ?)');
    
    for (let i = 0; i < slides.length; i++) {
      insertSlide.run(uuidv4(), generationId, i, slides[i].imageUrl, slides[i].prompt);
    }
    
    res.json({ id: generationId });
  } catch (error: any) {
    console.error('Error saving generation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a slide
app.put('/api/generations/:id/slides/:index', (req, res) => {
  const { id, index } = req.params;
  const { imageUrl, prompt } = req.body;
  
  db.prepare('UPDATE slides SET image_url = ?, prompt = ? WHERE generation_id = ? AND slide_index = ?').run(imageUrl, prompt, id, index);
  
  const updatedSlide = db.prepare('SELECT * FROM slides WHERE generation_id = ? AND slide_index = ?').get(id, index);
  res.json(updatedSlide);
});

// Get user history
app.get('/api/users/:id/history', (req, res) => {
  const { id } = req.params;
  const generations = db.prepare('SELECT * FROM generations WHERE user_id = ? ORDER BY created_at DESC').all(id) as any[];
  
  for (const gen of generations) {
    gen.slides = db.prepare('SELECT * FROM slides WHERE generation_id = ? ORDER BY slide_index ASC').all(gen.id);
  }
  
  res.json(generations);
});

// Get single generation
app.get('/api/generations/:id', (req, res) => {
  const { id } = req.params;
  const generation = db.prepare('SELECT * FROM generations WHERE id = ?').get(id) as any;
  
  if (!generation) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  try {
    generation.original_images = JSON.parse(generation.original_images || '[]');
  } catch (e) {
    generation.original_images = [];
  }
  
  generation.slides = db.prepare('SELECT * FROM slides WHERE generation_id = ? ORDER BY slide_index ASC').all(id);
  res.json(generation);
});

// Get user transactions
app.get('/api/users/:id/transactions', (req, res) => {
  const { id } = req.params;
  const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC').all(id);
  res.json(transactions);
});

// --- ADMIN ROUTES ---

app.get('/api/admin/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

app.get('/api/admin/transactions', (req, res) => {
  const txs = db.prepare(`
    SELECT t.*, u.first_name, u.last_name, u.telegram_id, u.username 
    FROM transactions t 
    LEFT JOIN users u ON t.user_id = u.id 
    ORDER BY t.created_at DESC
  `).all();
  res.json(txs);
});

app.post('/api/admin/users/:id/balance', (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, id);
  db.prepare('INSERT INTO transactions (id, user_id, amount, description) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), id, amount, 'Ручное пополнение (Админ)');
    
  res.json({ success: true });
});

app.post('/api/admin/generations/:id/make-example', (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE generations SET user_id = 'system' WHERE id = ?").run(id);
  res.json({ success: true });
});

app.delete('/api/admin/examples/:id', (req, res) => {
  const { id } = req.params;
  // Удаляем без проверки user_id, так как это админский роут и мы доверяем ID
  const result = db.prepare("DELETE FROM generations WHERE id = ?").run(id);
  db.prepare("DELETE FROM slides WHERE generation_id = ?").run(id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Пример не найден или уже удален' });
  }
  
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
