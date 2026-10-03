// Foto de la cancha 2 (la misma de "El complejo"), debajo del texto de
// "Reservá online". Solo se ve en celular (ver .foto-cancha-movil en
// styles.css): en compu ya está la tarjeta de foto de CanchaLado, no hace
// falta repetir. El mapa con Cancha 1 / Cancha 2 ahora vive en el modal de
// "Solicitar turno" (MapaCanchaElegida).
export default function FotoCanchaMovil() {
  return (
    <div className="foto-cancha-movil">
      <img
        src="/canchas/futbol-2.jpg"
        alt="Cancha de fútbol 11 de césped natural con iluminación en Complejo El Pinar, Paraná"
        loading="lazy"
      />
    </div>
  );
}
