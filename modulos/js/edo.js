// Módulo 5: EDO para reservas de combustible.
// Modelo: R'(t) = tasa_entrada(t) - tasa_consumo(t).

const $ = (id) => document.getElementById(id);
let edoChart = null;

const descriptions = {
  euler: `<p><strong>Euler explícito.</strong> Avanza con la pendiente al inicio del intervalo: R(t+h)=R(t)+h f(t,R). Es simple y didáctico, pero puede acumular error si el paso h es grande.</p>`,
  heun: `<p><strong>Heun.</strong> Calcula una predicción tipo Euler y luego corrige usando el promedio entre la pendiente inicial y la pendiente al final del intervalo.</p>`,
  rk4: `<p><strong>RK4.</strong> Usa cuatro pendientes ponderadas dentro de cada paso. Suele ser el método más estable y preciso de los tres para simulaciones suaves.</p>`
};

function readParams() {
  const r0 = Number($("r0").value);
  const entrada = Number($("entrada").value);
  const consumo = Number($("consumo").value);
  const panico = Number($("panico").value);
  const dias = Number($("dias").value);
  const h = Number($("h").value);
  if (![r0, entrada, consumo, panico, dias, h].every(Number.isFinite)) throw new Error("Todos los parámetros deben ser numéricos.");
  if (r0 <= 0 || dias <= 0 || h <= 0) throw new Error("R₀, días y h deben ser mayores que cero.");
  if (entrada < 0 || consumo < 0 || panico < 0) throw new Error("Entrada, consumo y factor de pánico no pueden ser negativos.");
  return { r0, entrada, consumo, panico, dias, h };
}

function rates(params) {
  return {
    entrada: () => params.entrada,
    consumo: () => params.consumo * params.panico
  };
}

function f(params) {
  const r = rates(params);
  return (t, R) => r.entrada(t) - r.consumo(t, R);
}

function step(method, func, t, R, h) {
  if (method === "euler") return R + h * func(t, R);
  if (method === "heun") {
    const k1 = func(t, R);
    const pred = R + h * k1;
    const k2 = func(t + h, pred);
    return R + h * (k1 + k2) / 2;
  }
  const k1 = func(t, R);
  const k2 = func(t + h / 2, R + h * k1 / 2);
  const k3 = func(t + h / 2, R + h * k2 / 2);
  const k4 = func(t + h, R + h * k3);
  return R + h * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
}

function simulate(method, params) {
  const func = f(params);
  const r = rates(params);
  let t = 0;
  let R = params.r0;
  const rows = [{ t, R, entrada: r.entrada(t), consumo: r.consumo(t, R) }];
  const totalSteps = Math.ceil(params.dias / params.h);
  for (let i = 0; i < totalSteps; i++) {
    const hStep = Math.min(params.h, params.dias - t);
    if (hStep <= 1e-12) break;
    const nextR = step(method, func, t, R, hStep);
    t += hStep;
    R = Math.max(0, nextR);
    rows.push({ t, R, entrada: r.entrada(t), consumo: r.consumo(t, R) });
    if (R <= 0) break;
  }
  return rows;
}

function criticalDay(rows, r0) {
  const critical = 0.2 * r0;
  const hit = rows.find(row => row.R <= critical);
  return hit ? hit.t : null;
}

function renderTable(rows) {
  let html = `<thead><tr><th>t (día)</th><th>R(t) litros</th><th>Entrada</th><th>Consumo efectivo</th></tr></thead><tbody>`;
  rows.forEach(row => html += `<tr><td>${fmt(row.t)}</td><td>${fmt(row.R)}</td><td>${fmt(row.entrada)}</td><td>${fmt(row.consumo)}</td></tr>`);
  $("valuesTable").innerHTML = html + `</tbody>`;
}

