-- Migration: add performance indexes
-- Generated from scripts/add-performance-indexes.sql

-- =============================================
-- Performance indexes for hot query paths.
-- Safe to re-run (idempotent).
-- =============================================

CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_id ON orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_id ON chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_staff_email_lower ON staff(lower(email));
