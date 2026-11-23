import { Pool } from 'pg';
import type {
  BookWithStatus,
  BooksSummary,
  BorrowTransaction,
  LibrarySnapshot,
  ReturnStatus,
  StudentBorrowEntry,
  StudentWithBorrows,
} from '../src/types.ts';

interface MockStudent {
  usn: string;
  name: string;
  department: string;
}

interface MockBook {
  book_id: number;
  book_name: string;
  author: string;
}

interface MockBorrowRecord {
  transaction_id: number;
  usn: string;
  book_id: number;
  borrow_date: string;
  return_status: ReturnStatus;
}

const INITIAL_STUDENTS: MockStudent[] = [
  { usn: '1MS22CS014', name: 'Aarav Sharma', department: 'Computer Science' },
  { usn: '1MS22CS029', name: 'Diya Nair', department: 'Computer Science' },
  { usn: '1MS22IS008', name: 'Rohan Kulkarni', department: 'Information Science' },
  { usn: '1MS22IS041', name: 'Meera Iyer', department: 'Information Science' },
  { usn: '1MS22EC017', name: 'Karthik Reddy', department: 'Electronics & Comm.' },
  { usn: '1MS22EC053', name: 'Ananya Verma', department: 'Electronics & Comm.' },
  { usn: '1MS22ME011', name: 'Vikramaditya Rao', department: 'Mechanical Eng.' },
  { usn: '1MS22CS072', name: 'Sneha Patel', department: 'Computer Science' },
  { usn: '1MS22CV019', name: 'Siddharth Menon', department: 'Civil Eng.' },
  { usn: '1MS22AI005', name: 'Nandini Joshi', department: 'AI & Machine Learning' },
];

