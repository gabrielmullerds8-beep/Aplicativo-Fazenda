const STORAGE_KEY = "central-safras-data";
const ACCESS_STORAGE_KEY = "central-safras-access-ok";
const ACCESS_KEY = "FAZENDA";
const ACCESS_PASSWORD = "fazenda123";
const crops = ["Milho", "Trigo", "Soja", "Aveia"];
const defaultData = { harvests: [], billings: [], contracts: [], storageReturns: [], cropPlans: [] };

let data = structuredClone(defaultData);
let editingHarvestId = null;
let editingBillingId = null;
let editingContractId = null;
let editingCropPlanId = null;
let supabaseClient = null;
let useCloud = false;
let realtimeChannel = null;
let cloudRefreshTimer = null;

const titles = {
  dashboard: ["Painel", "Visao geral das safras, saldos e faturamento."],
  safras: ["Safras", "Cadastre culturas, vigencias e area produzida."],
  colheitas: ["Colheitas", "Registre e acompanhe suas colheitas."],
  contratos: ["Contratos", "Cadastre e acompanhe contratos de venda."],
  faturamento: ["Faturamento", "Gerencie seus faturamentos e notas fiscais."],
  fretes: ["Fretes", "Acompanhe fretes de colheitas e faturamentos."],
  "retorno-armazenagem": ["Retorno de Armazenagem", "Controle retornos e saldos armazenados por safra."],
  recebimentos: ["Recebimentos", "Conta corrente dos vencimentos dos contratos."]
};

const harvestNumericFields = [
  "grossWeight",
  "impurityDiscount",
  "impurityWeight",
  "humidityDiscount",
  "humidityWeight",
  "discountTotal",
  "netWeight",
  "harvestFreightPerTon",
  "harvestFreightValue"
];

const billingNumericFields = [
  "exitWeight",
  "pricePerKg",
  "totalValue",
  "funruralRate",
  "funrural",
  "netInvoice",
  "bags",
  "freightPerTon",
  "totalFreight",
  "portUnloadWeight",
  "weightDifference"
];

const contractNumericFields = [
  "bagsContracted",
  "kgContracted",
  "pricePerKg",
  "grossValue",
  "funruralRate",
  "funrural",
  "netValue",
  "commission",
  "commissionValue",
  "royalties",
  "royaltiesValue",
  "totalNetValue"
];

const storageReturnNumericFields = ["weightKg", "bags"];
const cropPlanNumericFields = ["hectares"];

let dashboardFilters = {
  crop: "all",
  season: "all",
  type: "all",
  contract: "all"
};

let freightFilters = {
  source: "harvests",
  transporter: "all",
  status: "all",
  crop: "all",
  season: "all"
};

let storageFilters = {
  crop: "all",
  season: "all"
};

let receiptFilters = {
  crop: "all",
  season: "all"
};

let harvestSummaryFilters = {
  crop: "all",
  season: "all"
};

