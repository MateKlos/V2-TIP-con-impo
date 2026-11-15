import { describe, expect, it } from "vitest";
import { agruparImpuestos } from "../impuestos";
import type { Movimiento } from "../tipos";

function impuesto(id: string, fecha: string, concepto = "IVA"): Movimiento {
  return { id, tipo: "impuesto", concepto, monto: 100, moneda: "ARS", fecha, puntualidad: null };
}

describe("agruparImpuestos", () => {
  it("agrupa los tres vencimientos del 1 al 5 de diciembre", () => {
    const grupos = agruparImpuestos([
      impuesto("a", "2026-12-01", "IVA"),
      impuesto("b", "2026-12-03", "Ingresos Brutos"),
      impuesto("c", "2026-12-05", "IVA"),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]).toMatchObject({ inicio: "2026-12-01", fin: "2026-12-05", distanciaDias: 4 });
    expect(grupos[0].movimientos.map((m) => m.concepto)).toEqual(["IVA", "Ingresos Brutos", "IVA"]);
  });

  it("incluye extremos separados exactamente por 12 días", () => {
    expect(agruparImpuestos([impuesto("a", "2026-12-01"), impuesto("b", "2026-12-13")])).toHaveLength(1);
  });

  it("separa rangos cuyo extremo excede 12 días, aunque haya fechas intermedias", () => {
    const grupos = agruparImpuestos([
      impuesto("a", "2026-12-01"),
      impuesto("b", "2026-12-10"),
      impuesto("c", "2026-12-14"),
    ]);
    expect(grupos.map((g) => [g.inicio, g.fin])).toEqual([
      ["2026-12-01", "2026-12-10"],
      ["2026-12-14", "2026-12-14"],
    ]);
  });

  it("no modifica la lista original y deja impuestos aislados como eventos individuales", () => {
    const entrada = [impuesto("b", "2026-12-20"), impuesto("a", "2026-12-01")];
    const grupos = agruparImpuestos(entrada);
    expect(entrada[0].id).toBe("b");
    expect(grupos).toHaveLength(2);
  });
});