const INITIAL_BOOKS: MockBook[] = [
  { book_id: 1, book_name: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann' },
  { book_id: 2, book_name: 'Introduction to Algorithms', author: 'Thomas H. Cormen' },
  { book_id: 3, book_name: 'Database System Concepts', author: 'Abraham Silberschatz' },
  { book_id: 4, book_name: 'Operating System Concepts', author: 'Peter Baer Galvin' },
  { book_id: 5, book_name: 'Computer Networking: A Top-Down Approach', author: 'James F. Kurose' },
  { book_id: 6, book_name: 'Clean Code', author: 'Robert C. Martin' },
  { book_id: 7, book_name: 'Structure and Interpretation of Computer Programs', author: 'Harold Abelson' },
  { book_id: 8, book_name: 'The Pragmatic Programmer', author: 'David Thomas & Andrew Hunt' },
  { book_id: 9, book_name: 'Artificial Intelligence: A Modern Approach', author: 'Stuart Russell' },
  { book_id: 10, book_name: 'Digital Logic and Computer Design', author: 'M. Morris Mano' },
  { book_id: 11, book_name: 'Linear Algebra and Its Applications', author: 'Gilbert Strang' },
  { book_id: 12, book_name: 'Compilers: Principles, Techniques, and Tools', author: 'Alfred V. Aho' },
];

const INITIAL_RECORDS: MockBorrowRecord[] = [
  { transaction_id: 1, usn: '1MS22CS014', book_id: 1, borrow_date: '2026-11-04', return_status: 'Borrowed' },
  { transaction_id: 2, usn: '1MS22CS014', book_id: 6, borrow_date: '2026-10-18', return_status: 'Returned' },
  { transaction_id: 3, usn: '1MS22CS029', book_id: 2, borrow_date: '2026-11-09', return_status: 'Borrowed' },
  { transaction_id: 4, usn: '1MS22IS008', book_id: 3, borrow_date: '2026-11-12', return_status: 'Borrowed' },
  { transaction_id: 5, usn: '1MS22EC017', book_id: 10, borrow_date: '2026-10-25', return_status: 'Returned' },
  { transaction_id: 6, usn: '1MS22CS072', book_id: 5, borrow_date: '2026-11-15', return_status: 'Borrowed' },
  { transaction_id: 7, usn: '1MS22AI005', book_id: 9, borrow_date: '2026-11-17', return_status: 'Borrowed' },
  { transaction_id: 8, usn: '1MS22AI005', book_id: 11, borrow_date: '2026-10-10', return_status: 'Returned' },
  { transaction_id: 9, usn: '1MS22IS041', book_id: 8, borrow_date: '2026-10-29', return_status: 'Returned' },
];

let mockStudents: MockStudent[] = INITIAL_STUDENTS.map((s) => ({ ...s }));
let mockBooks: MockBook[] = INITIAL_BOOKS.map((b) => ({ ...b }));
let mockRecords: MockBorrowRecord[] = INITIAL_RECORDS.map((r) => ({ ...r }));
let nextMockTransactionId = 10;

let pool: Pool | null = null;
let usingPostgres = false;
let initialized = false;

function formatDateOnly(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const str = String(value ?? '');
  return str.slice(0, 10);
}

function buildConnectionStringForAiven(rawUrl: string): string {
  // Remove sslmode query parameter so our explicit SSL object controls verification cleanly for Aiven
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.delete('sslmode');
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export async function initDatabase(): Promise<'postgresql' | 'mock'> {
  if (initialized) {
    return usingPostgres ? 'postgresql' : 'mock';
  }
  initialized = true;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.log('[LibraryDB] DATABASE_URL not configured — running in mock-data preview mode.');
    usingPostgres = false;
    return 'mock';
  }

  try {
    const connectionString = buildConnectionStringForAiven(databaseUrl);
    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_CA_CERT
        ? { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT }
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    });

    await pool.query('SELECT 1');

    // Create exact required PostgreSQL tables if they do not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student (
        usn VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(120) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS book (
        book_id SERIAL PRIMARY KEY,
        book_name VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS borrow_records (
        transaction_id SERIAL PRIMARY KEY,
        usn VARCHAR(50) NOT NULL REFERENCES student(usn) ON DELETE CASCADE,
        book_id INTEGER NOT NULL REFERENCES book(book_id) ON DELETE CASCADE,
        borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
        return_status VARCHAR(20) NOT NULL CHECK (return_status IN ('Borrowed', 'Returned'))
      );
    `);

    // Seed initial records only if tables are completely empty
    const studentCountRes = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM student');
    const bookCountRes = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM book');

    if (Number(studentCountRes.rows[0]?.count ?? 0) === 0 && Number(bookCountRes.rows[0]?.count ?? 0) === 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const s of INITIAL_STUDENTS) {
          await client.query(
            'INSERT INTO student (usn, name, department) VALUES ($1, $2, $3) ON CONFLICT (usn) DO NOTHING',
            [s.usn, s.name, s.department]
          );
        }
        for (const b of INITIAL_BOOKS) {
          await client.query(
            'INSERT INTO book (book_id, book_name, author) VALUES ($1, $2, $3) ON CONFLICT (book_id) DO NOTHING',
            [b.book_id, b.book_name, b.author]
          );
        }
        await client.query(
          "SELECT setval(pg_get_serial_sequence('book', 'book_id'), COALESCE((SELECT MAX(book_id) FROM book), 1), true)"
        );
        for (const r of INITIAL_RECORDS) {
          await client.query(
            'INSERT INTO borrow_records (transaction_id, usn, book_id, borrow_date, return_status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (transaction_id) DO NOTHING',
            [r.transaction_id, r.usn, r.book_id, r.borrow_date, r.return_status]
          );
        }
        await client.query(
          "SELECT setval(pg_get_serial_sequence('borrow_records', 'transaction_id'), COALESCE((SELECT MAX(transaction_id) FROM borrow_records), 1), true)"
        );
        await client.query('COMMIT');
      } catch (seedErr) {
        await client.query('ROLLBACK');
        throw seedErr;
      } finally {
        client.release();
      }
    }

    usingPostgres = true;
    console.log('[LibraryDB] Connected to PostgreSQL with SSL enabled.');
    return 'postgresql';
  } catch (error) {
    console.warn('[LibraryDB] PostgreSQL connection failed; falling back to mock-data mode:', (error as Error).message);
    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
    }
    usingPostgres = false;
    return 'mock';
  }
}

export async function getStudentsWithBorrows(): Promise<StudentWithBorrows[]> {
  await initDatabase();

  if (usingPostgres && pool) {
    const result = await pool.query<{
      usn: string;
      name: string;
      department: string;
      transaction_id: number | null;
      book_id: number | null;
      book_name: string | null;
      author: string | null;
      borrow_date: Date | string | null;
      return_status: ReturnStatus | null;
    }>(`
      SELECT
        s.usn,
        s.name,
        s.department,
        br.transaction_id,
        br.book_id,
        b.book_name,
        b.author,
        br.borrow_date,
        br.return_status
      FROM student s
      LEFT JOIN borrow_records br ON s.usn = br.usn
      LEFT JOIN book b ON br.book_id = b.book_id
      ORDER BY s.usn ASC, br.borrow_date DESC NULLS LAST, br.transaction_id DESC NULLS LAST
    `);

    const grouped = new Map<string, StudentWithBorrows>();
    for (const row of result.rows) {
      let student = grouped.get(row.usn);
      if (!student) {
        student = {
          usn: row.usn,
          name: row.name,
          department: row.department,
          borrow_records: [],
          active_borrow_count: 0,
          total_borrow_count: 0,
        };
        grouped.set(row.usn, student);
      }

      if (row.transaction_id !== null && row.book_id !== null && row.book_name !== null && row.author !== null && row.return_status !== null) {
        const entry: StudentBorrowEntry = {
          transaction_id: row.transaction_id,
          book_id: row.book_id,
          book_name: row.book_name,
          author: row.author,
          borrow_date: formatDateOnly(row.borrow_date),
          return_status: row.return_status,
        };
        student.borrow_records.push(entry);
        student.total_borrow_count += 1;
        if (row.return_status === 'Borrowed') {
          student.active_borrow_count += 1;
        }
      }
    }
    return Array.from(grouped.values());
  }

  // Mock-data LEFT JOIN equivalent
  const bookById = new Map(mockBooks.map((b) => [b.book_id, b]));
  return [...mockStudents]
    .sort((a, b) => a.usn.localeCompare(b.usn))
    .map((student) => {
      const records = mockRecords
        .filter((r) => r.usn === student.usn)
        .sort((a, b) => b.borrow_date.localeCompare(a.borrow_date) || b.transaction_id - a.transaction_id)
        .map((r): StudentBorrowEntry => {
          const book = bookById.get(r.book_id);
          return {
            transaction_id: r.transaction_id,
            book_id: r.book_id,
            book_name: book?.book_name ?? 'Unknown Book',
            author: book?.author ?? 'Unknown Author',
            borrow_date: r.borrow_date,
            return_status: r.return_status,
          };
        });

      return {
        usn: student.usn,
        name: student.name,
        department: student.department,
        borrow_records: records,
        active_borrow_count: records.filter((r) => r.return_status === 'Borrowed').length,
        total_borrow_count: records.length,
      };
    });
}

export async function getBooksWithStatus(): Promise<{ books: BookWithStatus[]; summary: BooksSummary }> {
  await initDatabase();

  let books: BookWithStatus[];

  if (usingPostgres && pool) {
    const result = await pool.query<{
      book_id: number;
      book_name: string;
      author: string;
      active_transaction_id: number | null;
      active_borrow_date: Date | string | null;
      borrower_usn: string | null;
      borrower_name: string | null;
      borrower_department: string | null;
    }>(`
      SELECT
        b.book_id,
        b.book_name,
        b.author,
        active_br.transaction_id AS active_transaction_id,
        active_br.borrow_date AS active_borrow_date,
        s.usn AS borrower_usn,
        s.name AS borrower_name,
        s.department AS borrower_department
      FROM book b
      LEFT JOIN borrow_records active_br
        ON b.book_id = active_br.book_id AND active_br.return_status = 'Borrowed'
      LEFT JOIN student s
        ON active_br.usn = s.usn
      ORDER BY b.book_id ASC
    `);

    books = result.rows.map((row) => ({
      book_id: row.book_id,
      book_name: row.book_name,
      author: row.author,
      is_borrowed: row.active_transaction_id !== null,
      active_transaction_id: row.active_transaction_id,
      borrower_usn: row.borrower_usn,
      borrower_name: row.borrower_name,
      borrower_department: row.borrower_department,
      active_borrow_date: row.active_borrow_date ? formatDateOnly(row.active_borrow_date) : null,
    }));
  } else {
    const studentByUsn = new Map(mockStudents.map((s) => [s.usn, s]));
    books = [...mockBooks]
      .sort((a, b) => a.book_id - b.book_id)
      .map((book) => {
        const activeRecord = mockRecords.find(
          (r) => r.book_id === book.book_id && r.return_status === 'Borrowed'
        );
        const borrower = activeRecord ? studentByUsn.get(activeRecord.usn) : undefined;
        return {
          book_id: book.book_id,
          book_name: book.book_name,
          author: book.author,
          is_borrowed: Boolean(activeRecord),
          active_transaction_id: activeRecord?.transaction_id ?? null,
          borrower_usn: borrower?.usn ?? null,
          borrower_name: borrower?.name ?? null,
          borrower_department: borrower?.department ?? null,
          active_borrow_date: activeRecord?.borrow_date ?? null,
        };
      });
  }

  const borrowedBooks = books.filter((b) => b.is_borrowed).length;
  const summary: BooksSummary = {
    total_books: books.length,
    borrowed_books: borrowedBooks,
    available_books: books.length - borrowedBooks,
  };

  return { books, summary };
}

export async function getTransactions(): Promise<BorrowTransaction[]> {
  await initDatabase();

  if (usingPostgres && pool) {
    const result = await pool.query<{
      transaction_id: number;
      usn: string;
      student_name: string;
      department: string;
      book_id: number;
      book_name: string;
      author: string;
      borrow_date: Date | string;
      return_status: ReturnStatus;
    }>(`
      SELECT
        br.transaction_id,
        br.usn,
        s.name AS student_name,
        s.department,
        br.book_id,
        b.book_name,
        b.author,
        br.borrow_date,
        br.return_status
      FROM borrow_records br
      JOIN student s ON br.usn = s.usn
      JOIN book b ON br.book_id = b.book_id
      ORDER BY
        CASE WHEN br.return_status = 'Borrowed' THEN 0 ELSE 1 END ASC,
        br.borrow_date DESC,
        br.transaction_id DESC
    `);

    return result.rows.map((row) => ({
      ...row,
      borrow_date: formatDateOnly(row.borrow_date),
    }));
  }

  const studentByUsn = new Map(mockStudents.map((s) => [s.usn, s]));
  const bookById = new Map(mockBooks.map((b) => [b.book_id, b]));

  return [...mockRecords]
    .sort((a, b) => {
      if (a.return_status !== b.return_status) {
        return a.return_status === 'Borrowed' ? -1 : 1;
      }
      return b.borrow_date.localeCompare(a.borrow_date) || b.transaction_id - a.transaction_id;
    })
    .map((r) => {
      const student = studentByUsn.get(r.usn);
      const book = bookById.get(r.book_id);
      return {
        transaction_id: r.transaction_id,
        usn: r.usn,
        student_name: student?.name ?? 'Unknown Student',
        department: student?.department ?? 'Unknown',
        book_id: r.book_id,
        book_name: book?.book_name ?? 'Unknown Book',
        author: book?.author ?? 'Unknown Author',
        borrow_date: r.borrow_date,
        return_status: r.return_status,
      };
    });
}

export async function getLibrarySnapshot(): Promise<LibrarySnapshot> {
  const [students, booksPayload, transactions] = await Promise.all([
    getStudentsWithBorrows(),
    getBooksWithStatus(),
    getTransactions(),
  ]);

  return {
    students,
    books: booksPayload.books,
    booksSummary: booksPayload.summary,
    transactions,
    dataSource: usingPostgres ? 'postgresql' : 'mock',
  };
}

export async function issueNewBook(
  usn: string,
  bookId: number,
  borrowDate: string
): Promise<{ ok: true; transaction_id: number } | { ok: false; status: number; message: string }> {
  await initDatabase();

  if (usingPostgres && pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const studentRes = await client.query('SELECT usn FROM student WHERE usn = $1', [usn]);
      if (studentRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return { ok: false, status: 404, message: `Student with USN "${usn}" was not found.` };
      }

      const bookRes = await client.query('SELECT book_id FROM book WHERE book_id = $1 FOR UPDATE', [bookId]);
      if (bookRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return { ok: false, status: 404, message: `Book ID ${bookId} was not found.` };
      }

      const activeRes = await client.query(
        "SELECT transaction_id FROM borrow_records WHERE book_id = $1 AND return_status = 'Borrowed' LIMIT 1",
        [bookId]
      );
      if ((activeRes.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');
        return { ok: false, status: 409, message: 'This book is currently borrowed and has not been returned yet.' };
      }

      const insertRes = await client.query<{ transaction_id: number }>(
        "INSERT INTO borrow_records (usn, book_id, borrow_date, return_status) VALUES ($1, $2, $3, 'Borrowed') RETURNING transaction_id",
        [usn, bookId, borrowDate]
      );

      await client.query('COMMIT');
      return { ok: true, transaction_id: insertRes.rows[0].transaction_id };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  const studentExists = mockStudents.some((s) => s.usn === usn);
  if (!studentExists) {
    return { ok: false, status: 404, message: `Student with USN "${usn}" was not found.` };
  }

  const bookExists = mockBooks.some((b) => b.book_id === bookId);
  if (!bookExists) {
    return { ok: false, status: 404, message: `Book ID ${bookId} was not found.` };
  }

  const alreadyBorrowed = mockRecords.some(
    (r) => r.book_id === bookId && r.return_status === 'Borrowed'
  );
  if (alreadyBorrowed) {
    return { ok: false, status: 409, message: 'This book is currently borrowed and has not been returned yet.' };
  }

  const transactionId = nextMockTransactionId++;
  mockRecords.push({
    transaction_id: transactionId,
    usn,
    book_id: bookId,
    borrow_date: borrowDate,
    return_status: 'Borrowed',
  });

  return { ok: true, transaction_id: transactionId };
}

export async function markTransactionReturned(
  transactionId: number
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  await initDatabase();

  if (usingPostgres && pool) {
    const existingRes = await pool.query<{ return_status: ReturnStatus }>(
      'SELECT return_status FROM borrow_records WHERE transaction_id = $1',
      [transactionId]
    );

    if (existingRes.rowCount === 0) {
      return { ok: false, status: 404, message: `Transaction #${transactionId} was not found.` };
    }

    if (existingRes.rows[0].return_status === 'Returned') {
      return { ok: false, status: 409, message: `Transaction #${transactionId} is already marked as Returned.` };
    }

    await pool.query(
      "UPDATE borrow_records SET return_status = 'Returned' WHERE transaction_id = $1",
      [transactionId]
    );
    return { ok: true };
  }

  const record = mockRecords.find((r) => r.transaction_id === transactionId);
  if (!record) {
    return { ok: false, status: 404, message: `Transaction #${transactionId} was not found.` };
  }

  if (record.return_status === 'Returned') {
    return { ok: false, status: 409, message: `Transaction #${transactionId} is already marked as Returned.` };
  }

  record.return_status = 'Returned';
  return { ok: true };
}
