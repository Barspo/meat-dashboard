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