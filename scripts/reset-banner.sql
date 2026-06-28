-- تعيين البنر الافتراضي
INSERT INTO settings (key, value)
VALUES ('banner_url', '/123.jpg')
ON CONFLICT (key) DO UPDATE SET value = '/123.jpg';
