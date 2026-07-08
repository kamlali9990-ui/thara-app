import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { BASE } from '../utils/constants';

const QRPrintPage = ({ onClose }: { onClose?: () => void }) => {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const APP_URL = 'https://tharasharqone.com';

  useEffect(() => {
    const generateQR = () => {
      if (qrRef.current) {
        const qrWidth = Math.min(300, window.innerWidth * 0.6);
        QRCode.toCanvas(qrRef.current, APP_URL, {
          width: qrWidth,
          margin: 2,
          color: {
              dark: '#127443',
              light: '#ffffff'
            }
        }, (error: any) => {
          if (error) console.error(error);
        });
      }
    };
    
    generateQR();
    
    const handleResize = () => generateQR();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      if (blob) {
        const file = new File([blob], 'ثرياء-الشرق-باركود.png', { type: 'image/png' });
        
        const shareData = {
          title: 'أسواق ثراء الشرق ون',
          text: 'حمل تطبيق أسواق ثراء الشرق ون وتصفح أحدث العروض والمنتجات',
          files: [file]
        };
        
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }
      
      const shareData = {
        title: 'أسواق ثراء الشرق ون',
        text: 'حمل تطبيق أسواق ثراء الشرق ون وتصفح أحدث العروض والمنتجات',
        url: APP_URL
      };
      
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(APP_URL);
        alert('تم نسخ الرابط بنجاح! يمكنك مشاركته الآن.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      try {
        await navigator.clipboard.writeText(APP_URL);
        alert('تم نسخ الرابط بنجاح! يمكنك مشاركته الآن.');
      } catch (clipboardError) {
        alert('لا يمكن مشاركة المحتوى الآن. الرابط: ' + APP_URL);
      }
    }
  };

  const handleGoBack = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="qr-print-page">
      <button className="back-button" onClick={handleGoBack}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        رجوع
      </button>
      <style>{`
        .qr-print-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive, sans-serif;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }

        .back-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.9);
          color: #667eea;
          border: 3px solid #667eea;
          padding: 0.6rem 1.2rem;
          font-size: 1rem;
          font-weight: 800;
          border-radius: 50px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          z-index: 10;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .back-button:hover {
          background: white;
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        
        .qr-print-page::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: 
            radial-gradient(circle at 20% 80%, rgba(255, 218, 185, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(173, 216, 230, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(255, 255, 224, 0.2) 0%, transparent 50%);
          animation: float 20s ease-in-out infinite;
          z-index: 0;
        }
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(120deg); }
          66% { transform: translate(-20px, 20px) rotate(240deg); }
        }
        
        .qr-card {
          background: white;
          border-radius: 32px;
          padding: 2rem 1.5rem;
          max-width: 500px;
          width: 100%;
          box-shadow: 
            0 20px 60px rgba(0,0,0,0.3),
            0 0 0 6px #FFD700,
            0 0 0 12px #FFA500;
          text-align: center;
          box-sizing: border-box;
          position: relative;
          z-index: 1;
        }

        .qr-header {
          margin-bottom: 1.5rem;
        }

        .qr-logo {
          width: 120px;
          height: 120px;
          border-radius: 28px;
          margin-bottom: 1rem;
          object-fit: cover;
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          transform: rotate(-3deg);
        }

        .qr-title {
          font-size: 2.2rem;
          font-weight: 900;
          background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #FFD93D 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }

        .qr-subtitle {
          font-size: 1.15rem;
          color: #FF8C42;
          margin: 0.5rem 0 0 0;
          line-height: 1.4;
          font-weight: 700;
        }

        .qr-code-container {
          background: linear-gradient(135deg, #FFE5B4 0%, #FFF8DC 100%);
          padding: 1.5rem;
          border-radius: 24px;
          border: 5px dashed #FF6B6B;
          display: inline-block;
          margin: 1.5rem 0;
          box-shadow: 0 10px 30px rgba(255, 107, 107, 0.2);
        }

        .qr-canvas {
          display: block;
          max-width: 100%;
          height: auto;
          border-radius: 12px;
        }

        .qr-instructions {
          text-align: right;
          margin: 1.5rem 0;
          padding: 1.25rem;
          background: linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%);
          border-radius: 20px;
          border: 3px solid #4CAF50;
          box-shadow: 0 6px 20px rgba(76, 175, 80, 0.2);
        }

        .qr-step {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.875rem;
          justify-content: flex-end;
        }

        .qr-step:last-child {
          margin-bottom: 0;
        }

        .qr-step-number {
          background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
          color: white;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          flex-shrink: 0;
          font-size: 1.1rem;
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
        }

        .qr-step-text {
          font-size: 1rem;
          color: #2C3E50;
          font-weight: 700;
          line-height: 1.4;
        }

        .qr-url {
          font-size: 1.2rem;
          color: #9B59B6;
          font-weight: 800;
          direction: ltr;
          margin-top: 0.75rem;
          padding: 0.85rem 1.5rem;
          background: linear-gradient(135deg, #F3E5F5 0%, #EDE7F6 100%);
          border-radius: 16px;
          border: 3px solid #9B59B6;
          word-break: break-all;
        }

        .qr-slogan {
          font-size: 1.35rem;
          color: #2C3E50;
          font-weight: 900;
          margin-top: 1rem;
          padding: 1.5rem 1.75rem 1rem 1.75rem;
          background: linear-gradient(135deg, #FFF5E6 0%, #FFE5B4 100%);
          border-radius: 20px;
          border: 3px dotted #FF8C42;
          text-align: center;
          position: relative;
        }

        .cartoon-mascot {
          position: absolute;
          top: -40px;
          right: -10px;
          animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0) rotate(-5deg);
          }
          50% {
            transform: translateY(-10px) rotate(5deg);
          }
        }

        .print-button,
        .share-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: 4px solid #5a67d8;
          padding: 0.875rem 2rem;
          font-size: 1.1rem;
          font-weight: 800;
          border-radius: 18px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
          min-height: 56px;
          min-width: 160px;
          justify-content: center;
        }

        .print-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: #5a67d8;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .share-button {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          border-color: #ec4899;
          box-shadow: 0 6px 20px rgba(245, 87, 108, 0.4);
        }

        .print-button:hover,
        .share-button:hover {
          transform: translateY(-4px) scale(1.05);
        }

        .print-button:hover {
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.6);
        }

        .share-button:hover {
          box-shadow: 0 10px 30px rgba(245, 87, 108, 0.6);
        }

        .buttons-container {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 1.25rem;
        }

        @media (max-width: 480px) {
          .qr-print-page {
            padding: 0.5rem;
          }
          
          .qr-card {
            padding: 1.5rem 1rem;
            border-radius: 16px;
          }
          
          .qr-logo {
            width: 80px;
            height: 80px;
            border-radius: 16px;
          }
          
          .qr-title {
            font-size: 1.5rem;
          }
          
          .qr-subtitle {
            font-size: 0.9rem;
          }
          
          .qr-code-container {
            padding: 1rem;
            margin: 1rem 0;
          }
          
          .qr-instructions {
            padding: 1rem;
            margin: 1rem 0;
          }
          
          .qr-step-text {
            font-size: 0.875rem;
          }
          
          .qr-url {
            font-size: 1rem;
            padding: 0.625rem 1rem;
          }
        }

        @media (min-width: 768px) {
          .qr-print-page {
            padding: 2rem;
          }
          
          .qr-card {
            padding: 3rem;
          }
          
          .qr-logo {
            width: 120px;
            height: 120px;
            border-radius: 24px;
          }
          
          .qr-title {
            font-size: 2rem;
          }
          
          .qr-subtitle {
            font-size: 1.1rem;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 1cm;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100%;
            overflow: hidden;
          }
          
          .qr-print-page {
            background: white;
            padding: 0;
            min-height: auto;
            height: 100%;
            overflow: hidden;
          }

          .back-button {
            display: none !important;
          }
          
          .qr-card {
            box-shadow: 0 0 0 3px #FFD700;
            max-width: 100%;
            width: 100%;
            padding: 1rem;
            margin: 0 auto;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .qr-header {
            margin-bottom: 0.75rem;
          }
          
          .qr-logo {
            width: 70px;
            height: 70px;
            margin-bottom: 0.5rem;
          }
          
          .qr-title {
            font-size: 1.6rem;
            -webkit-text-fill-color: initial;
            color: #FF6B6B;
          }
          
          .qr-subtitle {
            font-size: 0.95rem;
          }
          
          .qr-code-container {
            padding: 0.75rem;
            margin: 0.75rem 0;
            border-width: 3px;
          }
          
          .qr-instructions {
            padding: 0.75rem;
            margin: 0.75rem 0;
          }
          
          .qr-step {
            margin-bottom: 0.5rem;
          }
          
          .qr-step-text {
            font-size: 0.85rem;
          }
          
          .qr-url {
            margin-top: 0.5rem;
            padding: 0.5rem 0.75rem;
            font-size: 1rem;
            color: #9B59B6;
            border-color: #9B59B6;
          }

          .qr-slogan {
            font-size: 1.15rem;
            padding: 0.75rem 1rem;
            margin-top: 0.75rem;
            color: #2C3E50;
            border-style: dashed;
            border-color: #FF8C42;
          }

          .cartoon-mascot {
            display: none;
          }
          
          .print-button,
          .share-button,
          .buttons-container {
            display: none;
          }
          
          * {
            visibility: hidden;
          }
          
          .qr-print-page,
          .qr-print-page * {
            visibility: visible;
          }
          
          .qr-print-page {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="qr-card">
        <div className="qr-header">
          <img 
            src={`${BASE}logo222.jpg`}
            alt="أسواق ثراء الشرق ون"
            className="qr-logo"
            onError={(e: any) => { e.target.src = `${BASE}newicon.jpg`; }}
          />
          <h1 className="qr-title">أسواق ثراء الشرق ون</h1>
          <p className="qr-subtitle">توصيل طلبات السوبرماركت لباب بيتك في الخفجي</p>
        </div>

        <div className="qr-code-container">
          <canvas ref={qrRef} className="qr-canvas" />
        </div>

        <div className="qr-instructions">
          <div className="qr-step">
            <span className="qr-step-text">اسحب الكاميرا على الباركود</span>
            <span className="qr-step-number">1</span>
          </div>
          <div className="qr-step">
            <span className="qr-step-text">افتح الرابط في المتصفح</span>
            <span className="qr-step-number">2</span>
          </div>
          <div className="qr-step">
            <span className="qr-step-text">أضف التطبيق للشاشة الرئيسية</span>
            <span className="qr-step-number">3</span>
          </div>
        </div>

        <div className="qr-url">
          0503203994
        </div>

        <div className="qr-slogan">
          <div className="cartoon-mascot">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <circle cx="50" cy="50" r="40" fill="#FFD93D" stroke="#FF8C42" strokeWidth="4"/>
              <circle cx="38" cy="42" r="6" fill="#2C3E50"/>
              <circle cx="62" cy="42" r="6" fill="#2C3E50"/>
              <circle cx="36" cy="40" r="2" fill="white"/>
              <circle cx="60" cy="40" r="2" fill="white"/>
              <path d="M 30 65 Q 50 80 70 65" stroke="#2C3E50" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <path d="M 22 35 L 28 30 L 34 38" stroke="#FF6B6B" strokeWidth="4" fill="none" strokeLinecap="round"/>
              <path d="M 66 38 L 72 30 L 78 35" stroke="#FF6B6B" strokeWidth="4" fill="none" strokeLinecap="round"/>
              <circle cx="25" cy="55" r="7" fill="#FFB3C1" opacity="0.7"/>
              <circle cx="75" cy="55" r="7" fill="#FFB3C1" opacity="0.7"/>
            </svg>
          </div>
          كل اللي تبيه نلبيه، اطلبنا نجيك .. الله يحييك
        </div>

        <div className="buttons-container">
          <button className="print-button" onClick={handlePrint}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            طباعة
          </button>
          <button className="share-button" onClick={handleShare}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            مشاركة
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRPrintPage;
