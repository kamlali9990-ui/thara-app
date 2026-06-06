SELECT id, name, image_url
FROM products
WHERE image_url IS NOT NULL
  AND image_url != ''
  AND image_url NOT ILIKE '%res.cloudinary.com%'
ORDER BY id
LIMIT 1000;