function localData() {
  try {
    return { ...defaultData, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return structuredClone(defaultData);
  }
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function setStatus(message) {
  const status = document.getElementById("sync-status");
  if (status) status.textContent = message;
}

function setAuthMessage(message, type = "info") {
  const element = document.getElementById("auth-message");
  if (!element) return;
  element.textContent = message;
  element.dataset.type = type;
}

function hasSavedAccess() {
  return localStorage.getItem(ACCESS_STORAGE_KEY) === "true";
}

function saveAccess() {
  localStorage.setItem(ACCESS_STORAGE_KEY, "true");
}

function clearAccess() {
  localStorage.removeItem(ACCESS_STORAGE_KEY);
}

function showLogin(message = "Use os dados de acesso informados pelo administrador.", type = "info") {
  document.body.classList.add("auth-pending");
  document.body.classList.remove("auth-ready");
  setAuthMessage(message, type);
}

function showApp() {
  document.body.classList.remove("auth-pending");
  document.body.classList.add("auth-ready");
  const userEmail = document.getElementById("user-email");
  if (userEmail) userEmail.textContent = "Acesso liberado";
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function kg(value) {
  return `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
}

function number(value, digits = 2) {
  return Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

function shortDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year.slice(-2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function numericRecord(record, fields) {
  fields.forEach((field) => {
    record[field] = Number(record[field] || 0);
  });
  return record;
}

function checkboxRecord(record, fields) {
  fields.forEach((field) => {
    record[field] = record[field] === "on" || record[field] === true;
  });
  return record;
}

function rowToRecord(row) {
  return {
    id: row.id,
    ...(row.payload || {}),
    createdAt: row.payload?.createdAt || row.created_at,
    updatedAt: row.payload?.updatedAt || row.updated_at
  };
}

function isSupabaseConfigured() {
  const config = window.APP_CONFIG || {};
  return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase);
}

async function initStore() {
  if (isSupabaseConfigured()) {
    const config = window.APP_CONFIG;
    supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    useCloud = true;
  }

  if (!hasSavedAccess()) {
    showLogin();
    setStatus("Aguardando acesso.");
    render();
    return;
  }

  await loadDataAfterAccess();
}

async function loadDataAfterAccess() {
  showApp();

  if (!useCloud) {
    data = localData();
    setStatus("Modo local: preencha config.js para sincronizar online.");
    render();
    return;
  }

  setStatus("Carregando dados...");
  await fetchCloudData();
  subscribeRealtime();
  setStatus("Online: dados sincronizados pelo Supabase.");
}

async function fetchCloudData() {
  const [harvestsResult, billingsResult, contractsResult, storageReturnsResult, cropPlansResult] = await Promise.all([
    supabaseClient.from("harvests").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("billings").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("contracts").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("storage_returns").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("crop_plans").select("*").order("created_at", { ascending: false })
  ]);

  if (harvestsResult.error || billingsResult.error || contractsResult.error || storageReturnsResult.error || cropPlansResult.error) {
    data = structuredClone(defaultData);
    setStatus("Nao foi possivel carregar os dados. Verifique o login e as regras do Supabase.");
    render();
    return;
  }

  data.harvests = harvestsResult.data.map(rowToRecord);
  data.billings = billingsResult.data.map(rowToRecord);
  data.contracts = contractsResult.data.map(rowToRecord);
  data.storageReturns = storageReturnsResult.data.map(rowToRecord);
  data.cropPlans = cropPlansResult.data.map(rowToRecord);
  render();
}

function subscribeRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = supabaseClient
    .channel("central-safras-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "harvests" }, scheduleCloudRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "billings" }, scheduleCloudRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "contracts" }, scheduleCloudRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "storage_returns" }, scheduleCloudRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "crop_plans" }, scheduleCloudRefresh)
    .subscribe();
}

function scheduleCloudRefresh() {
  clearTimeout(cloudRefreshTimer);
  cloudRefreshTimer = setTimeout(fetchCloudData, 250);
}

async function addRecord(collection, record) {
  const payload = { createdAt: new Date().toISOString(), ...record };

  if (useCloud) {
    const { error } = await supabaseClient.from(tableName(collection)).insert({ payload });
    if (error) {
      alert("Nao foi possivel salvar no Supabase.");
      return;
    }
    return;
  }

  data[collection].unshift({ id: crypto.randomUUID(), ...payload });
  saveLocal();
  render();
}

async function updateRecord(collection, id, record) {
  const existing = data[collection].find((item) => item.id === id);
  const payload = { ...existing, ...record, updatedAt: new Date().toISOString() };
  delete payload.id;

  if (useCloud) {
    const { error } = await supabaseClient.from(tableName(collection)).update({ payload }).eq("id", id);
    if (error) alert("Nao foi possivel atualizar no Supabase.");
    return;
  }

  data[collection] = data[collection].map((item) => (item.id === id ? { id, ...payload } : item));
  saveLocal();
  render();
}

async function deleteRecord(collection, id) {
  if (useCloud) {
    const { error } = await supabaseClient.from(tableName(collection)).delete().eq("id", id);
    if (error) alert("Nao foi possivel excluir no Supabase.");
    return;
  }

  data[collection] = data[collection].filter((item) => item.id !== id);
  saveLocal();
  render();
}

function tableName(collection) {
  if (collection === "cropPlans") return "crop_plans";
  return collection === "storageReturns" ? "storage_returns" : collection;
}

function harvestQuantity(item) {
  return Number(item.netWeight || item.quantity || 0);
}

function billingWeight(item) {
  return Number(item.exitWeight || item.billedQuantity || 0);
}

function storageReturnWeight(item) {
  return Number(item.weightKg || 0);
}

function storageReturnBags(item) {
  return Number(item.bags || storageReturnWeight(item) / 60 || 0);
}

function recordSeason(item) {
  if (item.season) return item.season;
  if (!item.date) return "Sem safra";
  return String(item.date).slice(0, 4);
}

function availableCropNames() {
  return [
    ...new Set(
      [
        ...crops,
        ...data.cropPlans.map((item) => item.crop),
        ...data.harvests.map((item) => item.crop),
        ...data.billings.map((item) => item.crop),
        ...data.contracts.map((item) => item.crop),
        ...data.storageReturns.map((item) => item.crop)
      ].filter(Boolean)
    )
  ].sort();
}

function availableSeasonNames() {
  return [
    ...new Set(
      [
        ...data.cropPlans.map(recordSeason),
        ...data.harvests.map(recordSeason),
        ...data.billings.map(recordSeason),
        ...data.contracts.map(recordSeason),
        ...data.storageReturns.map(recordSeason)
      ].filter((season) => season && season !== "Sem safra")
    )
  ].sort().reverse();
}

function transportName(item) {
  return item.transporter || item.identifier || "Sem transportador";
}

function paidStatus(item) {
  return item.freightPaid === true || item.freightPaid === "on";
}

function matchesDashboardFilters(item) {
  const cropMatches = dashboardFilters.crop === "all" || item.crop === dashboardFilters.crop;
  const seasonMatches = dashboardFilters.season === "all" || recordSeason(item) === dashboardFilters.season;
  const contractMatches = dashboardFilters.contract === "all" || item.contractNumber === dashboardFilters.contract;
  return cropMatches && seasonMatches && contractMatches;
}

function latestDashboardSeason() {
  const seasons = availableSeasonNames();
  return seasons[0] || "all";
}

function dashboardHarvests() {
  if (dashboardFilters.contract !== "all") return [];
  return data.harvests.filter(matchesDashboardFilters);
}

function dashboardBillings() {
  return data.billings.filter(matchesDashboardFilters);
}

function dashboardContracts() {
  return data.contracts.filter(matchesDashboardFilters);
}

function emptyRow(colspan, text = "Nenhum registro encontrado.") {
  return `<tr><td class="empty" colspan="${colspan}">${text}</td></tr>`;
}

function renderTable(targetId, rows, colspan) {
  document.getElementById(targetId).innerHTML = rows.length ? rows.join("") : emptyRow(colspan);
}

function aggregateRows(items, keyFn, valueFn) {
  return Object.values(
    items.reduce((acc, item) => {
      const label = keyFn(item) || "Sem informacao";
      if (!acc[label]) acc[label] = { label, value: 0, count: 0 };
      acc[label].value += Number(valueFn(item) || 0);
      acc[label].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);
}

function chartRows(rows, limit = 6) {
  return rows.filter((item) => Number(item.value || 0) !== 0).slice(0, limit);
}

function insightMetric(label, value, detail = "") {
  return `<div class="insight-metric">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
    ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
  </div>`;
}

function insightSummaryCard(title, metrics) {
  return `<article class="insight-card">
    <h3>${escapeHtml(title)}</h3>
    <div class="mini-metrics">${metrics.join("")}</div>
  </article>`;
}

function donutCard(title, rows, formatter) {
  const visible = chartRows(rows, 5);
  const total = visible.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) {
    return `<article class="insight-card chart-card"><h3>${escapeHtml(title)}</h3><p class="empty chart-empty">Sem dados para exibir.</p></article>`;
  }

  const colors = ["#257a55", "#0b2c66", "#d7a52f", "#8a4baf", "#2f8fb8"];
  let cursor = 0;
  const segments = visible
    .map((item, index) => {
      const start = cursor;
      cursor += (Number(item.value || 0) / total) * 100;
      return `${colors[index % colors.length]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    })
    .join(", ");

  return `<article class="insight-card chart-card">
    <h3>${escapeHtml(title)}</h3>
    <div class="donut-wrap">
      <div class="donut-chart" style="background: conic-gradient(${segments});">
        <span>${number(total)}</span>
      </div>
      <div class="donut-legend">
        ${visible
          .map((item, index) => `<span title="${escapeHtml(formatter(item.value))}">
            <i style="background:${colors[index % colors.length]}"></i>
            ${escapeHtml(item.label)} <b>${escapeHtml(formatter(item.value))}</b>
          </span>`)
          .join("")}
      </div>
    </div>
  </article>`;
}

function barCard(title, rows, formatter) {
  const visible = chartRows(rows, 6);
  const max = Math.max(...visible.map((item) => Math.abs(Number(item.value || 0))), 0);
  if (!max) {
    return `<article class="insight-card chart-card"><h3>${escapeHtml(title)}</h3><p class="empty chart-empty">Sem dados para exibir.</p></article>`;
  }

  return `<article class="insight-card chart-card">
    <h3>${escapeHtml(title)}</h3>
    <div class="bar-chart">
      ${visible
        .map((item) => {
          const width = Math.max(3, (Math.abs(Number(item.value || 0)) / max) * 100);
          return `<div class="bar-row" title="${escapeHtml(formatter(item.value))}">
            <div class="bar-label"><span>${escapeHtml(item.label)}</span><b>${escapeHtml(formatter(item.value))}</b></div>
            <div class="bar-track"><span style="width:${width.toFixed(2)}%"></span></div>
          </div>`;
        })
        .join("")}
    </div>
  </article>`;
}

function progressCard(title, current, target, currentLabel, targetLabel) {
  const percent = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
  return `<article class="insight-card">
    <h3>${escapeHtml(title)}</h3>
    <div class="progress-head">
      <strong>${number(percent)}%</strong>
      <span>${escapeHtml(currentLabel)} / ${escapeHtml(targetLabel)}</span>
    </div>
    <div class="progress-track"><span style="width:${percent.toFixed(2)}%"></span></div>
    <div class="progress-values">
      <span>${kg(current)}</span>
      <span>${kg(target)}</span>
    </div>
  </article>`;
}

function groupedBy(items, keyFn, seed) {
  return Object.values(
    items.reduce((acc, item) => {
      const key = keyFn(item) || "Sem informacao";
      if (!acc[key]) acc[key] = seed(key);
      acc[key].count += 1;
      acc[key].netWeight += harvestQuantity(item);
      acc[key].freightValue += Number(item.harvestFreightValue || 0);
      return acc;
    }, {})
  );
}

function matchesHarvestSummaryFilters(item) {
  const cropMatches = harvestSummaryFilters.crop === "all" || item.crop === harvestSummaryFilters.crop;
  const seasonMatches = harvestSummaryFilters.season === "all" || recordSeason(item) === harvestSummaryFilters.season;
  return cropMatches && seasonMatches;
}

function renderHarvestSummaryFilterOptions() {
  const cropSelect = document.getElementById("harvest-summary-crop-filter");
  const seasonSelect = document.getElementById("harvest-summary-season-filter");
  if (!cropSelect || !seasonSelect) return;

  harvestSummaryFilters.crop = setSelectOptions(
    cropSelect,
    [...new Set(data.harvests.map((item) => item.crop).filter(Boolean))].sort(),
    harvestSummaryFilters.crop,
    "Todas"
  );
  harvestSummaryFilters.season = setSelectOptions(
    seasonSelect,
    [...new Set(data.harvests.map(recordSeason).filter(Boolean))].sort().reverse(),
    harvestSummaryFilters.season,
    "Todas"
  );
}

function renderExecutiveInsights(harvests, billings, contracts) {
  const target = document.getElementById("executive-insights");
  if (!target) return;

  const harvested = harvests.reduce((sum, item) => sum + harvestQuantity(item), 0);
  const billed = billings.reduce((sum, item) => sum + billingWeight(item), 0);
  const netInvoice = billings.reduce((sum, item) => sum + Number(item.netInvoice || 0), 0);
  const contracted = contracts.reduce((sum, item) => sum + Number(item.kgContracted || 0), 0);
  const avgNetPrice = billed ? netInvoice / billed : 0;

  target.innerHTML = [
    insightSummaryCard("Indicadores da diretoria", [
      insightMetric("Preco medio liquido/kg", money(avgNetPrice), "NF liquida / peso saida"),
      insightMetric("Peso faturado", kg(billed), `${number(billings.length, 0)} notas`),
      insightMetric("Contratado", kg(contracted), `${number(contracts.length, 0)} contratos`)
    ]),
    donutCard("Composicao colhida por cultura", aggregateRows(harvests, (item) => item.crop, harvestQuantity), kg),
    barCard("Top clientes por NF liquida", aggregateRows(billings, (item) => item.customer, (item) => item.netInvoice), money),
    progressCard("Peso faturado sobre colhido", billed, harvested, "Faturado", "Colhido")
  ].join("");
}

function renderHarvestInsights(harvests, byCooperative, byTransporter) {
  const target = document.getElementById("harvest-insights");
  if (!target) return;

  const gross = harvests.reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
  const net = harvests.reduce((sum, item) => sum + harvestQuantity(item), 0);
  const discount = harvests.reduce((sum, item) => sum + Number(item.discountTotal || 0), 0);
  const freight = harvests.reduce((sum, item) => sum + Number(item.harvestFreightValue || 0), 0);
  const discountPercent = gross ? (discount / gross) * 100 : 0;

  target.innerHTML = [
    insightSummaryCard("Resumo da colheita", [
      insightMetric("Bruto registrado", kg(gross), `${number(harvests.length, 0)} cargas`),
      insightMetric("Descontos", kg(discount), `${number(discountPercent)}% do bruto`),
      insightMetric("Frete previsto", money(freight), "Pelos lancamentos filtrados")
    ]),
    donutCard(
      "Destino da colheita",
      byCooperative.map((item) => ({ label: item.cooperative, value: item.netWeight })),
      kg
    ),
    barCard(
      "Transportadores por kg",
      byTransporter.map((item) => ({ label: item.transporter, value: item.netWeight })),
      kg
    )
  ].join("");
}

function renderContractInsights(contracts) {
  const target = document.getElementById("contract-insights");
  if (!target) return;

  const kgTotal = contracts.reduce((sum, item) => sum + Number(item.kgContracted || 0), 0);
  const gross = contracts.reduce((sum, item) => sum + Number(item.grossValue || 0), 0);
  const net = contracts.reduce((sum, item) => sum + Number(item.netValue || 0), 0);
  const afterCosts = contracts.reduce((sum, item) => sum + Number(item.totalNetValue || item.netValue || 0), 0);
  const costImpact = Math.max(net - afterCosts, 0);

  target.innerHTML = [
    insightSummaryCard("Carteira de contratos", [
      insightMetric("KG vendido", kg(kgTotal), `${number(kgTotal / 60)} sc`),
      insightMetric("Bruto contratado", money(gross), `${number(contracts.length, 0)} contratos`),
      insightMetric("Liquido apos custos", money(afterCosts), `${money(costImpact)} comissoes/royalties`)
    ]),
    donutCard("Contratos por cultura", aggregateRows(contracts, (item) => item.crop, (item) => item.kgContracted), kg),
    barCard("Clientes por total liquido", aggregateRows(contracts, (item) => item.customer, (item) => item.totalNetValue || item.netValue), money),
    progressCard("Faturado x contratado", data.billings.reduce((sum, item) => sum + billingWeight(item), 0), kgTotal, "Faturado", "Contratado")
  ].join("");
}

function renderBillingInsights(billings) {
  const target = document.getElementById("billing-insights");
  if (!target) return;

  const weight = billings.reduce((sum, item) => sum + billingWeight(item), 0);
  const gross = billings.reduce((sum, item) => sum + Number(item.totalValue || 0), 0);
  const funrural = billings.reduce((sum, item) => sum + Number(item.funrural || 0), 0);
  const net = billings.reduce((sum, item) => sum + Number(item.netInvoice || 0), 0);
  const avgPrice = weight ? gross / weight : 0;

  target.innerHTML = [
    insightSummaryCard("Resumo do faturamento", [
      insightMetric("Peso saida", kg(weight), `${number(weight / 60)} sc`),
      insightMetric("Preco medio/kg", money(avgPrice), "Total / peso saida"),
      insightMetric("Total liquido", money(net), `${money(funrural)} FUNRURAL`)
    ]),
    donutCard("Peso faturado por cultura", aggregateRows(billings, (item) => item.crop, billingWeight), kg),
    barCard("Clientes por NF liquida", aggregateRows(billings, (item) => item.customer, (item) => item.netInvoice), money)
  ].join("");
}

function renderFreightInsights(rows) {
  const target = document.getElementById("freight-insights");
  if (!target) return;

  const freight = rows.reduce((sum, item) => sum + Number(item.freightValue || 0), 0);
  const paid = rows.reduce((sum, item) => sum + Number(item.paymentValue1 || 0) + Number(item.paymentValue2 || 0), 0);
  const balance = Math.max(freight - paid, 0);
  const weight = rows.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const avgFreight = weight ? freight / (weight / 1000) : 0;

  target.innerHTML = [
    insightSummaryCard("Controle de fretes", [
      insightMetric("Total de frete", money(freight), `${number(rows.length, 0)} lancamentos`),
      insightMetric("Saldo a pagar", money(balance), `${money(paid)} pago`),
      insightMetric("Frete medio/t", money(avgFreight), "Pelo peso filtrado")
    ]),
    donutCard("Status dos fretes", [
      { label: "Pagos", value: paid },
      { label: "A pagar", value: balance }
    ], money),
    barCard("Transportadores por frete", aggregateRows(rows, (item) => item.transporter, (item) => item.freightValue), money)
  ].join("");
}

function renderReceiptInsights(contracts) {
  const target = document.getElementById("receipt-insights");
  if (!target) return;

  const kgTotal = contracts.reduce((sum, item) => sum + Number(item.kgContracted || 0), 0);
  const receivable = contracts.reduce((sum, item) => sum + Number(item.netValue || 0), 0);
  const afterCosts = contracts.reduce((sum, item) => sum + Number(item.totalNetValue || item.netValue || 0), 0);
  const costs = Math.max(receivable - afterCosts, 0);

  target.innerHTML = [
    insightSummaryCard("Conta corrente de recebimentos", [
      insightMetric("KG a receber", kg(kgTotal), `${number(kgTotal / 60)} sc`),
      insightMetric("Liquido a receber", money(receivable), `${number(contracts.length, 0)} contratos`),
      insightMetric("Apos comissao/royalties", money(afterCosts), `${money(costs)} de custos`)
    ]),
    donutCard("Recebimentos por cultura", aggregateRows(contracts, (item) => item.crop, (item) => item.totalNetValue || item.netValue), money),
    barCard("Clientes a receber", aggregateRows(contracts, (item) => item.customer, (item) => item.totalNetValue || item.netValue), money)
  ].join("");
}

function renderDashboard() {
  renderDashboardFilterOptions();

  const harvests = dashboardFilters.type === "billings" || dashboardFilters.type === "contracts" ? [] : dashboardHarvests();
  const billings = dashboardFilters.type === "harvests" || dashboardFilters.type === "contracts" ? [] : dashboardBillings();
  const contracts = dashboardFilters.type === "harvests" || dashboardFilters.type === "billings" ? [] : dashboardContracts();
  const harvested = harvests.reduce((sum, item) => sum + harvestQuantity(item), 0);
  const billedWeight = billings.reduce((sum, item) => sum + billingWeight(item), 0);
  const gross = billings.reduce((sum, item) => sum + Number(item.totalValue || 0), 0);
  const funrural = billings.reduce((sum, item) => sum + Number(item.funrural || 0), 0);

  document.getElementById("metric-colhido").textContent = kg(harvested);
  document.getElementById("metric-estoque").textContent = kg(harvested - billedWeight);
  document.getElementById("metric-faturado").textContent = money(gross);
  document.getElementById("metric-funrural").textContent = money(funrural);
  document.getElementById("metric-total-liquido").textContent = money(gross - funrural);

  renderExecutiveInsights(harvests, billings, contracts);

  const cropRows = availableCropNames()
    .map((crop) => {
      const harvestedKg = harvests.filter((item) => item.crop === crop).reduce((sum, item) => sum + harvestQuantity(item), 0);
      const billedKg = billings.filter((item) => item.crop === crop).reduce((sum, item) => sum + billingWeight(item), 0);
      return { crop, harvestedKg, billedKg, stockKg: harvestedKg - billedKg };
    })
    .filter((item) => item.harvestedKg > 0 || item.billedKg > 0);

  renderTable(
    "crop-summary",
    cropRows.map((item) => `<tr>
      <td><span class="crop-dot">${escapeHtml(item.crop)}</span></td>
      <td class="number strong-cell">${kg(item.harvestedKg)}</td>
      <td class="number">${kg(item.billedKg)}</td>
      <td class="number strong-cell">${kg(item.stockKg)}</td>
    </tr>`),
    4
  );

  const billingSummary = Object.values(
    billings.reduce((acc, item) => {
      const crop = item.crop || "Sem cultura";
      const customer = item.customer || "Sem cliente";
      const key = `${crop}|${customer}`;
      if (!acc[key]) acc[key] = { crop, customer, exitWeight: 0, netInvoice: 0 };
      acc[key].exitWeight += billingWeight(item);
      acc[key].netInvoice += Number(item.netInvoice || 0);
      return acc;
    }, {})
  );

  renderTable(
    "billing-summary",
    billingSummary.map((item) => `<tr>
      <td><span class="crop-dot">${escapeHtml(item.crop)}</span></td>
      <td>${escapeHtml(item.customer)}</td>
      <td class="number">${kg(item.exitWeight)}</td>
      <td class="number strong-cell">${money(item.netInvoice)}</td>
    </tr>`),
    4
  );

  renderUniversalDashboard(harvests, billings, contracts);
  renderYieldSummary(harvests);
}

function renderDashboardFilterOptions() {
  const cropSelect = document.getElementById("dashboard-crop-filter");
  const seasonSelect = document.getElementById("dashboard-season-filter");
  const contractSelect = document.getElementById("dashboard-contract-filter");
  if (!cropSelect || !seasonSelect || !contractSelect) return;

  const currentCrop = dashboardFilters.crop;
  const currentSeason = dashboardFilters.season;
  const currentContract = dashboardFilters.contract;
  const availableCrops = availableCropNames();
  const availableSeasons = availableSeasonNames();
  const availableContracts = [...new Set(data.contracts.map((item) => item.contractNumber).filter(Boolean))].sort();

  cropSelect.innerHTML = `<option value="all">Todas</option>${availableCrops
    .map((crop) => `<option value="${escapeHtml(crop)}">${escapeHtml(crop)}</option>`)
    .join("")}`;
  seasonSelect.innerHTML = `<option value="all">Ultima safra</option>${availableSeasons
    .map((season) => `<option value="${escapeHtml(season)}">${escapeHtml(season)}</option>`)
    .join("")}`;
  contractSelect.innerHTML = `<option value="all">Todos</option>${availableContracts
    .map((contract) => `<option value="${escapeHtml(contract)}">${escapeHtml(contract)}</option>`)
    .join("")}`;

  cropSelect.value = availableCrops.includes(currentCrop) ? currentCrop : "all";
  const latestSeason = latestDashboardSeason();
  seasonSelect.value = availableSeasons.includes(currentSeason) ? currentSeason : latestSeason;
  contractSelect.value = availableContracts.includes(currentContract) ? currentContract : "all";
  dashboardFilters.crop = cropSelect.value;
  dashboardFilters.season = seasonSelect.value;
  dashboardFilters.contract = contractSelect.value;
  dashboardFilters.type = "all";
  document.getElementById("dashboard-type-filter").value = "all";
}

function renderYieldSummary(harvests) {
  const planRows = Object.values(
    data.cropPlans
      .filter((item) => {
        const cropMatches = dashboardFilters.crop === "all" || item.crop === dashboardFilters.crop;
        const seasonMatches = dashboardFilters.season === "all" || recordSeason(item) === dashboardFilters.season;
        return cropMatches && seasonMatches;
      })
      .reduce((acc, item) => {
        const key = `${recordSeason(item)}|${item.crop}`;
        if (!acc[key]) acc[key] = { crop: item.crop, season: recordSeason(item), hectares: 0 };
        acc[key].hectares += Number(item.hectares || 0);
        return acc;
      }, {})
  );

  renderTable(
    "yield-summary",
    planRows.map((item) => {
      const harvested = harvests
        .filter((harvest) => harvest.crop === item.crop && recordSeason(harvest) === item.season)
        .reduce((sum, harvest) => sum + harvestQuantity(harvest), 0);
      const average = item.hectares ? harvested / item.hectares : 0;
      return `<tr>
        <td><span class="crop-dot">${escapeHtml(item.crop)}</span></td>
        <td>${escapeHtml(item.season)}</td>
        <td class="number">${number(item.hectares)}</td>
        <td class="number strong-cell">${kg(harvested)}</td>
        <td class="number strong-cell">${number(average)} kg/ha</td>
      </tr>`;
    }),
    5
  );
}

function renderUniversalDashboard(harvests, billings, contracts) {
  const title = document.getElementById("universal-table-title");
  const head = document.getElementById("universal-table-head");
  const body = document.getElementById("universal-table-body");

  if (dashboardFilters.type === "harvests") {
    title.textContent = "Colheitas filtradas";
    head.innerHTML = `<tr>
      <th>Data</th><th>Safra</th><th>Cultura</th><th>Cooperativa</th>
      <th>Transportador</th><th>Nota fiscal</th><th>Liquido</th><th>Valor do frete</th>
    </tr>`;
    body.innerHTML = harvests.length
      ? harvests.map((item) => `<tr>
          <td>${escapeHtml(item.date)}</td>
          <td>${escapeHtml(recordSeason(item))}</td>
          <td><span class="crop-dot">${escapeHtml(item.crop)}</span></td>
          <td>${escapeHtml(item.cooperative)}</td>
          <td>${escapeHtml(transportName(item))}</td>
          <td>${escapeHtml(item.invoice)}</td>
          <td class="number strong-cell">${kg(item.netWeight)}</td>
          <td class="number">${money(item.harvestFreightValue)}</td>
        </tr>`).join("")
      : emptyRow(8);
    return;
  }

  if (dashboardFilters.type === "billings") {
    title.textContent = "Faturamentos filtrados";
    head.innerHTML = `<tr>
      <th>Data</th><th>Safra</th><th>Cultura</th><th>Cliente</th>
      <th>NFP</th><th>NFE</th><th>Peso saida</th><th>NF liquida</th>
    </tr>`;
    body.innerHTML = billings.length
      ? billings.map((item) => `<tr>
          <td>${escapeHtml(item.date)}</td>
          <td>${escapeHtml(recordSeason(item))}</td>
          <td><span class="crop-dot">${escapeHtml(item.crop || "-")}</span></td>
          <td>${escapeHtml(item.customer)}</td>
          <td>${escapeHtml(item.nfp)}</td>
          <td>${escapeHtml(item.nfe)}</td>
          <td class="number">${kg(item.exitWeight)}</td>
          <td class="number strong-cell">${money(item.netInvoice)}</td>
        </tr>`).join("")
      : emptyRow(8);
    return;
  }

  if (dashboardFilters.type === "contracts") {
    title.textContent = "Contratos filtrados";
    head.innerHTML = `<tr>
      <th>Cliente</th><th>Contrato</th><th>Entrega</th><th>Prazo</th>
      <th>KG</th><th>SC</th><th>Bruto</th><th>Total liquido</th>
    </tr>`;
    body.innerHTML = contracts.length
      ? contracts.map((item) => `<tr>
          <td class="strong-cell">${escapeHtml(item.customer)}</td>
          <td>${escapeHtml(item.contractNumber)}</td>
          <td>${escapeHtml(item.deliveryStart || "-")}</td>
          <td>${escapeHtml(item.deliveryDeadline || "-")}</td>
          <td class="number">${kg(item.kgContracted)}</td>
          <td class="number">${number(item.bagsContracted)}</td>
          <td class="number">${money(item.grossValue)}</td>
          <td class="number strong-cell">${money(item.totalNetValue || item.netValue)}</td>
        </tr>`).join("")
      : emptyRow(8);
    return;
  }

  title.textContent = "Resumo filtrado por safra";
  head.innerHTML = `<tr>
    <th>Safra</th><th>Cultura</th><th>Colhido</th><th>Faturado kg</th>
    <th>Contratos liquido</th><th>NF liquida</th><th>FUNRURAL</th><th>Total frete</th>
  </tr>`;
  const keys = [...new Set([...harvests, ...billings, ...contracts].map((item) => `${recordSeason(item)}|${item.crop || "Sem cultura"}`))];
  body.innerHTML = keys.length
    ? keys.map((key) => {
        const [season, crop] = key.split("|");
        const seasonHarvests = harvests.filter((item) => recordSeason(item) === season && (item.crop || "Sem cultura") === crop);
        const seasonBillings = billings.filter((item) => recordSeason(item) === season && (item.crop || "Sem cultura") === crop);
        const seasonContracts = contracts.filter((item) => recordSeason(item) === season && (item.crop || "Sem cultura") === crop);
        return `<tr>
          <td>${escapeHtml(season)}</td>
          <td><span class="crop-dot">${escapeHtml(crop)}</span></td>
          <td class="number strong-cell">${kg(seasonHarvests.reduce((sum, item) => sum + harvestQuantity(item), 0))}</td>
          <td class="number">${kg(seasonBillings.reduce((sum, item) => sum + billingWeight(item), 0))}</td>
          <td class="number strong-cell">${money(seasonContracts.reduce((sum, item) => sum + Number(item.totalNetValue || item.netValue || 0), 0))}</td>
          <td class="number strong-cell">${money(seasonBillings.reduce((sum, item) => sum + Number(item.netInvoice || 0), 0))}</td>
          <td class="number">${money(seasonBillings.reduce((sum, item) => sum + Number(item.funrural || 0), 0))}</td>
          <td class="number">${money(seasonBillings.reduce((sum, item) => sum + Number(item.totalFreight || 0), 0))}</td>
        </tr>`;
      }).join("")
    : emptyRow(8);
}

function renderHarvestSummaries() {
  renderHarvestSummaryFilterOptions();
  const filteredHarvests = data.harvests.filter(matchesHarvestSummaryFilters);

  const byCooperative = groupedBy(filteredHarvests, (item) => item.cooperative, (key) => ({
    cooperative: key,
    count: 0,
    netWeight: 0,
    freightValue: 0
  }));

  renderTable(
    "cooperative-summary",
    byCooperative.map((item) => `<tr>
      <td class="strong-cell">${escapeHtml(item.cooperative)}</td>
      <td class="number">${number(item.count, 0)}</td>
      <td class="number strong-cell">${kg(item.netWeight)}</td>
    </tr>`),
    3
  );

  const byIdentifier = groupedBy(filteredHarvests, (item) => transportName(item), (key) => ({
    transporter: key,
    count: 0,
    netWeight: 0,
    freightValue: 0
  }));

  renderTable(
    "identifier-summary",
    byIdentifier.map((item) => `<tr>
      <td class="strong-cell">${escapeHtml(item.transporter)}</td>
      <td class="number">${number(item.count, 0)}</td>
      <td class="number strong-cell">${kg(item.netWeight)}</td>
      <td class="number strong-cell">${money(item.freightValue)}</td>
    </tr>`),
    4
  );

  renderHarvestInsights(filteredHarvests, byCooperative, byIdentifier);
}

function renderHarvests() {
  renderHarvestSummaries();
  renderTable(
    "harvest-list",
    data.harvests.map((item) => `<tr>
      <td>${escapeHtml(item.date)}</td>
      <td>${escapeHtml(item.season)}</td>
      <td><span class="crop-dot">${escapeHtml(item.crop)}</span></td>
      <td>${escapeHtml(item.unit)}</td>
      <td>${escapeHtml(transportName(item))}</td>
      <td>${escapeHtml(item.cooperative)}</td>
      <td>${escapeHtml(item.invoice)}</td>
      <td class="number">${kg(item.grossWeight)}</td>
      <td class="number">${number(item.impurityDiscount)}%</td>
      <td class="number">${number(item.humidityDiscount)}%</td>
      <td class="number">${kg(item.discountTotal)}</td>
      <td class="number strong-cell">${kg(item.netWeight)}</td>
      <td class="number">${money(item.harvestFreightPerTon)}</td>
      <td class="number">${money(item.harvestFreightValue)}</td>
      <td>${escapeHtml(item.notes || "-")}</td>
      <td class="row-actions">
        <button class="edit" data-edit-harvest="${item.id}">Editar</button>
        <button class="delete" data-delete="harvests" data-id="${item.id}">Excluir</button>
      </td>
    </tr>`),
    16
  );
}

function renderBilling() {
  const search = document.getElementById("billing-search").value.toLowerCase();
  const filtered = data.billings.filter((item) => {
    const text = [item.crop, item.season, item.nfp, item.nfe, item.contractNumber, item.departureLocation, item.customer, transportName(item), item.cte, item.notes]
      .join(" ")
      .toLowerCase();
    return text.includes(search);
  });

  renderBillingInsights(filtered);

  renderTable(
    "billing-list",
    filtered.map((item) => `<tr>
      <td>${escapeHtml(item.date)}</td>
      <td>${escapeHtml(item.nfp)}</td>
      <td>${escapeHtml(item.nfe)}</td>
      <td>${escapeHtml(item.contractNumber || "-")}</td>
      <td><span class="crop-dot">${escapeHtml(item.crop || "-")}</span></td>
      <td>${escapeHtml(recordSeason(item))}</td>
      <td>${escapeHtml(item.departureLocation || "-")}</td>
      <td class="strong-cell">${escapeHtml(item.customer)}</td>
      <td>${escapeHtml(transportName(item))}</td>
      <td class="number">${kg(item.exitWeight)}</td>
      <td class="number">${money(item.pricePerKg)}</td>
      <td class="number strong-cell">${money(item.totalValue)}</td>
      <td class="number">${number(item.funruralRate)}%</td>
      <td class="number">${money(item.funrural)}</td>
      <td class="number strong-cell">${money(item.netInvoice)}</td>
      <td>${escapeHtml(item.receiptDate || "-")}</td>
      <td class="number">${number(item.bags)}</td>
      <td class="number">${money(item.freightPerTon)}</td>
      <td class="number">${money(item.totalFreight)}</td>
      <td>${escapeHtml(item.cte || "-")}</td>
      <td class="number">${kg(item.portUnloadWeight)}</td>
      <td class="number">${kg(item.weightDifference)}</td>
      <td class="row-actions">
        <button class="edit" data-edit-billing="${item.id}">Editar</button>
        <button class="delete" data-delete="billings" data-id="${item.id}">Excluir</button>
      </td>
    </tr>`),
    23
  );
}

function renderContracts() {
  const search = document.getElementById("contract-search").value.toLowerCase();
  const filtered = data.contracts.filter((item) => {
    const text = [item.customer, item.contractNumber, item.broker, item.crop, item.season].join(" ").toLowerCase();
    return text.includes(search);
  });

  renderContractInsights(filtered);

  const cards = filtered.map((item) => `<article class="contract-card">
    <div>
      <span>ENTREGA: ${escapeHtml(item.deliveryStart || "-")} | PRAZO: ${escapeHtml(item.deliveryDeadline || "-")}</span>
      <strong>${escapeHtml(item.customer)}</strong>
      <small>${escapeHtml(item.contractNumber)}</small>
    </div>
    <button class="contract-card-action" data-edit-contract="${item.id}" type="button">›</button>
  </article>`);
  document.getElementById("contract-card-list").innerHTML = cards.length ? cards.join("") : `<p class="empty">Nenhum contrato encontrado.</p>`;

  renderTable(
    "contract-list",
    filtered.map((item) => `<tr>
      <td class="strong-cell">${escapeHtml(item.customer)}</td>
      <td>${escapeHtml(item.contractNumber)}</td>
      <td>${escapeHtml(item.deliveryStart || "-")}</td>
      <td>${escapeHtml(item.deliveryDeadline || "-")}</td>
      <td>${escapeHtml(item.broker || "-")}</td>
      <td class="number">${kg(item.kgContracted)}</td>
      <td class="number">${number(item.bagsContracted)}</td>
      <td class="number">${money(item.pricePerKg)}</td>
      <td class="number strong-cell">${money(item.grossValue)}</td>
      <td class="number">${money(item.funrural)}</td>
      <td class="number strong-cell">${money(item.netValue)}</td>
      <td>${escapeHtml(item.paymentDeadline || "-")}</td>
      <td class="number">${number(item.commission)}%</td>
      <td class="number">${money(item.commissionValue)}</td>
      <td class="number">${number(item.royalties)}%</td>
      <td class="number">${money(item.royaltiesValue)}</td>
      <td class="number strong-cell">${money(item.totalNetValue || item.netValue)}</td>
      <td class="row-actions">
        <button class="edit" data-edit-contract="${item.id}">Editar</button>
        <button class="delete" data-delete="contracts" data-id="${item.id}">Excluir</button>
      </td>
    </tr>`),
    18
  );
}

function freightRows() {
  const harvestRows = data.harvests.map((item) => ({
    id: item.id,
    source: "harvests",
    sourceLabel: "Colheita",
    date: item.date,
    season: recordSeason(item),
    crop: item.crop,
    transporter: transportName(item),
    reference: item.cooperative || "-",
    nfe: "-",
    nfp: item.invoice || "-",
    weight: harvestQuantity(item),
    bags: harvestQuantity(item) / 60,
    freightPerTon: item.harvestFreightPerTon,
    freightValue: item.harvestFreightValue,
    paymentDate1: item.freightPaymentDate1 || "",
    paymentValue1: paidStatus(item) ? Number(item.harvestFreightValue || 0) : 0,
    paymentDate2: item.freightPaymentDate2 || "",
    paymentValue2: 0,
    paid: paidStatus(item)
  }));

  const billingRows = data.billings.map((item) => ({
    id: item.id,
    source: "billings",
    sourceLabel: "Faturamento",
    date: item.date,
    season: recordSeason(item),
    crop: item.crop,
    transporter: transportName(item),
    reference: item.customer || "-",
    nfe: item.nfe || "-",
    nfp: item.nfp || "-",
    weight: billingWeight(item),
    bags: Number(item.bags || billingWeight(item) / 60),
    freightPerTon: item.freightPerTon,
    freightValue: item.totalFreight,
    paymentDate1: item.freightPaymentDate1 || item.cteDate || "",
    paymentValue1: paidStatus(item) ? Number(item.totalFreight || 0) : 0,
    paymentDate2: item.freightPaymentDate2 || "",
    paymentValue2: 0,
    paid: paidStatus(item)
  }));

  return [...harvestRows, ...billingRows];
}

function setSelectOptions(select, values, current, allLabel) {
  select.innerHTML = `<option value="all">${allLabel}</option>${values
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("")}`;
  select.value = values.includes(current) ? current : "all";
  return select.value;
}

function renderFormOptions() {
  const cropNames = availableCropNames();
  const seasonNames = availableSeasonNames();
  const cropDatalist = document.getElementById("crop-name-options");
  const seasonDatalist = document.getElementById("season-options");

  if (cropDatalist) {
    cropDatalist.innerHTML = cropNames.map((crop) => `<option value="${escapeHtml(crop)}"></option>`).join("");
  }
  if (seasonDatalist) {
    seasonDatalist.innerHTML = seasonNames.map((season) => `<option value="${escapeHtml(season)}"></option>`).join("");
  }

  document.querySelectorAll('form select[name="crop"]').forEach((select) => {
    const current = select.value;
    select.innerHTML = cropNames.map((crop) => `<option value="${escapeHtml(crop)}">${escapeHtml(crop)}</option>`).join("");
    select.value = cropNames.includes(current) ? current : cropNames[0] || "";
  });
}

function renderFreightFilterOptions(rows) {
  const sourceRows = rows.filter((item) => item.source === freightFilters.source);
  const transporterSelect = document.getElementById("freight-transporter-filter");
  const cropSelect = document.getElementById("freight-crop-filter");
  const seasonSelect = document.getElementById("freight-season-filter");

  freightFilters.transporter = setSelectOptions(
    transporterSelect,
    [...new Set(sourceRows.map((item) => item.transporter).filter(Boolean))].sort(),
    freightFilters.transporter,
    "Todos"
  );
  freightFilters.crop = setSelectOptions(
    cropSelect,
    [...new Set(sourceRows.map((item) => item.crop).filter(Boolean))].sort(),
    freightFilters.crop,
    "Todas"
  );
  freightFilters.season = setSelectOptions(
    seasonSelect,
    [...new Set(sourceRows.map((item) => item.season).filter(Boolean))].sort().reverse(),
    freightFilters.season,
    "Todos"
  );
}

function renderFreights() {
  const rows = freightRows();
  renderFreightFilterOptions(rows);

  const filtered = rows.filter((item) => {
    const sourceMatches = item.source === freightFilters.source;
    const transporterMatches = freightFilters.transporter === "all" || item.transporter === freightFilters.transporter;
    const statusMatches =
      freightFilters.status === "all" ||
      (freightFilters.status === "paid" && item.paid) ||
      (freightFilters.status === "unpaid" && !item.paid);
    const cropMatches = freightFilters.crop === "all" || item.crop === freightFilters.crop;
    const seasonMatches = freightFilters.season === "all" || item.season === freightFilters.season;
    return sourceMatches && transporterMatches && statusMatches && cropMatches && seasonMatches;
  });

  renderFreightInsights(filtered);

  renderTable(
    "freight-list",
    filtered.map((item) => {
      const freightValue = Number(item.freightValue || 0);
      const paidValue = Number(item.paymentValue1 || 0) + Number(item.paymentValue2 || 0);
      const balance = Math.max(freightValue - paidValue, 0);
      return `<tr>
      <td>${escapeHtml(shortDate(item.date))}</td>
      <td class="strong-cell">${escapeHtml(item.reference)}</td>
      <td>${escapeHtml(item.nfe)}</td>
      <td>${escapeHtml(item.nfp)}</td>
      <td class="number">${number(item.weight)}</td>
      <td class="number">${number(item.bags, 0)}</td>
      <td class="strong-cell">${escapeHtml(item.transporter)}</td>
      <td class="number strong-cell">${money(freightValue)}</td>
      <td>
        <input class="freight-date-input" data-freight-date="freightPaymentDate1" data-source="${item.source}" data-id="${item.id}" type="date" value="${escapeHtml(item.paymentDate1 || "")}" />
      </td>
      <td class="number">${money(item.paymentValue1)}</td>
      <td>
        <input class="freight-date-input" data-freight-date="freightPaymentDate2" data-source="${item.source}" data-id="${item.id}" type="date" value="${escapeHtml(item.paymentDate2 || "")}" />
      </td>
      <td class="number">${money(item.paymentValue2)}</td>
      <td class="number strong-cell">${money(balance)}</td>
      <td>
        <input class="freight-paid-checkbox" data-freight-paid="${item.source}" data-id="${item.id}" type="checkbox" ${item.paid ? "checked" : ""} />
      </td>
    </tr>`;
    }),
    14
  );
}

function renderReceipts() {
  renderReceiptFilterOptions();
  const filtered = [...data.contracts]
    .filter(matchesReceiptFilters)
    .sort((a, b) => String(a.paymentDeadline || "9999-12-31").localeCompare(String(b.paymentDeadline || "9999-12-31")));

  renderReceiptInsights(filtered);

  renderTable(
    "receipt-list",
    filtered.map((item) => `<tr>
        <td class="strong-cell">${escapeHtml(item.customer)}</td>
        <td>${escapeHtml(item.contractNumber)}</td>
        <td class="number">${kg(item.kgContracted)}</td>
        <td class="number">${number(item.bagsContracted)}</td>
        <td class="number strong-cell">${money(item.netValue)}</td>
        <td class="number strong-cell">${money(item.totalNetValue || item.netValue)}</td>
      </tr>`),
    6
  );
}

function matchesReceiptFilters(item) {
  const cropMatches = receiptFilters.crop === "all" || item.crop === receiptFilters.crop;
  const seasonMatches = receiptFilters.season === "all" || recordSeason(item) === receiptFilters.season;
  return cropMatches && seasonMatches;
}

function renderReceiptFilterOptions() {
  const cropSelect = document.getElementById("receipt-crop-filter");
  const seasonSelect = document.getElementById("receipt-season-filter");
  if (!cropSelect || !seasonSelect) return;

  receiptFilters.crop = setSelectOptions(
    cropSelect,
    [...new Set(data.contracts.map((item) => item.crop).filter(Boolean))].sort(),
    receiptFilters.crop,
    "Todas"
  );
  receiptFilters.season = setSelectOptions(
    seasonSelect,
    [...new Set(data.contracts.map(recordSeason).filter(Boolean))].sort().reverse(),
    receiptFilters.season,
    "Todos"
  );
}

function matchesStorageFilters(item) {
  const cropMatches = storageFilters.crop === "all" || item.crop === storageFilters.crop;
  const seasonMatches = storageFilters.season === "all" || recordSeason(item) === storageFilters.season;
  return cropMatches && seasonMatches;
}

function renderStorageFilterOptions() {
  const cropSelect = document.getElementById("storage-crop-filter");
  const seasonSelect = document.getElementById("storage-season-filter");
  if (!cropSelect || !seasonSelect) return;

  const sourceItems = [...data.harvests, ...data.storageReturns, ...data.contracts];
  storageFilters.crop = setSelectOptions(
    cropSelect,
    [...new Set(sourceItems.map((item) => item.crop).filter(Boolean))].sort(),
    storageFilters.crop,
    "Todas"
  );
  storageFilters.season = setSelectOptions(
    seasonSelect,
    [...new Set(sourceItems.map(recordSeason).filter(Boolean))].sort().reverse(),
    storageFilters.season,
    "Todos"
  );
}

function renderStorageSummary() {
  const harvests = data.harvests.filter(matchesStorageFilters);
  const returns = data.storageReturns.filter(matchesStorageFilters);
  const contracts = data.contracts.filter(matchesStorageFilters);
  const companies = [...new Set([...harvests.map((item) => item.cooperative), ...returns.map((item) => item.company)].filter(Boolean))].sort();
  const totalStored = harvests.reduce((sum, item) => sum + harvestQuantity(item), 0);
  const totalReturned = returns.reduce((sum, item) => sum + storageReturnWeight(item), 0);
  const totalSold = contracts.reduce((sum, item) => sum + Number(item.kgContracted || 0), 0);
  const remainingContracts = Math.max(totalStored - totalSold, 0);

  const companyCards = companies.map((company, index) => {
    const storedKg = harvests.filter((item) => item.cooperative === company).reduce((sum, item) => sum + harvestQuantity(item), 0);
    const returnedKg = returns.filter((item) => item.company === company).reduce((sum, item) => sum + storageReturnWeight(item), 0);
    const remainingKg = Math.max(storedKg - returnedKg, 0);
    return `<article class="storage-card tone-${(index % 4) + 1}">
      <span>${escapeHtml(company)}</span>
      <strong>${number(storedKg)} kg</strong>
      <small>${number(storedKg / 60, 0)} sc armazenadas</small>
      <div>
        <b>Retornado</b><em>${number(returnedKg)} kg</em>
        <b>Saldo</b><em>${number(remainingKg)} kg</em>
      </div>
    </article>`;
  });

  document.getElementById("storage-summary-cards").innerHTML = `
    ${companyCards.join("") || `<article class="storage-card tone-1"><span>Sem armazenagem</span><strong>0 kg</strong><small>Selecione uma cultura e safra com colheitas.</small></article>`}
    <article class="storage-card total">
      <span>Total armazenado</span>
      <strong>${number(totalStored)} kg</strong>
      <small>${number(totalStored / 60, 0)} sc</small>
      <div>
        <b>Total retornado</b><em>${number(totalReturned)} kg</em>
        <b>Saldo a retornar</b><em>${number(Math.max(totalStored - totalReturned, 0))} kg</em>
      </div>
    </article>
    <article class="storage-card dark">
      <span>Contratos</span>
      <strong>${number(totalSold)} kg</strong>
      <small>Total vendido em contratos</small>
      <div>
        <b>Falta fechar</b><em>${number(remainingContracts)} kg</em>
      </div>
    </article>`;
}

function renderStorageReturns() {
  renderStorageFilterOptions();
  renderStorageSummary();

  const filtered = data.storageReturns.filter(matchesStorageFilters);
  const totalKg = filtered.reduce((sum, item) => sum + storageReturnWeight(item), 0);
  const totalBags = filtered.reduce((sum, item) => sum + storageReturnBags(item), 0);

  renderTable(
    "storage-return-list",
    [
      ...filtered.map((item) => `<tr>
        <td>${escapeHtml(shortDate(item.date))}</td>
        <td>${escapeHtml(item.nfe || "-")}</td>
        <td>${escapeHtml(item.nfp || "-")}</td>
        <td class="strong-cell">${escapeHtml(item.company)}</td>
        <td class="number">${number(item.weightKg)}</td>
        <td class="number">${number(storageReturnBags(item), 0)}</td>
        <td><span class="crop-dot">${escapeHtml(item.crop || "-")}</span></td>
        <td>${escapeHtml(recordSeason(item))}</td>
        <td><button class="delete" data-delete="storageReturns" data-id="${item.id}">Excluir</button></td>
      </tr>`),
      filtered.length
        ? `<tr class="total-row">
            <td colspan="4" class="number strong-cell">Total</td>
            <td class="number strong-cell">${number(totalKg)}</td>
            <td class="number strong-cell">${number(totalBags, 0)}</td>
            <td colspan="3"></td>
          </tr>`
        : ""
    ].filter(Boolean),
    9
  );
}

function renderCropPlans() {
  renderTable(
    "crop-plan-list",
    data.cropPlans.map((item) => `<tr>
      <td><span class="crop-dot">${escapeHtml(item.crop)}</span></td>
      <td>${escapeHtml(recordSeason(item))}</td>
      <td class="number strong-cell">${number(item.hectares)}</td>
      <td class="row-actions">
        <button class="edit" data-edit-crop-plan="${item.id}">Editar</button>
        <button class="delete" data-delete="cropPlans" data-id="${item.id}">Excluir</button>
      </td>
    </tr>`),
    4
  );
}

function render() {
  renderFormOptions();
  renderDashboard();
  renderHarvests();
  renderContracts();
  renderBilling();
  renderFreights();
  renderReceipts();
  renderStorageReturns();
  renderCropPlans();
}

function setNumberField(form, name, value) {
  if (form.elements[name]) form.elements[name].value = Number(value || 0).toFixed(2);
}

function calculateHarvest() {
  const form = document.getElementById("harvest-form");
  if (!form || !form.elements.autoCalculate.checked) return;

  const grossWeight = Number(form.elements.grossWeight.value || 0);
  const impurityWeight = Number(form.elements.impurityWeight.value || 0);
  const humidityWeight = Number(form.elements.humidityWeight.value || 0);
  const impurityDiscount = grossWeight ? (impurityWeight / grossWeight) * 100 : 0;
  const humidityDiscount = grossWeight ? (humidityWeight / grossWeight) * 100 : 0;
  const discountTotal = impurityWeight + humidityWeight;
  const netWeight = Math.max(grossWeight - discountTotal, 0);
  const harvestFreightValue = (netWeight / 1000) * Number(form.elements.harvestFreightPerTon.value || 0);

  setNumberField(form, "impurityDiscount", impurityDiscount);
  setNumberField(form, "humidityDiscount", humidityDiscount);
  setNumberField(form, "discountTotal", discountTotal);
  setNumberField(form, "netWeight", netWeight);
  setNumberField(form, "harvestFreightValue", harvestFreightValue);
}

function calculateBilling() {
  const form = document.getElementById("billing-form");
  if (!form) return;

  const exitWeight = Number(form.elements.exitWeight.value || 0);
  const pricePerKg = Number(form.elements.pricePerKg.value || 0);
  const funruralRate = Number(form.elements.funruralRate.value || 0);
  const freightPerTon = Number(form.elements.freightPerTon.value || 0);
  const portUnloadWeight = Number(form.elements.portUnloadWeight.value || 0);
  const totalValue = exitWeight * pricePerKg;
  const funrural = totalValue * (funruralRate / 100);
  const netInvoice = Math.max(totalValue - funrural, 0);
  const bags = exitWeight / 60;
  const totalFreight = (exitWeight / 1000) * freightPerTon;
  const weightDifference = portUnloadWeight - exitWeight;

  setNumberField(form, "totalValue", totalValue);
  setNumberField(form, "funrural", funrural);
  setNumberField(form, "netInvoice", netInvoice);
  setNumberField(form, "bags", bags);
  setNumberField(form, "totalFreight", totalFreight);
  setNumberField(form, "weightDifference", weightDifference);
}

function calculateContract() {
  const form = document.getElementById("contract-form");
  if (!form) return;

  const kgContracted = Number(form.elements.kgContracted.value || 0);
  const pricePerKg = Number(form.elements.pricePerKg.value || 0);
  const funruralRate = Number(form.elements.funruralRate.value || 0);
  const commissionRate = Number(form.elements.commission.value || 0);
  const royaltiesRate = Number(form.elements.royalties.value || 0);
  const bagsContracted = kgContracted / 60;
  const grossValue = kgContracted * pricePerKg;
  const funrural = grossValue * (funruralRate / 100);
  const netValue = grossValue - funrural;
  const commissionValue = grossValue * (commissionRate / 100);
  const royaltiesValue = grossValue * (royaltiesRate / 100);
  const totalNetValue = netValue - commissionValue - royaltiesValue;

  setNumberField(form, "bagsContracted", bagsContracted);
  setNumberField(form, "grossValue", grossValue);
  setNumberField(form, "funrural", funrural);
  setNumberField(form, "netValue", netValue);
  setNumberField(form, "commissionValue", commissionValue);
  setNumberField(form, "royaltiesValue", royaltiesValue);
  setNumberField(form, "totalNetValue", totalNetValue);
}

function setBillingEditState(isEditing) {
  document.getElementById("billing-submit").textContent = isEditing ? "Atualizar faturamento" : "▣ Salvar faturamento";
  document.getElementById("cancel-billing-edit").classList.toggle("hidden", !isEditing);
}

function fillForm(form, record) {
  const normalized = { ...record };
  if (form.id === "harvest-form") {
    normalized.transporter = normalized.transporter || normalized.identifier || "";
    normalized.unit = "Quilogramas";
  }
  if (form.id === "contract-form") {
    normalized.kgContracted = Number(normalized.kgContracted || 0) || Number(normalized.bagsContracted || 0) * 60;
    normalized.bagsContracted = Number(normalized.bagsContracted || normalized.kgContracted / 60 || 0);
    normalized.pricePerKg = Number(normalized.pricePerKg || 0) || Number(normalized.pricePerBag || 0) / 60;
    normalized.commission = Number(String(normalized.commission || "0").replace(",", ".").match(/[0-9]+(\.[0-9]+)?/)?.[0] || 0);
    normalized.royalties = Number(String(normalized.royalties || "0").replace(",", ".").match(/[0-9]+(\.[0-9]+)?/)?.[0] || 0);
  }
  Object.entries(normalized).forEach(([key, value]) => {
    if (!form.elements[key]) return;
    if (form.elements[key].type === "checkbox") {
      form.elements[key].checked = value === true || value === "on";
      return;
    }
    form.elements[key].value = value ?? "";
  });
}

function setHarvestEditState(isEditing) {
  document.getElementById("harvest-submit").textContent = isEditing ? "Atualizar colheita" : "▣ Salvar colheita";
  document.getElementById("cancel-harvest-edit").classList.toggle("hidden", !isEditing);
}

function startHarvestEdit(id) {
  const record = data.harvests.find((item) => item.id === id);
  if (!record) return;

  const form = document.getElementById("harvest-form");
  editingHarvestId = id;
  form.reset();
  fillForm(form, record);
  form.elements.autoCalculate.checked = true;
  calculateHarvest();
  setHarvestEditState(true);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function stopHarvestEdit() {
  editingHarvestId = null;
  setHarvestEditState(false);
}

function startBillingEdit(id) {
  const record = data.billings.find((item) => item.id === id);
  if (!record) return;

  const form = document.getElementById("billing-form");
  editingBillingId = id;
  form.reset();
  fillForm(form, record);
  calculateBilling();
  setBillingEditState(true);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function stopBillingEdit() {
  editingBillingId = null;
  setBillingEditState(false);
}

function setContractEditState(isEditing) {
  document.getElementById("contract-submit").textContent = isEditing ? "Atualizar contrato" : "▣ Salvar contrato";
  document.getElementById("cancel-contract-edit").classList.toggle("hidden", !isEditing);
}

function startContractEdit(id) {
  const record = data.contracts.find((item) => item.id === id);
  if (!record) return;

  const form = document.getElementById("contract-form");
  editingContractId = id;
  form.reset();
  fillForm(form, record);
  calculateContract();
  setContractEditState(true);
  document.getElementById("contract-form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function stopContractEdit() {
  editingContractId = null;
  setContractEditState(false);
}

function setCropPlanEditState(isEditing) {
  document.getElementById("crop-plan-submit").textContent = isEditing ? "Atualizar safra" : "▣ Salvar safra";
  document.getElementById("cancel-crop-plan-edit").classList.toggle("hidden", !isEditing);
}

function startCropPlanEdit(id) {
  const record = data.cropPlans.find((item) => item.id === id);
  if (!record) return;

  const form = document.getElementById("crop-plan-form");
  editingCropPlanId = id;
  form.reset();
  fillForm(form, record);
  setCropPlanEditState(true);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function stopCropPlanEdit() {
  editingCropPlanId = null;
  setCropPlanEditState(false);
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `${view}-view`));
    document.getElementById("page-title").textContent = titles[view][0];
    document.getElementById("page-subtitle").textContent = titles[view][1];
  });
});

document.getElementById("harvest-form").addEventListener("input", calculateHarvest);
document.getElementById("harvest-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  calculateHarvest();
  const record = numericRecord(formValues(event.currentTarget), harvestNumericFields);
  record.unit = "Quilogramas";
  record.identifier = record.transporter;

  if (editingHarvestId) {
    await updateRecord("harvests", editingHarvestId, record);
    stopHarvestEdit();
  } else {
    await addRecord("harvests", record);
  }

  event.currentTarget.reset();
  event.currentTarget.elements.autoCalculate.checked = true;
  event.currentTarget.elements.unit.value = "Quilogramas";
  calculateHarvest();
});

