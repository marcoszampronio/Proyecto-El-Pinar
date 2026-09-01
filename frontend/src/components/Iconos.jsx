export function IconoMenu({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

export function IconoLupa({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function CanchaFutbol({ activa = false }) {
  const cesped = activa ? '#2E7D32' : '#5FA845';
  const linea = '#FFFFFF';
  return (
    <svg viewBox="0 0 100 150" aria-hidden="true">
      <rect x="2" y="2" width="96" height="146" rx="6" fill={cesped} stroke={activa ? '#1B5E20' : '#4C9138'} strokeWidth="3" />
      <line x1="2" y1="75" x2="98" y2="75" stroke={linea} strokeWidth="2" />
      <circle cx="50" cy="75" r="16" fill="none" stroke={linea} strokeWidth="2" />
      <circle cx="50" cy="75" r="2.5" fill={linea} />
      <rect x="25" y="2" width="50" height="26" fill="none" stroke={linea} strokeWidth="2" />
      <rect x="38" y="2" width="24" height="12" fill="none" stroke={linea} strokeWidth="2" />
      <rect x="25" y="122" width="50" height="26" fill="none" stroke={linea} strokeWidth="2" />
      <rect x="38" y="136" width="24" height="12" fill="none" stroke={linea} strokeWidth="2" />
    </svg>
  );
}

export function CanchaPadel() {
  return (
    <svg viewBox="0 0 100 150" aria-hidden="true">
      <rect width="100" height="150" fill="#7AC74F" />
      <rect x="15" y="15" width="70" height="120" fill="#2D68C4" stroke="white" strokeWidth="2" />
      <line x1="12" y1="75" x2="88" y2="75" stroke="#111" strokeWidth="3" strokeDasharray="2,2" />
      <line x1="15" y1="45" x2="85" y2="45" stroke="white" strokeWidth="2" />
      <line x1="15" y1="105" x2="85" y2="105" stroke="white" strokeWidth="2" />
      <line x1="50" y1="45" x2="50" y2="105" stroke="white" strokeWidth="2" />
    </svg>
  );
}

export function CanchaParrilla({ activa = false }) {
  const relleno = activa ? '#123C6E' : '#F0E6CE';
  const linea = activa ? '#E4CF9C' : '#123C6E';
  return (
    <svg viewBox="0 0 100 150" aria-hidden="true">
      <rect x="2" y="2" width="96" height="146" rx="6" fill={relleno} stroke={linea} strokeWidth="3" />
      {/* campana de la parrilla */}
      <rect x="24" y="58" width="52" height="34" rx="4" fill="none" stroke={linea} strokeWidth="3" />
      <line x1="30" y1="70" x2="70" y2="70" stroke={linea} strokeWidth="2" />
      <line x1="30" y1="80" x2="70" y2="80" stroke={linea} strokeWidth="2" />
      {/* patas */}
      <line x1="30" y1="92" x2="26" y2="118" stroke={linea} strokeWidth="3" />
      <line x1="70" y1="92" x2="74" y2="118" stroke={linea} strokeWidth="3" />
      {/* humo */}
      <path d="M42 50c0-6 6-6 6-12s-6-6-6-12" fill="none" stroke={linea} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M56 50c0-6 6-6 6-12s-6-6-6-12" fill="none" stroke={linea} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Avatar({ size = 46 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#C09A46" />
      <circle cx="24" cy="19" r="8" fill="#F1DDB4" />
      <path d="M8 44c2-8 8-12 16-12s14 4 16 12z" fill="#123C6E" />
      <path d="M14 13a10 10 0 0120 0z" fill="#123C6E" />
    </svg>
  );
}

export function IconoWhatsapp({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.16 0 4.19.84 5.72 2.37a8.04 8.04 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09a8.1 8.1 0 0 1-4.12-1.13l-.3-.18-3.12.82.83-3.04-.19-.31a8.04 8.04 0 0 1-1.24-4.34c0-4.46 3.63-8.09 8.09-8.09Zm-3.6 4.32c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.6.13.17 1.76 2.8 4.35 3.83 2.16.85 2.6.68 3.07.64.47-.04 1.52-.62 1.73-1.22.21-.6.21-1.12.15-1.22-.06-.11-.23-.17-.48-.29-.25-.13-1.52-.75-1.75-.83-.23-.09-.4-.13-.57.12-.17.25-.65.83-.8 1-.15.17-.29.19-.54.06-.25-.13-1.07-.39-2.03-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.38.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.09-.17.04-.31-.02-.44-.06-.13-.57-1.38-.79-1.88-.19-.44-.39-.42-.54-.43h-.46Z"/>
    </svg>
  );
}

export function IconoContacto({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <circle cx="12" cy="10" r="2.6" />
      <path d="M8 17c1-2 2.4-3 4-3s3 1 4 3M4 8h2M4 12h2M4 16h2" />
    </svg>
  );
}
