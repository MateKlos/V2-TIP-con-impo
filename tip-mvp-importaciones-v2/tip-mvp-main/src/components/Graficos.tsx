"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { fechaCorta, sumarDias, diasEntre } from "@/lib/tesoreria/fechas";
import { fmtARS, fmtMillones } from "@/lib/tesoreria/formato";
import { agruparImpuestos } from "@/lib/tesoreria/impuestos";
import type { Movimiento } from "@/lib/tesoreria/tipos";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const VIOLETA = "#5449DD";
const APAGADO = "#7A7398";

const etiquetas = (hoy: string, n: number) => Array.from({ length: n }, (_, t) => fechaCorta(sumarDias(hoy, t)));

function opciones(filtrarTooltip?: (i: number) => boolean): ChartOptions<"line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: filtrarTooltip ? (i) => filtrarTooltip(i.datasetIndex) : undefined,
        callbacks: { label: (c) => `${c.dataset.label}: ${fmtARS(c.parsed.y ?? 0)}` },
      },
    },
    scales: {
      x: { ticks: { maxTicksLimit: 8, color: APAGADO, maxRotation: 0 }, grid: { display: false } },
      y: { ticks: { color: APAGADO, callback: (v) => fmtMillones(Number(v)), maxTicksLimit: 6 }, grid: { color: "#ECE8F6" } },
    },
  };
}

/** Dibuja rangos fiscales directamente sobre el área del gráfico de flujo de caja. */
function pluginRangosImpuestos(grupos: { desde: number; hasta: number; intermedios: number[] }[]): Plugin<"line"> {
  let indiceActivo: number | null = null;

  return {
    id: "rangosImpuestos",
    beforeDatasetsDraw(chart) {
      const area = chart.chartArea;
      const escala = chart.scales.x;
      if (!area || !escala) return;
      const ctx = chart.ctx;
      ctx.save();
      for (const grupo of grupos) {
        if (grupo.hasta <= grupo.desde) continue;
        const x1 = escala.getPixelForValue(grupo.desde);
        const x2 = escala.getPixelForValue(grupo.hasta);
        ctx.fillStyle = "rgba(84,73,221,.09)";
        ctx.fillRect(x1, area.top, x2 - x1, area.bottom - area.top);
      }
      ctx.restore();
    },
    afterDatasetsDraw(chart) {
      const area = chart.chartArea;
      const escala = chart.scales.x;
      if (!area || !escala) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = VIOLETA;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      for (const grupo of grupos) {
        if (grupo.hasta <= grupo.desde) continue;
        for (const indice of [grupo.desde, grupo.hasta]) {
          const x = escala.getPixelForValue(indice);
          ctx.beginPath();
          ctx.moveTo(x, area.top);
          ctx.lineTo(x, area.bottom);
          ctx.stroke();
        }
        if (indiceActivo !== null && grupo.intermedios.includes(indiceActivo)) {
          const x = escala.getPixelForValue(indiceActivo);
          ctx.strokeStyle = "#3B2FC9";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, area.top);
          ctx.lineTo(x, area.bottom);
          ctx.stroke();
          ctx.strokeStyle = VIOLETA;
          ctx.lineWidth = 1.5;
        }
      }
      ctx.restore();
    },
    // El hover se actualiza desde options.onHover, más abajo.
    afterEvent(chart, args) {
      const active = chart.getActiveElements();
      const next = active.length ? active[0].index : null;
      if (next !== indiceActivo) {
        indiceActivo = next;
        args.changed = true;
      }
    },
  };
}

/** Saldo proyectado; la zona por debajo de cero se pinta de rojo. */
export function GraficoProyeccion({
  hoy,
  saldos,
  impuestos = [],
}: {
  hoy: string;
  saldos: number[];
  impuestos?: Movimiento[];
}) {
  const grupos = agruparImpuestos(impuestos)
    .map((grupo) => ({
      desde: diasEntre(hoy, grupo.inicio),
      hasta: diasEntre(hoy, grupo.fin),
      intermedios: grupo.movimientos.slice(1, -1).map((m) => diasEntre(hoy, m.fecha)),
    }))
    .filter((grupo) => grupo.desde >= 0 && grupo.hasta < saldos.length && grupo.hasta > grupo.desde);
  const plugins = [pluginRangosImpuestos(grupos)];

  return (
    <div className="relative h-64 sm:h-80" role="img" aria-label="Gráfico del saldo proyectado a 90 días con rangos de vencimientos impositivos">
      <Line
        data={{
          labels: etiquetas(hoy, saldos.length),
          datasets: [
            {
              label: "Saldo proyectado",
              data: saldos,
              borderColor: VIOLETA,
              fill: { target: { value: 0 }, above: "rgba(84,73,221,.10)", below: "rgba(214,69,69,.25)" },
              tension: 0.2,
              pointRadius: 0,
              borderWidth: 2.5,
            },
          ],
        }}
        options={opciones()}
        plugins={plugins}
      />
    </div>
  );
}

/** Escenario contra la base, con la banda p10–p90 de la simulación. */
export function GraficoEscenario({
  hoy,
  base,
  escenario,
  p10,
  p90,
}: {
  hoy: string;
  base: number[];
  escenario: number[];
  p10: number[];
  p90: number[];
}) {
  return (
    <div className="relative h-64 sm:h-80" role="img" aria-label="Gráfico del escenario contra la proyección base">
      <Line
        data={{
          labels: etiquetas(hoy, base.length),
          datasets: [
            { label: "Simulaciones (90%)", data: p90, borderWidth: 0, pointRadius: 0, backgroundColor: "rgba(84,73,221,.13)", fill: "+1" },
            { label: "Simulaciones (10%)", data: p10, borderWidth: 0, pointRadius: 0 },
            { label: "Base", data: base, borderColor: "#A79EF0", borderDash: [5, 4], pointRadius: 0, borderWidth: 2 },
            {
              label: "Escenario",
              data: escenario,
              borderColor: "#3B2FC9",
              pointRadius: 0,
              borderWidth: 2.5,
              fill: { target: { value: 0 }, above: "rgba(0,0,0,0)", below: "rgba(214,69,69,.22)" },
            },
          ],
        }}
        options={opciones((i) => i > 1)}
      />
    </div>
  );
}
