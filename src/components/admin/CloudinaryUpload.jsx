import { useRef } from 'react';

const CLOUD_NAME = 'dvnhgvdd1';
const UPLOAD_PRESET = 'unsigned'; // Upload preset بدون توقيع

export default function CloudinaryUpload({ onUpload, onError }) {
  const widgetRef = useRef(null);

  const openWidget = () => {
    if (!window.cloudinary) {
      alert('خطأ: Cloudinary widget لم يتم تحميله بعد');
      return;
    }

    const myWidget = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ['local', 'camera', 'url'],
        multiple: false,
        maxFiles: 1,
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
        language: 'ar',
      },
      (error, result) => {
        if (!error && result && result.event === 'success') {
          console.log('✅ Image uploaded:', result.info.secure_url);
          onUpload(result.info.secure_url, result.info);
        }
        if (error) {
          console.error('❌ Upload error:', error);
          onError?.(error);
        }
      }
    );

    myWidget.open();
  };

  return (
    <button
      type="button"
      onClick={openWidget}
      className="cloudinary-upload-btn"
    >
      📷 رفع صورة
    </button>
  );
}
