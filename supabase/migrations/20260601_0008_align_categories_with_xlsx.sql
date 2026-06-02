-- =============================================
-- Migration 0008: Align categories & products with data.xlsx
-- Replaces old hardcoded categories with the 10
-- real sections from the inventory file.
-- =============================================

-- 1. Update categories table: remove old, add xlsx-based ones
DELETE FROM categories WHERE name IN (
  'المؤن', 'الألبان', 'المشروبات',
  'اللحوم والدواجن', 'المخبوزات', 'التسالي'
);

INSERT INTO categories (name) VALUES
  ('مواد غذائية'), ('منظفات'), ('إلكترونيات'), ('أواني'),
  ('مكسرات وبهارات'), ('خضروات وفواكه'), ('ألعاب'),
  ('مجموعة الأصناف'), ('ملابس'), ('مواد البناء')
ON CONFLICT (name) DO NOTHING;

-- 2. Update existing products to use new category names
UPDATE products SET category = 'مواد غذائية'
WHERE category IN ('المؤن', 'الألبان', 'المشروبات', 'اللحوم والدواجن', 'المخبوزات');

UPDATE products SET category = 'مكسرات وبهارات'
WHERE category = 'التسالي';

UPDATE products SET category = 'خضروات وفواكه'
WHERE category = 'الخضروات والفواكه';

UPDATE products SET category = 'منظفات'
WHERE category = 'المنظفات';

UPDATE products SET category = 'مجموعة الأصناف'
WHERE category = 'العناية الشخصية';
