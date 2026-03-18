import { Pool } from 'pg';

// Pool מוגדר לסביבת serverless (Vercel) — חיבורים קצרים ומהירים
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

// פונקציית עזר להריץ שאילתות
export const query = async (text: string, params?: any[]) => {
  const res = await pool.query(text, params);
  return res;
};

// Transaction wrapper — כל השאילתות רצות על אותו connection עם BEGIN/COMMIT/ROLLBACK
export async function withTransaction<T>(
  fn: (client: { query: (text: string, params?: any[]) => Promise<any> }) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}