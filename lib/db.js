import { Pool } from 'pg';

// 1. בדיקת אבחון: האם המערכת רואה את משתנה הסביבה?
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is missing! Did you create .env.local?');
} else {
  console.log('✅ DATABASE_URL is loaded (starts with):', process.env.DATABASE_URL.substring(0, 15) + '...');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // הגדרה חשובה ל-Neon:
  ssl: {
    rejectUnauthorized: false // מאפשר חיבור מאובטח גם בסביבת פיתוח
  }
});

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('✅ Query executed', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    // כאן נראה את הסיבה האמיתית לכישלון
    console.error('❌ Database Connection Error:', error.message);
    throw error;
  }
};