document.getElementById("billing-form").addEventListener("input", calculateBilling);
document.getElementById("billing-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  calculateBilling();
  const record = numericRecord(formValues(event.currentTarget), billingNumericFields);

  if (editingBillingId) {
    await updateRecord("billings", editingBillingId, record);
    stopBillingEdit();
  } else {
    await addRecord("billings", record);
  }

  event.currentTarget.reset();
  calculateBilling();
});

document.getElementById("contract-form").addEventListener("input", calculateContract);
document.getElementById("contract-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  calculateContract();
  const record = numericRecord(formValues(event.currentTarget), contractNumericFields);

  if (editingContractId) {
    await updateRecord("contracts", editingContractId, record);
    stopContractEdit();
  } else {
    await addRecord("contracts", record);
  }

  event.currentTarget.reset();
  event.currentTarget.elements.funruralRate.value = "1.63";
  calculateContract();
});

document.getElementById("crop-plan-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const record = numericRecord(formValues(event.currentTarget), cropPlanNumericFields);

  if (editingCropPlanId) {
    await updateRecord("cropPlans", editingCropPlanId, record);
    stopCropPlanEdit();
  } else {
    await addRecord("cropPlans", record);
  }

  event.currentTarget.reset();
});

document.getElementById("storage-return-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const record = numericRecord(formValues(form), storageReturnNumericFields);
  if (!record.bags) record.bags = record.weightKg / 60;
  await addRecord("storageReturns", record);
  form.reset();
  if (storageFilters.crop !== "all") form.elements.crop.value = storageFilters.crop;
  if (storageFilters.season !== "all") form.elements.season.value = storageFilters.season;
});

