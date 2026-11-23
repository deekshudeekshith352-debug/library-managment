export type ReturnStatus = 'Borrowed' | 'Returned';

export interface StudentBorrowEntry {
  transaction_id: number;
  book_id: number;
  book_name: string;
  author: string;
  borrow_date: string;
  return_status: ReturnStatus;
}

export interface StudentWithBorrows {
  usn: string;
  name: string;
  department: string;
  borrow_records: StudentBorrowEntry[];
  active_borrow_count: number;
  total_borrow_count: number;
}

export interface BookWithStatus {
  book_id: number;
  book_name: string;
  author: string;
  is_borrowed: boolean;
  active_transaction_id: number | null;
  borrower_usn: string | null;
  borrower_name: string | null;
  borrower_department: string | null;
  active_borrow_date: string | null;
}

export interface BooksSummary {
  total_books: number;
  borrowed_books: number;
  available_books: number;
}

export interface BorrowTransaction {
  transaction_id: number;
  usn: string;
  student_name: string;
  department: string;
  book_id: number;
  book_name: string;
  author: string;
  borrow_date: string;
  return_status: ReturnStatus;
}

export interface LibrarySnapshot {
  students: StudentWithBorrows[];
  books: BookWithStatus[];
  booksSummary: BooksSummary;
  transactions: BorrowTransaction[];
  dataSource: 'postgresql' | 'mock';
}
