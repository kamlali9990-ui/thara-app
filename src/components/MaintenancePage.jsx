import { BASE } from '../utils/constants';
export default function MaintenancePage() {
  return (
    <div className="maintenance-page">
      <img src={`${BASE}newicon.jpg`} alt="" className="maintenance-logo" />
      <div className="maintenance-icon">🔧</div>
      <h1>الموقع قيد الصيانة</h1>
      <p>نعمل على تحسين تجربتك. سنعود قريباً!</p>
    </div>
  );
}
