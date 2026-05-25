-- =============================================
-- Supabase Schema: أسواق ثرا الشرق ون
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Categories
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name) VALUES
  ('الكل'), ('العروض'), ('المؤن'), ('الألبان'),
  ('المشروبات'), ('اللحوم والدواجن'), ('المخبوزات'), ('التسالي');

-- 2. Products
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  offer_price DECIMAL(10,2),
  is_offer BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'حبة',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "products_select_public" ON products
  FOR SELECT USING (true);

-- Admin write access (authenticated users only)
CREATE POLICY "products_insert_admin" ON products
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "products_update_admin" ON products
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "products_delete_admin" ON products
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 3. Orders
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  customer_email TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'جديد',
  payment_method TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Anyone can insert an order (no auth required for customers)
CREATE POLICY "orders_insert_public" ON orders
  FOR INSERT WITH CHECK (true);

-- Only authenticated (admin) can read/update orders
CREATE POLICY "orders_select_admin" ON orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "orders_update_admin" ON orders
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 4. Chat Messages
CREATE TABLE chat_messages (
  id BIGSERIAL PRIMARY KEY,
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'admin')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (customers can send messages)
CREATE POLICY "chat_insert_public" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- Anyone can read chat messages (both admin and customer)
CREATE POLICY "chat_select_public" ON chat_messages
  FOR SELECT USING (true);

-- 5. Seed products (from existing mock data)
INSERT INTO products (name, category, price, offer_price, is_offer, image_url, stock_quantity, unit) VALUES
  ('أرز مزة بسمتي أبو كاس (5 كجم)', 'المؤن', 40.00, 32.00, TRUE, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80', 50, 'كيس'),
  ('سمن نباتي مازولا (2 لتر)', 'المؤن', 25.00, NULL, FALSE, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80', 30, 'علبة'),
  ('زيت ذرة عافية (1.5 لتر)', 'المؤن', 18.00, NULL, FALSE, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', 60, 'حبة'),
  ('حليب المراعي طازج (2 لتر)', 'الألبان', 11.00, NULL, FALSE, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80', 40, 'حبة'),
  ('بيبسي كولا (6 × 330 مل)', 'المشروبات', 15.00, 12.00, TRUE, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80', 100, 'كرتون'),
  ('مياه نوفا (40 × 330 مل)', 'المشروبات', 18.00, NULL, FALSE, 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&q=80', 80, 'كرتون'),
  ('دجاج ساديا مجمد (1000 جرام)', 'اللحوم والدواجن', 17.50, NULL, FALSE, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80', 45, 'حبة'),
  ('بيض الوطنية (30 حبة)', 'الألبان', 19.00, NULL, FALSE, 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&q=80', 25, 'طبق'),
  ('خبز لوزين أبيض شرائح', 'المخبوزات', 4.00, NULL, FALSE, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80', 35, 'كيس'),
  ('بطاطس ليز بالملح (170 جرام)', 'التسالي', 7.00, NULL, FALSE, 'https://placehold.co/400x400/f97316/FFFFFF?text=ليز', 55, 'كيس'),
  ('جبنة كرافت تشيدر علب', 'الألبان', 6.50, NULL, FALSE, 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=400&q=80', 50, 'علبة'),
  ('شاي ليبتون العلامة الصفراء (100 كيس)', 'المشروبات', 16.00, NULL, FALSE, 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cbf9?w=400&q=80', 60, 'علبة');
