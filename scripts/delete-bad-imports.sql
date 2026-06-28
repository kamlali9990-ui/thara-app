-- حذف الأصناف التي تم استيرادها ببيانات خاطئة (الأسماء أصبحت أرقاماً)
-- شغّل هذا في: https://supabase.com/dashboard/project/oqwphazzuxmrxwbnothk/sql/new

-- 1. أولاً: معاينة ما سيتم حذفه
SELECT id, name, price, stock_quantity, category 
FROM products 
WHERE name ~ '^\d+\.?\d*$' 
ORDER BY id;

-- 2. حذف الأصناف ذات الأسماء الرقمية فقط
DELETE FROM products 
WHERE name ~ '^\d+\.?\d*$';

-- 3. تأكيد الحذف
SELECT 'تم الحذف بنجاح' AS result;