function chartDatasets(seriesMap, params) {
  const datasets = [];
  const colors = { euler: "#0d6efd", heun: "#198754", rk4: "#6f42c1" };
  const names = { euler: "Euler", heun: "Heun", rk4: "RK4" };
  Object.entries(seriesMap).forEach(([method, rows]) => {
    datasets.push({ label: names[method], data: rows.map(r => ({ x: r.t, y: r.R })), parsing: false, pointRadius: 2, tension: 0.2, borderColor: colors[method], backgroundColor: colors[method] });
  });
  datasets.push({
    label: "Nivel crítico 20% de R₀",
    data: [{ x: 0, y: 0.2 * params.r0 }, { x: params.dias, y: 0.2 * params.r0 }],
    parsing: false,
    pointRadius: 0,
    borderColor: "red",
    backgroundColor: "red",
    borderDash: [8, 6]
  });
  return datasets;
}

function renderChart(seriesMap, params) {
  if (edoChart) edoChart.destroy();
  edoChart = new Chart($("edoChart"), {
    type: "line",
    data: { datasets: chartDatasets(seriesMap, params) },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: "linear", title: { display: true, text: "Tiempo (días)" } }, y: { title: { display: true, text: "Reserva R(t)" }, beginAtZero: true } } }
  });
}

function methodLabel(key) { return { euler: "Euler Explícito", heun: "Heun", rk4: "RK4" }[key]; }

function renderResult(rows, params, method) {
  const hit = criticalDay(rows, params.r0);
  const final = rows.at(-1).R;
  const alert = hit !== null ? `⚠ Nivel crítico alcanzado el día ${fmt(hit)}` : "No se alcanzó el nivel crítico dentro del periodo simulado.";
  const balance = params.entrada - params.consumo * params.panico;
  $("result").innerHTML = `<p class="mb-2"><strong>Método:</strong> ${methodLabel(method)}.</p>
    <p class="mb-2"><strong>Reserva final:</strong> ${fmt(final)} litros.</p>
    <div class="${hit !== null ? "error-box" : "success-box"} mb-3">${alert}</div>
    <p class="mb-0">Interpretación: el balance diario aproximado es ${fmt(balance)} litros/día. Si es negativo, la planta pierde stock cada día y la presión de abastecimiento aumenta; si es positivo, el sistema tiende a recuperarse.</p>`;
}

function runSingle() {
  try {
    $("message").innerHTML = "";
    const params = readParams();
    const method = $("method").value;
    const rows = simulate(method, params);
    renderTable(rows);
    renderChart({ [method]: rows }, params);
    renderResult(rows, params, method);
    $("algorithmText").innerHTML = descriptions[method] + `<p class="mb-0">El modelo usa consumo efectivo = consumo base × factor de pánico. El nivel crítico se fija en 20% de la reserva inicial.</p>`;
    $("message").innerHTML = `<div class="success-box">Simulación completada para ${methodLabel(method)}.</div>`;
  } catch (e) {
    $("message").innerHTML = `<div class="error-box">${e.message}</div>`;
  }
}

function compareMethods() {
  try {
    $("message").innerHTML = "";
    const params = readParams();
    const series = {
      euler: simulate("euler", params),
      heun: simulate("heun", params),
      rk4: simulate("rk4", params)
    };
    const selected = $("method").value;
    renderTable(series[selected]);
    renderChart(series, params);
    renderResult(series[selected], params, selected);
    $("algorithmText").innerHTML = `<p>Comparación simultánea de Euler, Heun y RK4. En este modelo de consumo constante, las curvas pueden coincidir porque la derivada no depende de R ni cambia con t. Si se agregara una tasa variable, RK4 y Heun mostrarían ventaja frente a Euler.</p>`;
    $("message").innerHTML = `<div class="success-box">Comparación generada con las tres curvas en el mismo gráfico.</div>`;
  } catch (e) {
    $("message").innerHTML = `<div class="error-box">${e.message}</div>`;
  }
}

function fmt(v) { return Number(v).toLocaleString("es-BO", { maximumFractionDigits: 4 }); }

$("simulateBtn").addEventListener("click", runSingle);
$("compareBtn").addEventListener("click", compareMethods);
$("method").addEventListener("change", () => { $("algorithmText").innerHTML = descriptions[$("method").value]; });
runSingle();
