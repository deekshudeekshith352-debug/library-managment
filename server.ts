import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  getBooksWithStatus,
  getLibrarySnapshot,
  getStudentsWithBorrows,
  getTransactions,
  initDatabase,
  issueNewBook,
  markTransactionReturned,
} from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '64kb' }));

  const dataSource = await initDatabase();

  // Combined snapshot endpoint for instant synchronized refresh across all tabs
  app.get('/api/library', async (_req, res) => {
    try {
      const snapshot = await getLibrarySnapshot();
      res.json(snapshot);
    } catch (error) {
      console.error('Error loading library snapshot:', error);
      res.status(500).json({ error: 'Unable to load library records.' });
    }
  });

  app.get('/api/students', async (_req, res) => {
    try {
      const students = await getStudentsWithBorrows();
      res.json({ students, dataSource });
    } catch (error) {
      console.error('Error loading students:', error);
      res.status(500).json({ error: 'Unable to load student borrowing records.' });
    }
  });

  app.get('/api/books', async (_req, res) => {
    try {
      const booksData = await getBooksWithStatus();
      res.json({ ...booksData, dataSource });
    } catch (error) {
      console.error('Error loading books:', error);
      res.status(500).json({ error: 'Unable to load catalog books.' });
    }
  });

  app.get('/api/transactions', async (_req, res) => {
    try {
      const transactions = await getTransactions();
      res.json({ transactions, dataSource });
    } catch (error) {
      console.error('Error loading transactions:', error);
      res.status(500).json({ error: 'Unable to load borrow transactions.' });
    }
  });

  app.post('/api/borrow', async (req, res) => {
    try {
      const rawUsn = typeof req.body?.usn === 'string' ? req.body.usn.trim() : '';
      const rawBookId = Number(req.body?.book_id);
      const rawDate =
        typeof req.body?.borrow_date === 'string' && req.body.borrow_date.trim()
          ? req.body.borrow_date.trim()
          : new Date().toISOString().slice(0, 10);

      if (!rawUsn || rawUsn.length > 50) {
        res.status(400).json({ error: 'Please select a valid Student USN.' });
        return;
      }

      if (!Number.isInteger(rawBookId) || rawBookId <= 0) {
        res.status(400).json({ error: 'Please select a valid Book ID.' });
        return;
      }

      if (!isValidIsoDate(rawDate)) {
        res.status(400).json({ error: 'Borrow date must be a valid YYYY-MM-DD date.' });
        return;
      }

      const outcome = await issueNewBook(rawUsn, rawBookId, rawDate);
      if (outcome.ok === false) {
        res.status(outcome.status).json({ error: outcome.message });
        return;
      }

      const snapshot = await getLibrarySnapshot();
      res.status(201).json({ transaction_id: outcome.transaction_id, snapshot });
    } catch (error) {
      console.error('Error issuing book:', error);
      res.status(500).json({ error: 'Unable to issue book right now.' });
    }
  });

  app.patch('/api/transactions/:id/return', async (req, res) => {
    try {
      const transactionId = Number(req.params.id);
      if (!Number.isInteger(transactionId) || transactionId <= 0) {
        res.status(400).json({ error: 'Invalid transaction ID.' });
        return;
      }

      const outcome = await markTransactionReturned(transactionId);
      if (outcome.ok === false) {
        res.status(outcome.status).json({ error: outcome.message });
        return;
      }

      const snapshot = await getLibrarySnapshot();
      res.json({ updated: true, snapshot });
    } catch (error) {
      console.error('Error returning book:', error);
      res.status(500).json({ error: 'Unable to update return status right now.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Student Library Management System listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
