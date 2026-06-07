import { useRef, useState } from 'react';
import { supabase } from '../../supabase/client';

const CLOUD_NAME = 'dvnhgvdd1';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function getSignatureUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) return null;
  return base.replace(/\/+$/, '') + '/functions/v1/cloudinary-sign';
}

const CLOUDINARY_WIDGET_URL = 'https://upload-widget.cloudinary.com/latest/global/all.js';

function loadCloudinaryScript() {
  return new Promise((resolve) => {
    if (window.cloudinary?.createUploadWidget) return resolve(true);

    // Remove any existing script with same src to avoid duplicates
    const existing = document.querySelector(`script[src="${CLOUDINARY_WIDGET_URL}"]`);
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.src = CLOUDINARY_WIDGET_URL;
    script.async = true;
    document.head.appendChild(script);

    // Poll for window.cloudinary instead of relying on onload timing
    let attempts = 0;
    const maxAttempts = 50; // ~10 seconds
    const poll = setInterval(() => {
      attempts++;
      if (window.cloudinary?.createUploadWidget) {
        clearInterval(poll);
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(poll);
        resolve(false);
      }
    }, 200);
  });
}

export default function CloudinaryUpload({ onUpload, onError }) {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const widgetRef = useRef(null);

  const openWidget = async () => {
    if (!window.cloudinary) {
      setLoading(true);
      const loaded = await loadCloudinaryScript();
      setLoading(false);
      if (!loaded) {
        alert('خطأ: فشل تحميل Cloudinary widget. تأكد من اتصالك بالإنترنت');
        return;
      }
    }

    const signatureUrl = getSignatureUrl();

    const config = {
      cloudName: CLOUD_NAME,
      sources: ['local', 'camera', 'url'],
      multiple: false,
      maxFiles: 1,
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      maxFileSize: MAX_SIZE_BYTES,
      language: 'ar',
      styles: {
        palette: {
          window: '#FFFFFF',
          sourceBg: '#F4F4F5',
          windowBorder: '#8a8a8a',
          tabIcon: '#127443',
          inactiveTabIcon: '#555a5f',
          menuIcons: '#127443',
          link: '#127443',
          action: '#FFFFFF',
          inProgress: '#127443',
          success: '#127443',
          error: '#FF4242',
          textDark: '#333333',
          textInfo: '#555a5f',
          textPrimary: '#127443',
        },
      },
    };

    if (signatureUrl) {
      config.uploadSignature = async (callback, params) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(signatureUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
            },
            body: JSON.stringify(params),
          });
          if (!res.ok) throw new Error('Signature request failed');
          const data = await res.json();
          callback(data);
        } catch (err) {
          callback({ error: err.message });
        }
      };
    }

    const myWidget = window.cloudinary.createUploadWidget(
      config,
      (error, result) => {
        setUploading(false);
        if (!error && result && result.event === 'success') {
          onUpload(result.info.secure_url, result.info);
        }
        if (error && result?.event !== 'close') {
          onError?.(error);
        }
      }
    );

    widgetRef.current = myWidget;
    myWidget.open();
  };

  return (
    <button
      type="button"
      onClick={openWidget}
      className="cloudinary-upload-btn"
      disabled={uploading || loading}
    >
      📷 {loading ? 'جاري التحميل...' : uploading ? 'جاري الرفع...' : 'رفع صورة'}
    </button>
  );
}
