import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Icono } from '../componentes/Icono';
import { MensajeError } from '../componentes/MensajeError';
import { LARGO_MAXIMO_NOMBRE, puedeOcultar, TEXTO_MINIMO_VISIBLES, validarNombreCategoria } from '../dominio/categorias';
import type { Categoria } from '../dominio/tipos';

type Props = {
  categorias: Categoria[];
  editandoId: string | null;
  alEditar: (id: string | null) => void;
  alGuardarNombre: (categoria: Categoria, nombre: string) => void;
  alCambiarVisible: (categoria: Categoria) => void;
};

function FormularioNombre({
  categoria,
  categorias,
  alGuardar,
  alCancelar,
}: {
  categoria: Categoria;
  categorias: Categoria[];
  alGuardar: (nombre: string) => void;
  alCancelar: () => void;
}) {
  const id = useId();
  const [texto, setTexto] = useState(categoria.nombre);
  const [error, setError] = useState<string | undefined>();
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campo.current?.focus();
    campo.current?.select();
  }, []);

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = validarNombreCategoria(texto, categorias, categoria.id);
    setError(resultado.error);
    if (resultado.error) return campo.current?.focus();
    alGuardar(resultado.nombre);
  };

  return (
    <form className="categoria__formulario" onSubmit={enviar} noValidate aria-label={`Cambiar nombre de ${categoria.nombre}`}>
      <div className="campo-grupo">
        <label htmlFor={`${id}-nombre`}>Nombre nuevo</label>
        <input
          ref={campo}
          id={`${id}-nombre`}
          className="campo campo--texto"
          type="text"
          autoComplete="off"
          maxLength={LARGO_MAXIMO_NOMBRE}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') alCancelar();
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && <MensajeError id={`${id}-error`} texto={error} />}
      </div>
      <div className="acciones">
        <button type="submit" className="boton-principal">
          Guardar
        </button>
        <button type="button" className="boton-secundario" onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Cambiar el nombre y ocultar o mostrar cada categoría (AJU-1). */
export function SeccionCategorias({ categorias, editandoId, alEditar, alGuardarNombre, alCambiarVisible }: Props) {
  const sePuedeOcultar = puedeOcultar(categorias);
  const idMinimo = useId();

  return (
    <section className="caja seccion-ajustes" aria-labelledby="titulo-categorias">
      <div className="panel__titulo">
        <h2 id="titulo-categorias" className="subtitulo">
          Categorías
        </h2>
        <div className="ayuda">Las categorías ocultas no aparecen al anotar un gasto, pero sus gastos se conservan.</div>
      </div>
      {!sePuedeOcultar && (
        <div id={idMinimo} className="nota">
          <Icono nombre="alerta" />
          <span>{TEXTO_MINIMO_VISIBLES}</span>
        </div>
      )}
      <ul className="lista-categorias">
        {categorias.map((c) => (
          <li key={c.id} className="categoria">
            {editandoId === c.id ? (
              <FormularioNombre
                categoria={c}
                categorias={categorias}
                alGuardar={(nombre) => alGuardarNombre(c, nombre)}
                alCancelar={() => alEditar(null)}
              />
            ) : (
              <>
                <Icono nombre={c.icono} />
                <div className="categoria__nombre">
                  <span className={c.visible ? 'categoria__titulo' : 'categoria__titulo categoria__titulo--oculta'}>{c.nombre}</span>
                  <span className="estado">{c.visible ? 'Visible' : 'Oculta'}</span>
                </div>
                <div className="categoria__acciones">
                  <button
                    type="button"
                    className="boton-enlace"
                    data-categoria={c.id}
                    aria-label={`Cambiar nombre de ${c.nombre}`}
                    onClick={() => alEditar(c.id)}
                  >
                    Cambiar nombre
                  </button>
                  <button
                    type="button"
                    className="boton-enlace"
                    aria-label={`${c.visible ? 'Ocultar' : 'Mostrar'} ${c.nombre}`}
                    disabled={c.visible && !sePuedeOcultar}
                    aria-describedby={c.visible && !sePuedeOcultar ? idMinimo : undefined}
                    onClick={() => alCambiarVisible(c)}
                  >
                    {c.visible ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