document.getElementById("billing-search").addEventListener("input", renderBilling);
document.getElementById("contract-search").addEventListener("input", renderContracts);
document.getElementById("show-contract-form").addEventListener("click", () => {
  document.getElementById("contract-form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
});

["harvest-summary-crop-filter", "harvest-summary-season-filter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    const key = id === "harvest-summary-crop-filter" ? "crop" : "season";
    harvestSummaryFilters[key] = event.target.value;
    renderHarvests();
  });
});

["freight-source-filter", "freight-transporter-filter", "freight-status-filter", "freight-crop-filter", "freight-season-filter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    const key =
      id === "freight-source-filter"
        ? "source"
        : id === "freight-transporter-filter"
          ? "transporter"
          : id === "freight-status-filter"
            ? "status"
            : id === "freight-crop-filter"
              ? "crop"
              : "season";
    freightFilters[key] = event.target.value;
    renderFreights();
  });
});

["storage-crop-filter", "storage-season-filter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    const key = id === "storage-crop-filter" ? "crop" : "season";
    storageFilters[key] = event.target.value;
    const form = document.getElementById("storage-return-form");
    if (key === "crop" && storageFilters.crop !== "all") form.elements.crop.value = storageFilters.crop;
    if (key === "season" && storageFilters.season !== "all") form.elements.season.value = storageFilters.season;
    renderStorageReturns();
  });
});

