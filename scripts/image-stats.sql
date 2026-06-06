SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') AS no_image,
  COUNT(*) FILTER (WHERE image_url ILIKE '%res.cloudinary.com%') AS on_cloudinary,
  COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT ILIKE '%res.cloudinary.com%') AS external_urls,
  COUNT(*) FILTER (WHERE image_url ILIKE '%tiktok%') AS tiktok,
  COUNT(*) FILTER (WHERE image_url ILIKE '%facebook%' OR image_url ILIKE '%fbcdn%') AS facebook,
  COUNT(*) FILTER (WHERE image_url ILIKE '%instagram%' OR image_url ILIKE '%cdninstagram%') AS instagram,
  COUNT(*) FILTER (WHERE image_url ILIKE '%pinimg%' OR image_url ILIKE '%pinterest%') AS pinterest,
  COUNT(*) FILTER (WHERE image_url ILIKE '%twimg%' OR image_url ILIKE '%twitter%' OR image_url ILIKE '%.x.com%') AS twitter,
  COUNT(*) FILTER (WHERE image_url ILIKE '%unsplash%') AS unsplash,
  COUNT(*) FILTER (WHERE image_url ILIKE '%aliexpress%' OR image_url ILIKE '%alibaba%') AS alibaba,
  COUNT(*) FILTER (WHERE image_url ILIKE '%shopify%') AS shopify,
  COUNT(*) FILTER (WHERE image_url ILIKE '%wp.com%' OR image_url ILIKE '%wordpress%') AS wordpress,
  COUNT(*) FILTER (WHERE image_url ILIKE '%amazon%') AS amazon,
  COUNT(*) FILTER (WHERE image_url ILIKE '%googleusercontent%' OR image_url ILIKE '%ggpht%') AS google
FROM products;
