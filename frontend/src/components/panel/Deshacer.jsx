import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Avisos con "Deshacer" para el panel.
//
// El servidor no tiene un "volver atrás", así que la acción se RETRASA unos segundos:
// la pantalla ya la muestra hecha, aparece el aviso con la cuenta regresiva y recién
// cuando termina se manda al servidor. Si se toca "Deshacer", nunca llegó a pasar nada.
//
// Para que nada se pierda, lo pendiente se manda enseguida si:
//   · se cambia de pestaña del panel (confirmarTodo)
//   · la pantalla pasa a segundo plano o se cierra (ej.: se abre WhatsApp)
const DeshacerCtx = createContext(null);

export function useDeshacer() {
  const ctx = useContext(DeshacerCtx);
  if (!ctx) throw new Error('useDeshacer va dentro de <DeshacerProvider>');
  return ctx;
}

export function DeshacerProvider({ children }) {
  const [avisos, setAvisos] = useState([]); // { id, mensaje, tipo: 'espera' | 'error', ms }
  const pendientes = useRef(new Map()); // id -> { ejecutar, alConfirmar, alDeshacer, alFallar, errorTexto, timer }
  const secuencia = useRef(0);

  const sacarAviso = useCallback((id) => setAvisos((a) => a.filter((x) => x.id !== id)), []);

  const confirmar = useCallback(async (id) => {
    const it = pendientes.current.get(id);
    if (!it) return;
    clearTimeout(it.timer);
    pendientes.current.delete(id);
    sacarAviso(id);
    try {
      const r = await it.ejecutar();
      it.alConfirmar?.(r);
    } catch (e) {
      it.alFallar?.(e);
      const eid = ++secuencia.current;
      setAvisos((a) => [...a, { id: eid, mensaje: `${it.errorTexto || 'No se pudo completar'}: ${e.message}`, tipo: 'error', ms: 8000 }]);
      setTimeout(() => sacarAviso(eid), 8000);
    }
  }, [sacarAviso]);

  const programar = useCallback(({ mensaje, ejecutar, alConfirmar, alDeshacer, alFallar, errorTexto, ms = 6000 }) => {
    const id = ++secuencia.current;
    const timer = setTimeout(() => confirmar(id), ms);
    pendientes.current.set(id, { ejecutar, alConfirmar, alDeshacer, alFallar, errorTexto, timer });
    setAvisos((a) => [...a, { id, mensaje, tipo: 'espera', ms }]);
    return id;
  }, [confirmar]);

  const deshacer = useCallback((id) => {
    const it = pendientes.current.get(id);
    if (!it) return;
    clearTimeout(it.timer);
    pendientes.current.delete(id);
    sacarAviso(id);
    it.alDeshacer?.();
  }, [sacarAviso]);

  const confirmarTodo = useCallback(
    () => Promise.all([...pendientes.current.keys()].map((id) => confirmar(id))),
    [confirmar]
  );

  useEffect(() => {
    const alOcultar = () => { if (document.visibilityState === 'hidden') confirmarTodo(); };
    document.addEventListener('visibilitychange', alOcultar);
    window.addEventListener('pagehide', confirmarTodo);
    return () => {
      document.removeEventListener('visibilitychange', alOcultar);
      window.removeEventListener('pagehide', confirmarTodo);
      confirmarTodo(); // si el panel se desmonta (cerrar sesión), no queda nada colgado
    };
  }, [confirmarTodo]);

  const valor = useMemo(() => ({ programar, deshacer, confirmarTodo }), [programar, deshacer, confirmarTodo]);

  return (
    <DeshacerCtx.Provider value={valor}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso aviso--${a.tipo}`}>
            <span className="aviso-txt">{a.mensaje}</span>
            {a.tipo === 'espera' ? (
              <button type="button" className="aviso-btn" onClick={() => deshacer(a.id)}>Deshacer</button>
            ) : (
              <button type="button" className="aviso-btn" onClick={() => sacarAviso(a.id)}>Cerrar</button>
            )}
            {a.tipo === 'espera' && <i className="aviso-barra" style={{ animationDuration: `${a.ms}ms` }} aria-hidden="true" />}
          </div>
        ))}
      </div>
    </DeshacerCtx.Provider>
  );
}
