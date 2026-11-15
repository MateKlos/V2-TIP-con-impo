import type { Movimiento } from "./tipos";
import { diasEntre } from "./fechas";

export const MAX_DIAS_RANGO_IMPUESTOS = 12;

export interface GrupoImpuestos {
  inicio: string;
  fin: string;
  movimientos: Movimiento[];
  /** Cantidad de días entre el primer y el último vencimiento. */
  distanciaDias: number;
}

/**
 * Agrupa impuestos por proximidad, midiendo siempre desde el primer vencimiento
 * del grupo. Así el rango completo nunca supera 12 días (no hay encadenamiento
 * accidental de grupos más largos).
 */
export function agruparImpuestos(movimientos: Movimiento[]): GrupoImpuestos[] {
  const impuestos = movimientos
    .filter((m) => m.tipo === "impuesto")
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));

  const grupos: GrupoImpuestos[] = [];
  let actual: Movimiento[] = [];

  for (const impuesto of impuestos) {
    if (actual.length === 0) {
      actual = [impuesto];
      continue;
    }

    const inicio = actual[0].fecha;
    if (diasEntre(inicio, impuesto.fecha) <= MAX_DIAS_RANGO_IMPUESTOS) {
      actual.push(impuesto);
    } else {
      grupos.push(crearGrupo(actual));
      actual = [impuesto];
    }
  }

  if (actual.length) grupos.push(crearGrupo(actual));
  return grupos;
}

function crearGrupo(movimientos: Movimiento[]): GrupoImpuestos {
  return {
    inicio: movimientos[0].fecha,
    fin: movimientos[movimientos.length - 1].fecha,
    movimientos,
    distanciaDias: diasEntre(movimientos[0].fecha, movimientos[movimientos.length - 1].fecha),
  };
}
