import { BASE } from '../utils/constants';
import SnakeGame from './SnakeGame';

export default function MaintenancePage() {
  return (
    <div className="maintenance-page">
      <img src={`${BASE}newicon.jpg`} alt="" className="maintenance-logo" onError={(e) => { e.target.style.display='none'; }} />
      <div className="maintenance-icon">🔧</div>
      <h1>الموقع قيد الصيانة</h1>
      <p>نعمل على تحسين تجربتك. سنعود قريباً!</p>
      <div style={{ marginTop: '1.5rem' }}>
        <SnakeGame />
      </div>
    </div>
  );
}
