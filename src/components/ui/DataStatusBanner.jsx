import { useAppData } from '../../context/AppDataContext';

const baseStyle = {
  padding: '10px 16px',
  fontSize: 14,
  textAlign: 'center',
  borderBottom: '1px solid var(--border)'
};

/**
 * Avisa si la app no está conectada a la base de datos, si está cargando
 * o si Supabase devolvió un error (proyecto pausado, credenciales malas...).
 */
export default function DataStatusBanner() {
  const { dataStatus } = useAppData();

  if (dataStatus.source === 'local') {
    // Solo se muestra en desarrollo para no confundir a la clienta.
    if (!import.meta.env.DEV) return null;
    return (
      <div style={{ ...baseStyle, background: 'var(--warning-soft)', color: '#92400e' }}>
        Modo local: sin credenciales de Supabase en <code>.env.local</code>, los datos se guardan solo en este navegador.
      </div>
    );
  }

  if (dataStatus.error) {
    return (
      <div role="alert" style={{ ...baseStyle, background: 'var(--danger-soft)', color: 'var(--danger)' }}>
        No se pudo conectar con la base de datos: {dataStatus.error.message}{' '}
        <button className="btn btn-sm btn-outline" onClick={dataStatus.retry} style={{ marginLeft: 8 }}>
          Reintentar
        </button>
      </div>
    );
  }

  if (dataStatus.isLoading) {
    return (
      <div aria-live="polite" style={{ ...baseStyle, background: 'var(--info-soft)', color: 'var(--info)' }}>
        Cargando datos del vivero...
      </div>
    );
  }

  return null;
}
