// Mapa ilustrado del complejo (Cancha 1 / Cancha 2, con el texto ya dibujado
// dentro de la imagen). Se muestra debajo del panel de reserva, solo en
// celular (ver .mapa-complejo en styles.css) — en compu ya está la tarjeta
// de foto de CanchaLado, no hace falta repetir.
export default function MapaComplejo() {
  return (
    <div className="mapa-complejo">
      <img
        src="/mapa-complejo.webp"
        alt="Mapa ilustrado del complejo con la ubicación de Cancha 1 y Cancha 2"
        loading="lazy"
      />
    </div>
  );
}
