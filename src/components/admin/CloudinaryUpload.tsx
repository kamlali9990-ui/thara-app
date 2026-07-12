import { useRef, useState } from 'react';

const CLOUD_NAME = 'dvnhgvdd1';
const API_KEY = '475255696212661';
const SIGN_FUNCTION = `${import.meta.env.BASE_URL || '/'}api/cloudinary-sign`;

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const CLOUDINARY_WIDGET_URL = 'https://upload-widget.cloudinary.com/latest/global/all.js';

function loadCloudinaryScript(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if ((window as any).cloudinary?.createUploadWidget) return resolve(true);

    const existing = document.querySelector(`script[src="${CLOUDINARY_WIDGET_URL}"]`);
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.src = CLOUDINARY_WIDGET_URL;
    script.async = true;
    document.head.appendChild(script);

    let attempts = 0;
    const maxAttempts = 50;
    const poll = setInterval(() => {
      attempts++;
      if ((window as any).cloudinary?.createUploadWidget) {
        clearInterval(poll);
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(poll);
        resolve(false);
      }
    }, 200);
  });
}

async function getSignature(paramsToSign: Record<string, string>) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const functionsUrl = supabaseUrl
    ? supabaseUrl.replace(/\/+$/, '') + '/functions/v1/cloudinary-sign'
    : SIGN_FUNCTION;

  const res = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(anonKey ? { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } : {}),
    },
    body: JSON.stringify(paramsToSign),
  });
  if (!res.ok) throw new Error('فشل الحصول على توقيع الرفع');
  return res.json();
}

export default function CloudinaryUpload({ onUpload, onError }: {
  onUpload: (url: string, info?: any) => void;
  onError?: (error: any) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const widgetRef = useRef<any>(null);

  const openWidget = async () => {
    if (!(window as any).cloudinary) {
      setLoading(true);
      const loaded = await loadCloudinaryScript();
      setLoading(false);
      if (!loaded) {
        alert('خطأ: فشل تحميل Cloudinary widget. تأكد من اتصالك بالإنترنت');
        return;
      }
    }

    setUploading(true);

    const myWidget = (window as any).cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        apiKey: API_KEY,
        uploadSignature: (callback: (sig: string) => void, paramsToSign: Record<string, string>) => {
          getSignature(paramsToSign)
            .then(({ signature }) => callback(signature))
            .catch(() => { /* widget handles error */ });
        },
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
      },
      (error: any, result: any) => {
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