import { memo } from 'react';
import { BASE, imgFallback } from '../utils/constants';

const SplashScreen = memo(() => (
  <div className="splash-screen">
    <div className="splash-curtain">
      <div className="splash-box">
        <img src={`${BASE}logo222.jpg`} alt="" className="splash-logo"
          onError={(e) => { e.target.src = imgFallback(100, 100, '#127443', '#FFFFFF', 'ث'); }} />
        <h1 className="splash-title">ثراء الشرق ون</h1>
        <p className="splash-tagline">خدمة التوصيل</p>
        <div className="splash-loader"><div className="splash-loader-bar" /></div>
      </div>
    </div>
  </div>
));

export default SplashScreen;
