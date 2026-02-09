const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// פונקציה חכמה לפירוק שורת CSV
function parseCSVLine(text) {
  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
  const cols = text.split(regex);
  return cols.map(col => {
    let clean = col.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.slice(1, -1);
    }
    return clean;
  });
}

// --- השינוי הגדול כאן: ניקוי אגרסיבי למספרים ---
function cleanNumber(numStr) {
  if (!numStr) return 0;
  // משאיר רק ספרות (0-9), נקודה (.) ומינוס (-). כל השאר נמחק (כולל מרכאות ופסיקים)
  const cleaned = numStr.replace(/[^0-9.-]/g, ''); 
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

async function importData() {
  const client = await pool.connect();
  try {
    console.log('🚀 מתחיל ייבוא נתונים...');

    // --- שלב א: ייבוא מוצרים ---
    console.log('📦 מייבא מוצרים...');
    const productsPath = path.join(__dirname, 'data', 'products.csv');
    if (fs.existsSync(productsPath)) {
        const productsData = fs.readFileSync(productsPath, 'utf8').split('\n');
        
        for (let i = 1; i < productsData.length; i++) {
          const line = productsData[i].trim();
          if (!line) continue;
          
          const cols = parseCSVLine(line);
          
          // הגנה מפני שורות ריקות או חלקיות
          if (cols.length < 5) continue;

          const item_id = cols[0];
          const name_spanish = cols[2];
          const name_hebrew = cols[3];
          const department = cols[4];
          const is_anatomical = cols[5];
          const is_steak = cols[6];
          const freshness = cols[7];
          const kosher_type = cols[8];
          const breed = cols[9];
          const origin_country = cols[10];
          const customer = cols[11];

          await client.query(`
            INSERT INTO products (item_id, name_spanish, name_hebrew, department, is_anatomical, is_steak, freshness, kosher_type, breed, origin_country, customer)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (item_id) DO UPDATE SET 
              name_spanish = EXCLUDED.name_spanish,
              name_hebrew = EXCLUDED.name_hebrew;
          `, [item_id, name_spanish, name_hebrew, department, is_anatomical, is_steak, freshness, kosher_type, breed, origin_country, customer]);
        }
        console.log('✅ מוצרים יובאו בהצלחה.');
    }

    // --- שלב ב: יצירת Work Order בסיסי ---
    await client.query(`
      INSERT INTO work_orders (work_id, factory_id, status)
      VALUES (1, 8000, 'Completed')
      ON CONFLICT (work_id) DO NOTHING;
    `);

    // --- שלב ג: ייבוא נתוני ייצור ---
    console.log('🏭 מייבא נתוני ייצור...');
    const productionPath = path.join(__dirname, 'data', 'production.csv');
    if (fs.existsSync(productionPath)) {
        const prodData = fs.readFileSync(productionPath, 'utf8').split('\n');

        for (let i = 1; i < prodData.length; i++) {
          const line = prodData[i].trim();
          if (!line) continue;

          const cols = parseCSVLine(line);
          
          // ניקוי אגרסיבי גם ל-Work ID ולשאר המספרים
          const work_id = cleanNumber(cols[0]) || 1; 
          const item_id = cols[1];
          const units = cleanNumber(cols[2]);
          const boxes = cleanNumber(cols[3]);
          const weight_kg = cleanNumber(cols[4]);

          // בדיקה שבאמת יש לנו מוצר
          if (!item_id || item_id === '') continue;

          await client.query(`
            INSERT INTO production_records (work_id, item_id, units, boxes, weight_kg)
            VALUES ($1, $2, $3, $4, $5);
          `, [work_id, item_id, units, boxes, weight_kg]);
        }
        console.log('🎉 הכל הושלם בהצלחה!');
    }

  } catch (err) {
    console.error('❌ שגיאה:', err);
  } finally {
    client.release();
    pool.end();
  }
}

importData();