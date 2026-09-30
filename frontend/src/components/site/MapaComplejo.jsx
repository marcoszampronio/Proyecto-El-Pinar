// Mapa ilustrado del complejo (Cancha 1 / Cancha 2, ya con el texto en la
// propia imagen). Se muestra debajo del texto de "Abrimos martes,
// miércoles y jueves...", tanto en mobile como en desktop.

export default function MapaComplejo() {
  return (
    <div className="mapa-complejo">
      <img src="/mapa-complejo.webp" alt="Mapa del complejo: Cancha 1 y Cancha 2, con la cancha de pádel y la cantina" loading="lazy" />
    </div>
  );
}
