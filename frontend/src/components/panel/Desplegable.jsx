// Bloque que se abre y se cierra tocándolo. Cerrado muestra el título y un resumen corto; abierto, el contenido.
// Mismo estilo que "Movimientos" y "Reporte en Excel". `anidado`: va dentro de otro desplegable (sin tarjeta propia).
export default function Desplegable({ titulo, resumen = null, anidado = false, className = '', innerRef, children }) {
  return (
    <details className={`${anidado ? 'sub-desplegable' : 'stat-card estado-sistema'} ${className}`.trim()} ref={innerRef}>
      <summary>
        <span className="resumen-bloque">
          <b>{titulo}</b>
          {resumen && <small>{resumen}</small>}
        </span>
      </summary>
      {children}
    </details>
  );
}
