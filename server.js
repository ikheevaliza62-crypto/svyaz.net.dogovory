const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Папка для файлов
const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);

// Настройка загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => {
    const unique = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// Раздаём фронтенд
app.use(express.static(__dirname));

// ===================== ШАБЛОНЫ =====================

// Получить все шаблоны
app.get('/api/templates', (req, res) => {
  const rows = db.prepare('SELECT * FROM templates ORDER BY id DESC').all();
  res.json(rows);
});

// Добавить шаблон
app.post('/api/templates', upload.single('file'), (req, res) => {
  try {
    const { name, clientType } = req.body;
    if (!name || !clientType || !req.file) {
      return res.status(400).json({ error: 'Нужны название, тип клиента и файл' });
    }

    // Проверка на дубликат
    const exists = db.prepare(
      'SELECT id FROM templates WHERE name = ? AND client_type = ?'
    ).get(name, clientType);
    if (exists) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Такой шаблон уже существует' });
    }

    const result = db.prepare(`
      INSERT INTO templates (name, client_type, file_name, file_path, size)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, clientType, req.file.originalname, req.file.filename, req.file.size);

    res.json({
      id: result.lastInsertRowid,
      name,
      clientType,
      fileName: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Скачать шаблон (для генерации на клиенте)
app.get('/api/templates/:id/file', (req, res) => {
  const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!tpl) return res.status(404).json({ error: 'Шаблон не найден' });

  const filePath = path.join(UPLOADS, tpl.file_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл не найден' });

  res.download(filePath, tpl.file_name);
});

// Удалить шаблон
app.delete('/api/templates/:id', (req, res) => {
  const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!tpl) return res.status(404).json({ error: 'Не найден' });

  const filePath = path.join(UPLOADS, tpl.file_path);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ===================== ДОГОВОРЫ =====================

// Получить все договоры
app.get('/api/contracts', (req, res) => {
  const rows = db.prepare('SELECT * FROM contracts ORDER BY id DESC').all();
  res.json(rows);
});

// Создать договор (после генерации на клиенте)
app.post('/api/contracts', upload.single('file'), (req, res) => {
  try {
    const {
      contractNumber, originalContractDate, originalValidUntil,
      clientType, clientName, inn, director, templateName, fileName
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Файл договора обязателен' });
    }

    const result = db.prepare(`
      INSERT INTO contracts (
        contract_number, original_contract_date, original_valid_until,
        client_type, client_name, inn, director, template_name,
        file_path, file_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      contractNumber || '',
      originalContractDate || '',
      originalValidUntil || '',
      clientType || '',
      clientName || '',
      inn || '',
      director || '',
      templateName || '',
      req.file.filename,
      fileName || req.file.originalname
    );

    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Скачать договор
app.get('/api/contracts/:id/download', (req, res) => {
  const c = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Не найден' });

  const filePath = path.join(UPLOADS, c.file_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл не найден' });

  res.download(filePath, c.file_name || 'договор.docx');
});

// Расторгнуть договор
app.patch('/api/contracts/:id/terminate', (req, res) => {
  const c = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Не найден' });

  db.prepare(`
    UPDATE contracts
    SET status = 'terminated', terminated_at = datetime('now')
    WHERE id = ?
  `).run(req.params.id);

  res.json({ ok: true });
});

// Обновить статусы истёкших договоров
app.post('/api/contracts/normalize', (req, res) => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // В SQLite даты хранятся как дд.мм.гггг — обновляем через JS
  const contracts = db.prepare("SELECT id, original_valid_until, status FROM contracts WHERE status = 'active'").all();
  const update = db.prepare("UPDATE contracts SET status = 'expired' WHERE id = ?");

  let changed = 0;
  for (const c of contracts) {
    if (!c.original_valid_until) continue;
    const m = c.original_valid_until.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) continue;
    const end = new Date(+m[3], +m[2] - 1, +m[1]);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (end < now) {
      update.run(c.id);
      changed++;
    }
  }
  res.json({ changed });
});

// Запуск
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