["receipt-crop-filter", "receipt-season-filter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    const key = id === "receipt-crop-filter" ? "crop" : "season";
    receiptFilters[key] = event.target.value;
    renderReceipts();
  });
});

["dashboard-crop-filter", "dashboard-season-filter", "dashboard-type-filter", "dashboard-contract-filter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    const key =
      id === "dashboard-crop-filter"
        ? "crop"
        : id === "dashboard-season-filter"
          ? "season"
          : id === "dashboard-contract-filter"
            ? "contract"
            : "type";
    dashboardFilters[key] = event.target.value;
    renderDashboard();
  });
});

document.addEventListener("click", async (event) => {
  const editHarvestButton = event.target.closest("[data-edit-harvest]");
  if (editHarvestButton) {
    startHarvestEdit(editHarvestButton.dataset.editHarvest);
    return;
  }

  const editButton = event.target.closest("[data-edit-billing]");
  if (editButton) {
    startBillingEdit(editButton.dataset.editBilling);
    return;
  }

  const editContractButton = event.target.closest("[data-edit-contract]");
  if (editContractButton) {
    startContractEdit(editContractButton.dataset.editContract);
    return;
  }

  const editCropPlanButton = event.target.closest("[data-edit-crop-plan]");
  if (editCropPlanButton) {
    startCropPlanEdit(editCropPlanButton.dataset.editCropPlan);
    return;
  }

  const deleteButton = event.target.closest("[data-delete]");
  if (!deleteButton) return;
  const confirmed = confirm("Tem certeza que deseja excluir este lancamento?");
  if (!confirmed) return;
  await deleteRecord(deleteButton.dataset.delete, deleteButton.dataset.id);
});

