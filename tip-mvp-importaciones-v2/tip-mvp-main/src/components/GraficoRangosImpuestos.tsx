"use client";

import { useMemo, useState } from "react";
import type { Movimiento } from "@/lib/tesoreria/tipos";
import { agruparImpuestos } from "@/lib/tesoreria/impuestos";
import { fechaCorta } from "@/lib/tesoreria/fechas";
import { fmtMonto } from "@/lib/tesoreria/formato";

function rango(inicio: string, fin: string) {
  return inicio === fin ? fechaCorta(inicio) : `${fechaCorta(inicio)} al ${fechaCorta(fin)}`;
}

export function GraficoRangosImpuestos({ movimientos }: { movimientos: Movimiento[] }) {
  const grupos = useMemo(() => agruparImpuestos(movimientos), [movimientos]);
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <section className="tax-card" aria-label="Rangos de vencimientos de impuestos">
      <div className="tax-heading">
        <div><span className="tax-eyebrow">PLANIFICACIÓN FISCAL</span><h2>Vencimientos de impuestos</h2></div>
        <span className="tax-count">{grupos.reduce((n, g) => n + g.movimientos.length, 0)} vencimientos</span>
      </div>
      <p className="tax-description">Los vencimientos separados por hasta 12 días se presentan como un mismo período. El sombreado permanece visible; seleccioná cada marca para consultar su detalle.</p>
      {grupos.length === 0 ? <p className="tax-empty">Todavía no hay impuestos registrados en la proyección.</p> : (
        <div className="tax-groups">
          {grupos.map((grupo) => {
            const base = new Date(`${grupo.inicio}T12:00:00Z`).getTime();
            const span = Math.max(grupo.distanciaDias, 1);
            const x = (fecha: string) => 58 + ((new Date(`${fecha}T12:00:00Z`).getTime() - base) / 86400000 / span) * 584;
            const agrupado = grupo.movimientos.length > 1;
            return (
              <article className="tax-period" key={grupo.movimientos.map((m) => m.id).join(":")}>
                <div className="tax-period-head">
                  <strong>Impuestos · {rango(grupo.inicio, grupo.fin)}</strong>
                  <span>{grupo.movimientos.length} {grupo.movimientos.length === 1 ? "impuesto" : "impuestos"}</span>
                </div>
                <div className="tax-svg-wrap">
                  <svg viewBox="0 0 700 164" role="group" aria-label={`Impuestos del ${rango(grupo.inicio, grupo.fin)}`}>
                    {agrupado && <>
                      <rect x="58" y="44" width="584" height="86" rx="8" fill="#6476a8" fillOpacity=".11" />
                      <line x1="58" x2="58" y1="30" y2="134" stroke="#66799d" strokeWidth="2" strokeDasharray="5 5" />
                      <line x1="642" x2="642" y1="30" y2="134" stroke="#66799d" strokeWidth="2" strokeDasharray="5 5" />
                      <text x="58" y="20" textAnchor="middle" className="tax-svg-date">{fechaCorta(grupo.inicio)}</text>
                      <text x="642" y="20" textAnchor="middle" className="tax-svg-date">{fechaCorta(grupo.fin)}</text>
                    </>}
                    {grupo.movimientos.map((m, i) => {
                      const px = agrupado ? x(m.fecha) : 350;
                      const extremo = i === 0 || i === grupo.movimientos.length - 1;
                      const activo = hoverId === m.id;
                      const tooltipX = Math.max(4, Math.min(px - 105, 486));
                      const tooltipCenter = tooltipX + 105;
                      const nombre = m.concepto.length > 24 ? `${m.concepto.slice(0, 23)}…` : m.concepto;
                      return <g key={m.id} className="tax-event" tabIndex={0} role="button"
                        aria-label={`${m.concepto}, ${fechaCorta(m.fecha)}, ${fmtMonto(m.monto, m.moneda)}`}
                        onMouseEnter={() => setHoverId(m.id)} onMouseLeave={() => setHoverId(null)}
                        onFocus={() => setHoverId(m.id)} onBlur={() => setHoverId(null)}>
                        {!extremo && activo && <line x1={px} x2={px} y1="44" y2="134" stroke="#263f68" strokeWidth="2.5" strokeDasharray="4 4" />}
                        <circle cx={px} cy={extremo && agrupado ? 44 : 68} r={activo ? 7 : 5} fill={activo ? "#263f68" : "#657b9e"} stroke="white" strokeWidth="2" />
                        {activo && <g className="tax-svg-tooltip" pointerEvents="none">
                          <rect x={tooltipX} y="94" width="210" height="38" rx="6" fill="#172b49" />
                          <text x={tooltipCenter} y="109" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">{nombre} · {fechaCorta(m.fecha)}</text>
                          <text x={tooltipCenter} y="123" textAnchor="middle" fill="#dbe5f2" fontSize="10">{fmtMonto(m.monto, m.moneda)}</text>
                        </g>}
                      </g>;
                    })}
                  </svg>
                </div>
                {agrupado && <p className="tax-range-caption">Rango agrupado · {grupo.distanciaDias} días entre extremos · máximo: 12 días</p>}
              </article>
            );
          })}
        </div>
      )}
      <p className="tax-footnote">La agrupación se recalcula al agregar, editar o eliminar movimientos. Los impuestos originales permanecen guardados individualmente.</p>
    </section>
  );
}
