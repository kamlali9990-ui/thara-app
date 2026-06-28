-- تعيين صورة افتراضية لكل منتج حسب قسمه
-- شغّل في: https://supabase.com/dashboard/project/oqwphazzuxmrxwbnothk/sql/new

UPDATE products SET image_url = '/cat_canned.jpg'
WHERE (image_url IS NULL OR image_url = '') AND category = 'مواد غذائية';

UPDATE products SET image_url = '/cat_vegetables.jpg'
WHERE (image_url IS NULL OR image_url = '') AND category = 'منظفات';

UPDATE products SET image_url = '/الكترونيات.jpg'
WHERE (image_url IS NULL OR image_url = '') AND category = 'إلكترونيات';

UPDATE products SET image_url = '/اواني.jpg'
WHERE (image_url IS NULL OR image_url = '') AND category = 'أواني';

UPDATE products SET image_url = '/cat_canned.jpg'
WHERE (image_url IS NULL OR image_url = '') AND category = 'مكسرات وبهارات';

UPDATE products SET image_url = '/Getty.webp'
WHERE (image_url IS NULL OR image_url = '') AND category = 'خضروات وفواكه';

UPDATE products SET image_url = '/العاب.jpg'
WHERE (image_url IS NULL OR image_url = '') AND category = 'ألعاب';

UPDATE products SET image_url = '/cat_dairy.jpg'
WHERE (image_url IS NULL OR image_url = '') AND category = 'مجموعة الأصناف';

UPDATE products SET image_url = '/ملابس.jpg'
WHERE (image_url IS NULL OR image_url = '') AND category = 'ملابس';

UPDATE products SET image_url = '/cat_hardware.jpg'
WHERE (image_url IS NULL OR image_url = '') AND category = 'مواد البناء';

UPDATE products SET image_url = '/العطور.jpg'
WHERE (image_url IS NULL OR image_url = '') AND category = 'العطور';

SELECT category, COUNT(*) AS updated FROM products WHERE image_url LIKE '/%' AND image_url NOT IN (SELECT image_url FROM products WHERE image_url IS NULL OR image_url = '') GROUP BY category ORDER BY category;