document.addEventListener("change", async (event) => {
  const freightDateInput = event.target.closest("[data-freight-date]");
  if (freightDateInput) {
    await updateRecord(freightDateInput.dataset.source, freightDateInput.dataset.id, {
      [freightDateInput.dataset.freightDate]: freightDateInput.value
    });
    return;
  }

  const paidCheckbox = event.target.closest("[data-freight-paid]");
  if (paidCheckbox) {
    await updateRecord(paidCheckbox.dataset.freightPaid, paidCheckbox.dataset.id, { freightPaid: paidCheckbox.checked });
    return;
  }

});

document.getElementById("cancel-billing-edit").addEventListener("click", () => {
  document.getElementById("billing-form").reset();
  stopBillingEdit();
  calculateBilling();
});

document.getElementById("cancel-harvest-edit").addEventListener("click", () => {
  const form = document.getElementById("harvest-form");
  form.reset();
  form.elements.autoCalculate.checked = true;
  form.elements.unit.value = "Quilogramas";
  stopHarvestEdit();
  calculateHarvest();
});

document.getElementById("cancel-contract-edit").addEventListener("click", () => {
  document.getElementById("contract-form").reset();
  document.getElementById("contract-form").elements.funruralRate.value = "1.63";
  stopContractEdit();
  calculateContract();
});

