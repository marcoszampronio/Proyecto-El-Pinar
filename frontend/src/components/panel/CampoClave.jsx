import { useState } from 'react';

// Campo de contraseña con un ojito: al tocarlo se ve lo que se escribe y se queda visible hasta que se vuelva a tocar.
// Se usa solo, o compartido entre varios campos pasando `mostrar` y `onMostrar` (ej.: "contraseña" y "repetila").
export default function CampoClave({ value, onChange, autoComplete, required, minLength, mostrar, onMostrar }) {
  const [propio, setPropio] = useState(false);
  const visible = mostrar ?? propio;
  const alternar = () => (onMostrar ? onMostrar(!visible) : setPropio(!visible));
  const etiqueta = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';

  return (
    <div className="clave-campo">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        className={`clave-ojo${visible ? ' activo' : ''}`}
        onClick={alternar}
        onMouseDown={(e) => e.preventDefault()} // no le saca el foco al campo (en el celular, no cierra el teclado)
        aria-pressed={visible}
        aria-label={etiqueta}
        title={etiqueta}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.7A17.3 17.3 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 4.2-.9" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            <path d="M3 3l18 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
