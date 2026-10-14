import { useAppData } from '../../context/AppDataContext';
import { CircleCheck, AlertTriangle, X as XIcon } from 'lucide-react';

export default function ToastContainer() {
  const { toasts } = useAppData();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' && <CircleCheck size={16} color="var(--green-primary)" />}
          {t.type === 'error' && <XIcon size={16} color="var(--danger)" />}
          {t.type === 'warning' && <AlertTriangle size={16} color="var(--warning)" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
