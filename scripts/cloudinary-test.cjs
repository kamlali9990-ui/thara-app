const cloudinary = require('cloudinary');

// Configuration
cloudinary.config({ 
    cloud_name: 'dvnhgvdd1', 
    api_key: '475255696212661', 
    api_secret: 'Yiquuxk4nGn7dziVL7lkVNOy3Uc'
});

(async function() {
    console.log('='.repeat(50));
    console.log('  Cloudinary Integration Test');
    console.log('='.repeat(50));
    console.log('');

    // Upload an image
    console.log('[1/3] Uploading sample image...');
    const uploadResult = await cloudinary.uploader
      .upload(
          'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
              public_id: 'thara-test-shoes',
              folder: 'thara-products'
          }
      )
      .catch((error) => {
          console.log('  ❌ Upload failed:', error.message);
      });
    
    if (uploadResult) {
        console.log('  ✅ Upload successful!');
        console.log(`  URL: ${uploadResult.secure_url}`);
        console.log(`  Public ID: ${uploadResult.public_id}`);
        console.log('');
    }

    // Optimize delivery by resizing and applying auto-format and auto-quality
    console.log('[2/3] Creating optimized URL...');
    const optimizeUrl = cloudinary.url('thara-products/thara-test-shoes', {
        fetch_format: 'auto',  // automatic format (WebP/AVIF)
        quality: 'auto'        // automatic quality
    });
    console.log('  ✅ Optimized URL created!');
    console.log(`  URL: ${optimizeUrl}`);
    console.log('');

    // Transform the image: auto-crop to square aspect_ratio
    console.log('[3/3] Creating transformed URL...');
    const autoCropUrl = cloudinary.url('thara-products/thara-test-shoes', {
        crop: 'auto',
        gravity: 'auto',
        width: 500,
        height: 500,
    });
    console.log('  ✅ Transformed URL created!');
    console.log(`  URL: ${autoCropUrl}`);
    console.log('');

    console.log('='.repeat(50));
    console.log('  Done! Open the URLs above in your browser');
    console.log('='.repeat(50));
})();