document.getElementById("cancel-crop-plan-edit").addEventListener("click", () => {
  document.getElementById("crop-plan-form").reset();
  stopCropPlanEdit();
});

document.getElementById("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const key = String(document.getElementById("access-key").value || "").trim().toUpperCase();
  const password = String(document.getElementById("access-password").value || "").trim();

  if (key !== ACCESS_KEY || password !== ACCESS_PASSWORD) {
    setAuthMessage("Palavra-passe ou senha incorreta.", "error");
    return;
  }

  saveAccess();
  event.currentTarget.reset();
  await loadDataAfterAccess();
});

document.getElementById("logout-button").addEventListener("click", async () => {
  if (realtimeChannel) {
    await supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  clearAccess();
  data = structuredClone(defaultData);
  render();
  showLogin("Voce saiu do app. Informe a palavra-passe e a senha para acessar novamente.");
  setStatus("Aguardando acesso.");
});

document.getElementById("export-data").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `central-safras-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById("import-data").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const imported = { ...defaultData, ...JSON.parse(await file.text()) };
    if (useCloud) {
      for (const harvest of imported.harvests) await addRecord("harvests", harvest);
      for (const billing of imported.billings) await addRecord("billings", billing);
      for (const contract of imported.contracts || []) await addRecord("contracts", contract);
      for (const storageReturn of imported.storageReturns || []) await addRecord("storageReturns", storageReturn);
      for (const cropPlan of imported.cropPlans || []) await addRecord("cropPlans", cropPlan);
    } else {
      data = imported;
      saveLocal();
      render();
    }
  } catch {
    alert("Nao foi possivel importar este arquivo.");
  } finally {
    event.target.value = "";
  }
});

calculateHarvest();
calculateBilling();
calculateContract();
initStore();
