const STORAGE_KEY = "central-safras-data";
const ACCESS_STORAGE_KEY = "central-safras-access-ok";
const VIEW_MODE_STORAGE_KEY = "central-safras-view-mode";
const AUTO_BACKUP_KEY = "central-safras-auto-backups";
const SCHEDULED_BACKUP_KEY = "central-safras-scheduled-backups";
const LAST_DAILY_BACKUP_KEY = "central-safras-last-daily-backup";
const LAST_WEEKLY_BACKUP_KEY = "central-safras-last-weekly-backup";
const SYNC_LOG_KEY = "central-safras-sync-log";
const ACCESS_KEY = "FAZENDA";
const ACCESS_PASSWORD = "fazenda123";
const crops = ["Milho", "Trigo", "Soja", "Aveia"];
const cropBagKg = { Milho: 60, Soja: 60, Trigo: 60, Aveia: 40 };
const defaultData = { harvests: [], billings: [], contracts: [], storageReturns: [], cropPlans: [], costs: [], directories: [], auditLogs: [], deletedItems: [] };

let data = structuredClone(defaultData);
let editingHarvestId = null;
let editingBillingId = null;
let editingContractId = null;
let editingCropPlanId = null;
let editingStorageReturnId = null;
let editingCostId = null;
let editingDirectoryId = null;
let supabaseClient = null;
let useCloud = false;
let realtimeChannel = null;
let cloudRefreshTimer = null;

const titles = {
  dashboard: ["Painel", "Visao geral das safras, saldos e faturamento."],
  visao: ["Visao", "Resumo rapido dos principais numeros da operacao."],
  "resumo-safra": ["Resumo", "Visao consolidada por cultura e safra."],
  "mapa-pendencias": ["Avisos", "Confira lancamentos incompletos, sincronizacao, backups e lixeira."],
  auditoria: ["Auditoria", "Historico completo de alteracoes e operacoes."],
  safras: ["Safras", "Cadastre culturas, vigencias e area produzida."],
  "dre-custos": ["DRE / Custos", "Custos, margem liquida real e resultado por cultura, cliente e contrato."],
  "fechamento-contratos": ["Fechamento de Contratos", "Conferencia final de contratos, excedentes, saldos e pendencias."],
  "conta-cliente": ["Conta Corrente por Cliente", "Consulta consolidada por safra, cultura, cliente e contratos."],
  cadastros: ["Cadastros", "Padronize clientes, cooperativas, transportadores e corretores."],
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
  "harvestFreightValue",
  "adjustmentGrossWeight",
  "adjustmentEffectiveNetWeight",
  "adjustmentConfirmedWeight",
  "adjustmentDifferenceKg",
  "adjustmentDifferenceBags",
  "adjustmentEstimatedValue"
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
  "fixedWeight",
  "fixedPrice",
  "fixedValue",
  "toFixWeight",
  "estimatedPrice",
  "estimatedToFixValue",
  "externalSystemValue",
  "externalDifference",
  "receiptValue1",
  "receiptValue2"
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
  "settlementExtraDiscountKg",
  "settlementExtraDiscountValue",
  "settlementReturnsKg",
  "settlementReturnsValue",
  "settlementSpecialNegotiationKg",
  "settlementSpecialNegotiationValue",
  "settlementExcessKg",
  "settlementExcessValue",
  "settlementToFixKg",
  "settlementToFixValue",
  "settlementFixedPrice",
  "settlementFixedValue",
  "settlementCommissionKg",
  "settlementCommissionRate",
  "settlementCommissionValue",
  "settlementRoyaltiesKg",
  "settlementRoyaltiesRate",
  "settlementRoyaltiesValue",
  "settlementBalanceKg",
  "settlementBalanceValue",
  "closingConfirmedKg",
  "closingConfirmedValue",
  "closingCounterKg",
  "closingCounterValue",
  "closingTransferredKg",
  "closingTransferredValue",
  "closingExcessKg",
  "closingExcessValue",
  "closingToFixKg",
  "closingToFixValue",
  "closingStorageFeeKg",
  "closingStorageFeeValue",
  "closingRoundingKg",
  "closingRoundingValue",
  "closingIssuedInvoiceKg",
  "closingIssuedInvoiceValue",
  "closingPendingInvoiceKg",
  "closingPendingInvoiceValue",
  "closingPaidKg",
  "closingPaidValue",
  "closingReceivableKg",
  "closingReceivableValue",
  "closingCommissionKg",
  "closingCommissionRate",
  "closingCommissionValue",
  "closingRoyaltiesKg",
  "closingRoyaltiesRate",
  "closingRoyaltiesValue",
  "closingBalanceKg",
  "closingBalanceValue",
  "totalNetValue"
];

const storageReturnNumericFields = ["weightKg", "bags"];
const cropPlanNumericFields = ["hectares"];
const costNumericFields = ["hectares", "amount"];

let dashboardFilters = {
  crop: "all",
  season: "all",
  type: "all",
  contract: "all"
};

let quickFilters = {
  crop: "all",
  season: "latest"
};

let freightFilters = {
  source: "harvests",
  transporter: "all",
  status: "all",
  crop: "all",
  season: "all"
};

let billingFilters = {
  crop: "all",
  season: "all",
  contract: "all"
};

let storageFilters = {
  crop: "all",
  season: "all",
  contract: "all"
};

let receiptFilters = {
  crop: "all",
  season: "all",
  due: "all"
};

let summaryFilters = {
  crop: "all",
  season: "all"
};

let dreFilters = {
  crop: "all",
  season: "all"
};

let closingFilters = {
  crop: "all",
  season: "all"
};

let clientAccountFilters = {
  crop: "all",
  season: "all"
};

let harvestSummaryFilters = {
  crop: "all",
  season: "all"
};

let globalSearchTerm = "";
let auditSearchTerm = "";
let syncLogs = [];

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

function saveAutoBackup() {
  try {
    const backups = JSON.parse(localStorage.getItem(AUTO_BACKUP_KEY) || "[]");
    backups.unshift({
      createdAt: new Date().toISOString(),
      data: structuredClone(data)
    });
    localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(backups.slice(0, 5)));
  } catch {
    // Backup local e complementar; nao deve interromper o app.
  }
}

function dataRecordCount(snapshot = data) {
  return ["harvests", "billings", "contracts", "storageReturns", "cropPlans", "costs", "directories"].reduce((sum, key) => sum + Number(snapshot[key]?.length || 0), 0);
}

function scheduledBackups() {
  try {
    return JSON.parse(localStorage.getItem(SCHEDULED_BACKUP_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveScheduledBackup(type) {
  try {
    const backups = scheduledBackups();
    backups.unshift({
      id: crypto.randomUUID(),
      type,
      createdAt: new Date().toISOString(),
      count: dataRecordCount(),
      data: structuredClone(data)
    });
    localStorage.setItem(SCHEDULED_BACKUP_KEY, JSON.stringify(backups.slice(0, 20)));
  } catch {
    // Backup local e complementar; nao deve interromper o app.
  }
}

function runScheduledBackups() {
  const today = new Date().toISOString().slice(0, 10);
  const week = `${new Date().getFullYear()}-${Math.ceil((((new Date()) - new Date(new Date().getFullYear(), 0, 1)) / 86400000 + new Date(new Date().getFullYear(), 0, 1).getDay() + 1) / 7)}`;
  if (localStorage.getItem(LAST_DAILY_BACKUP_KEY) !== today) {
    saveScheduledBackup("Diario");
    localStorage.setItem(LAST_DAILY_BACKUP_KEY, today);
  }
  if (localStorage.getItem(LAST_WEEKLY_BACKUP_KEY) !== week) {
    saveScheduledBackup("Semanal");
    localStorage.setItem(LAST_WEEKLY_BACKUP_KEY, week);
  }
}

function loadSyncLogs() {
  try {
    syncLogs = JSON.parse(localStorage.getItem(SYNC_LOG_KEY) || "[]");
  } catch {
    syncLogs = [];
  }
}

function saveSyncLogs() {
  localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(syncLogs.slice(0, 120)));
}

function pushSyncLog(entry) {
  syncLogs.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "Pendente",
    ...entry
  });
  saveSyncLogs();
  renderSyncLogs();
}

function updateSyncLog(id, patch) {
  syncLogs = syncLogs.map((item) => (item.id === id ? { ...item, ...patch } : item));
  saveSyncLogs();
  renderSyncLogs();
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
  applyViewMode();
}

function isViewMode() {
  return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === "true";
}

function applyViewMode() {
  const enabled = isViewMode();
  document.body.classList.toggle("readonly-mode", enabled);
  const button = document.getElementById("view-mode-toggle");
  if (button) button.textContent = enabled ? "Modo edicao" : "Modo visualizacao";
  document.querySelectorAll("[data-billing-field], [data-receipt-field], [data-freight-date], [data-freight-value], [data-freight-paid], [data-receipt-paid]").forEach((element) => {
    element.disabled = enabled;
  });
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

function cleanPayload(value) {
  return JSON.parse(JSON.stringify(value, (_key, currentValue) => {
    if (currentValue === undefined) return null;
    if (typeof currentValue === "number" && !Number.isFinite(currentValue)) return 0;
    return currentValue;
  }));
}

function normalizeLookup(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizeTypedName(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.toUpperCase();
}

function directoryTypeLabel(type) {
  return {
    customers: "Clientes",
    cooperatives: "Cooperativas",
    transporters: "Transportadores",
    brokers: "Corretores"
  }[type] || type || "-";
}

function directoryEntries(type) {
  return (data.directories || []).filter((item) => item.type === type && item.name);
}

function directoryNames(type) {
  return [
    ...new Set(
      directoryEntries(type)
        .map((item) => item.name)
        .filter(Boolean)
    )
  ].sort();
}

function canonicalName(type, value) {
  const text = normalizeTypedName(value);
  if (!text) return "";
  const lookup = normalizeLookup(text);
  const match = directoryEntries(type).find((item) => {
    const aliases = String(item.aliases || "")
      .split(",")
      .map((alias) => normalizeLookup(alias))
      .filter(Boolean);
    return normalizeLookup(item.name) === lookup || aliases.includes(lookup);
  });
  return match ? match.name : text;
}

function canonicalCrop(value) {
  const lookup = normalizeLookup(value);
  const match = crops.find((crop) => normalizeLookup(crop) === lookup);
  return match || value || "";
}

function normalizeRecordNames(collection, record = {}) {
  const normalized = { ...record };
  if (normalized.crop) normalized.crop = canonicalCrop(normalized.crop);
  if (collection === "contracts") {
    normalized.customer = canonicalName("customers", normalized.customer);
    normalized.broker = canonicalName("brokers", normalized.broker);
  }
  if (collection === "billings") {
    normalized.customer = canonicalName("customers", normalized.customer);
    normalized.transporter = canonicalName("transporters", normalized.transporter);
  }
  if (collection === "harvests") {
    normalized.transporter = canonicalName("transporters", normalized.transporter || normalized.identifier);
    normalized.identifier = normalized.transporter;
    normalized.cooperative = canonicalName("cooperatives", normalized.cooperative);
  }
  if (collection === "storageReturns") {
    normalized.company = canonicalName("cooperatives", normalized.company);
  }
  if (collection === "directories") {
    normalized.name = normalizeTypedName(normalized.name);
    normalized.aliases = String(normalized.aliases || "").trim();
  }
  return normalized;
}

function normalizeLoadedData() {
  data.harvests = data.harvests.map((item) => normalizeRecordNames("harvests", item));
  data.billings = data.billings.map((item) => normalizeRecordNames("billings", item));
  data.contracts = data.contracts.map((item) => normalizeRecordNames("contracts", item));
  data.storageReturns = data.storageReturns.map((item) => normalizeRecordNames("storageReturns", item));
  data.cropPlans = data.cropPlans.map((item) => normalizeRecordNames("cropPlans", item));
  data.costs = data.costs.map((item) => normalizeRecordNames("costs", item));
  data.directories = data.directories.map((item) => normalizeRecordNames("directories", item));
}

function fieldLabel(field) {
  return {
    customer: "Cliente",
    contractNumber: "Contrato",
    crop: "Cultura",
    season: "Safra",
    date: "Data",
    nfp: "NFP",
    nfe: "NFE",
    cte: "CT-e",
    transporter: "Transportador",
    cooperative: "Cooperativa",
    company: "Empresa",
    invoice: "Nota fiscal",
    kgContracted: "KG contrato",
    exitWeight: "Peso saida",
    netWeight: "Peso liquido",
    weightKg: "Peso kg",
    totalFreight: "Total frete",
    freightPaid: "Frete pago",
    receiptPaid: "Recebimento pago",
    contractClosed: "Contrato fechado",
    closed: "Safra fechada",
    paymentDeadline: "Prazo pgto",
    deliveryDeadline: "Prazo entrega"
  }[field] || field;
}

function auditValue(value) {
  if (value === true) return "Sim";
  if (value === false) return "Nao";
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return number(value);
  return String(value);
}

function recordChanges(before = {}, after = {}) {
  const ignored = new Set(["id", "createdAt", "updatedAt"]);
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])].filter((key) => !ignored.has(key));
  return keys
    .filter((key) => JSON.stringify(before?.[key] ?? "") !== JSON.stringify(after?.[key] ?? ""))
    .map((key) => ({
      field: key,
      label: fieldLabel(key),
      from: auditValue(before?.[key]),
      to: auditValue(after?.[key])
    }));
}

function changesText(changes = []) {
  if (!changes.length) return "-";
  return changes.slice(0, 6).map((item) => `${item.label}: ${item.from} -> ${item.to}`).join("; ");
}

function supabaseErrorMessage(action, table, error) {
  const details = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ");
  return details
    ? `Nao foi possivel ${action} no Supabase (${table}). Detalhe: ${details}`
    : `Nao foi possivel ${action} no Supabase (${table}). Verifique a conexao e as regras do banco.`;
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
  loadSyncLogs();
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
    runScheduledBackups();
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
  const [harvestsResult, billingsResult, contractsResult, storageReturnsResult, cropPlansResult, costsResult, directoriesResult] = await Promise.all([
    supabaseClient.from("harvests").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("billings").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("contracts").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("storage_returns").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("crop_plans").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("costs").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("directories").select("*").order("created_at", { ascending: false })
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
  data.costs = costsResult.error ? [] : costsResult.data.map(rowToRecord);
  data.directories = directoriesResult.error ? [] : directoriesResult.data.map(rowToRecord);
  try {
    const auditResult = await supabaseClient.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(250);
    data.auditLogs = auditResult.error ? data.auditLogs || [] : auditResult.data.map(rowToRecord);
  } catch {
    data.auditLogs = data.auditLogs || [];
  }
  try {
    const deletedResult = await supabaseClient.from("deleted_items").select("*").order("created_at", { ascending: false }).limit(100);
    data.deletedItems = deletedResult.error ? data.deletedItems || [] : deletedResult.data.map(rowToRecord);
  } catch {
    data.deletedItems = data.deletedItems || [];
  }
  saveAutoBackup();
  runScheduledBackups();
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
    .on("postgres_changes", { event: "*", schema: "public", table: "costs" }, scheduleCloudRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "directories" }, scheduleCloudRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "audit_logs" }, scheduleCloudRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "deleted_items" }, scheduleCloudRefresh)
    .subscribe();
}

function scheduleCloudRefresh() {
  clearTimeout(cloudRefreshTimer);
  cloudRefreshTimer = setTimeout(fetchCloudData, 250);
}

async function addRecord(collection, record) {
  record = normalizeRecordNames(collection, record);
  if (collection !== "cropPlans" && recordIsClosed(record)) {
    alert("Esta safra esta fechada. Reabra a safra para fazer novos lancamentos.");
    return;
  }
  if (!confirmDuplicates(collection, record)) return;
  const payload = cleanPayload({ createdAt: new Date().toISOString(), ...record });

  if (useCloud) {
    const table = tableName(collection);
    const { data: inserted, error } = await supabaseClient.from(table).insert([{ payload }]).select("id").single();
    if (error) {
      pushSyncLog({ action: "Criar", collection, table, payload, message: supabaseErrorMessage("salvar", table, error) });
      alert(supabaseErrorMessage("salvar", table, error));
      return;
    }
    await recordAudit("Criou", collection, { id: inserted?.id, ...payload }, recordChanges({}, payload));
    await fetchCloudData();
    saveAutoBackup();
    return;
  }

  const localRecord = { id: crypto.randomUUID(), ...payload };
  data[collection].unshift(localRecord);
  await recordAudit("Criou", collection, localRecord, recordChanges({}, localRecord));
  saveLocal();
  saveAutoBackup();
  render();
}

async function updateRecord(collection, id, record) {
  const existing = data[collection].find((item) => item.id === id);
  const payload = cleanPayload(normalizeRecordNames(collection, { ...existing, ...record, updatedAt: new Date().toISOString() }));
  delete payload.id;
  if (collection !== "cropPlans" && recordIsClosed(payload)) {
    alert("Esta safra esta fechada. Reabra a safra para alterar lancamentos.");
    return;
  }
  if (!confirmDuplicates(collection, payload, id)) return;

  if (useCloud) {
    const table = tableName(collection);
    const { error } = await supabaseClient.from(table).update({ payload }).eq("id", id);
    if (error) {
      pushSyncLog({ action: "Alterar", collection, table, recordId: id, payload, message: supabaseErrorMessage("atualizar", table, error) });
      alert(supabaseErrorMessage("atualizar", table, error));
    }
    else {
      await recordAudit("Alterou", collection, { id, ...payload }, recordChanges(existing || {}, { id, ...payload }));
      await fetchCloudData();
      saveAutoBackup();
    }
    return;
  }

  data[collection] = data[collection].map((item) => (item.id === id ? { id, ...payload } : item));
  await recordAudit("Alterou", collection, { id, ...payload }, recordChanges(existing || {}, { id, ...payload }));
  saveLocal();
  saveAutoBackup();
  render();
}

async function deleteRecord(collection, id) {
  const existing = data[collection].find((item) => item.id === id);
  if (!existing) return;
  if (collection !== "cropPlans" && recordIsClosed(existing)) {
    alert("Esta safra esta fechada. Reabra a safra para excluir lancamentos.");
    return;
  }
  const deletedPayload = {
    originalCollection: collection,
    originalId: id,
    summary: recordSummary(collection, existing),
    deletedAt: new Date().toISOString(),
    record: existing
  };
  if (useCloud) {
    const table = tableName(collection);
    const { error: trashError } = await supabaseClient.from("deleted_items").insert([{ payload: deletedPayload }]);
    if (trashError) {
      pushSyncLog({ action: "Mover para lixeira", collection: "deletedItems", table: "deleted_items", payload: deletedPayload, message: supabaseErrorMessage("mover para lixeira", "deleted_items", trashError) });
      alert(supabaseErrorMessage("mover para lixeira", "deleted_items", trashError));
      return;
    }
    const { error } = await supabaseClient.from(table).delete().eq("id", id);
    if (error) {
      pushSyncLog({ action: "Excluir", collection, table, recordId: id, payload: existing, message: supabaseErrorMessage("excluir", table, error) });
      alert(supabaseErrorMessage("excluir", table, error));
    }
    else {
      await recordAudit("Excluiu", collection, existing || { id }, [{ label: "Exclusao", from: "Ativo", to: "Lixeira" }]);
      await fetchCloudData();
      saveAutoBackup();
    }
    return;
  }

  data.deletedItems.unshift({ id: crypto.randomUUID(), ...deletedPayload });
  data[collection] = data[collection].filter((item) => item.id !== id);
  await recordAudit("Excluiu", collection, existing || { id }, [{ label: "Exclusao", from: "Ativo", to: "Lixeira" }]);
  saveLocal();
  saveAutoBackup();
  render();
}

async function restoreDeletedItem(id) {
  const deleted = data.deletedItems.find((item) => item.id === id);
  if (!deleted) return;
  const collection = deleted.originalCollection;
  const restored = { ...(deleted.record || {}) };
  delete restored.id;
  if (useCloud) {
    const { error: insertError } = await supabaseClient.from(tableName(collection)).insert([{ payload: cleanPayload(restored) }]);
    if (insertError) {
      pushSyncLog({ action: "Restaurar", collection, table: tableName(collection), payload: restored, message: supabaseErrorMessage("restaurar", tableName(collection), insertError) });
      alert(supabaseErrorMessage("restaurar", tableName(collection), insertError));
      return;
    }
    await supabaseClient.from("deleted_items").delete().eq("id", id);
    await recordAudit("Restaurou", collection, restored, [{ label: "Restauracao", from: "Lixeira", to: "Ativo" }]);
    await fetchCloudData();
    return;
  }
  data[collection].unshift({ id: crypto.randomUUID(), ...restored });
  data.deletedItems = data.deletedItems.filter((item) => item.id !== id);
  await recordAudit("Restaurou", collection, restored, [{ label: "Restauracao", from: "Lixeira", to: "Ativo" }]);
  saveLocal();
  render();
}

function tableName(collection) {
  if (collection === "auditLogs") return "audit_logs";
  if (collection === "deletedItems") return "deleted_items";
  if (collection === "cropPlans") return "crop_plans";
  if (collection === "costs") return "costs";
  if (collection === "directories") return "directories";
  return collection === "storageReturns" ? "storage_returns" : collection;
}

function collectionLabel(collection) {
  return {
    harvests: "Colheitas",
    billings: "Faturamento",
    contracts: "Contratos",
    storageReturns: "Retorno",
    cropPlans: "Safras",
    costs: "DRE / Custos",
    directories: "Cadastros",
    auditLogs: "Historico",
    deletedItems: "Lixeira"
  }[collection] || collection;
}

function recordSummary(collection, record = {}) {
  if (collection === "contracts") return `${record.customer || "-"} / contrato ${record.contractNumber || "-"}`;
  if (collection === "billings") return `${record.customer || "-"} / NFP ${record.nfp || "-"} / contrato ${record.contractNumber || "-"}`;
  if (collection === "harvests") return `${record.crop || "-"} / ${transportName(record)} / ${kg(harvestQuantity(record))}`;
  if (collection === "storageReturns") return `${record.company || "-"} / ${kg(record.weightKg)}`;
  if (collection === "cropPlans") return `${record.crop || "-"} / ${record.season || "-"}`;
  if (collection === "costs") return `${record.category || "-"} / ${record.description || "-"} / ${money(record.amount || 0)}`;
  if (collection === "directories") return `${directoryTypeLabel(record.type)} / ${record.name || "-"}`;
  return record.id || "-";
}

function similarNumber(a, b, tolerance = 1) {
  return Math.abs(Number(a || 0) - Number(b || 0)) <= tolerance;
}

function duplicateWarnings(collection, record = {}, ignoreId = "") {
  const warnings = [];
  const items = (data[collection] || []).filter((item) => item.id !== ignoreId);
  if (collection === "billings") {
    if (record.nfp && items.some((item) => String(item.nfp || "") === String(record.nfp))) warnings.push(`NFP ${record.nfp} ja existe no faturamento.`);
    if (record.nfe && items.some((item) => String(item.nfe || "") === String(record.nfe))) warnings.push(`NFE ${record.nfe} ja existe no faturamento.`);
    if (record.contractNumber && record.exitWeight && items.some((item) => item.contractNumber === record.contractNumber && similarNumber(item.exitWeight, record.exitWeight, 5))) {
      warnings.push("Contrato e peso de saida parecidos com outro faturamento.");
    }
  }
  if (collection === "harvests") {
    if (record.invoice && items.some((item) => String(item.invoice || "") === String(record.invoice))) warnings.push(`Nota fiscal ${record.invoice} ja existe em colheitas.`);
    if (record.date && record.transporter && record.netWeight && items.some((item) => item.date === record.date && transportName(item) === record.transporter && similarNumber(harvestQuantity(item), record.netWeight, 5))) {
      warnings.push("Data, transportador e peso liquido parecidos com outra colheita.");
    }
  }
  if (collection === "contracts") {
    if (record.contractNumber && items.some((item) => String(item.contractNumber || "") === String(record.contractNumber))) warnings.push(`Contrato ${record.contractNumber} ja existe.`);
  }
  if (collection === "storageReturns") {
    if (record.nfe && items.some((item) => String(item.nfe || "") === String(record.nfe))) warnings.push(`NFE ${record.nfe} ja existe em retornos.`);
    if (record.nfp && items.some((item) => String(item.nfp || "") === String(record.nfp))) warnings.push(`NFP ${record.nfp} ja existe em retornos.`);
  }
  return warnings;
}

function confirmDuplicates(collection, record, ignoreId = "") {
  const warnings = duplicateWarnings(collection, record, ignoreId);
  if (!warnings.length) return true;
  return confirm(`Possivel lancamento duplicado:\n\n${warnings.join("\n")}\n\nDeseja salvar mesmo assim?`);
}

function contractMargin(contract) {
  const billings = contractBillings(contract);
  const netInvoice = billings.reduce((sum, item) => sum + Number(item.netInvoice || 0), 0);
  const freight = billings.reduce((sum, item) => sum + Number(item.totalFreight || 0), 0);
  const funrural = billings.reduce((sum, item) => sum + Number(item.funrural || 0), 0) || Number(contract.funrural || 0);
  const commission = Number(contract.commissionValue || 0);
  const royalties = Number(contract.royaltiesValue || 0);
  const billedKg = billings.reduce((sum, item) => sum + billingWeight(item), 0);
  const margin = netInvoice - freight - commission - royalties;
  return { netInvoice, freight, funrural, commission, royalties, margin, billedKg, marginPerKg: billedKg ? margin / billedKg : 0 };
}

function closingChecklistFor(crop, season) {
  const billings = data.billings.filter((item) => item.crop === crop && recordSeason(item) === season);
  const contracts = data.contracts.filter((item) => item.crop === crop && recordSeason(item) === season);
  const freights = freightRows().filter((item) => item.crop === crop && item.season === season);
  const openFreight = freights.filter((item) => !item.paid && Number(item.freightValue || 0) > 0).length;
  const overdueReceipt = contracts.filter((item) => !receiptPaidStatus(item) && daysUntil(item.paymentDeadline) !== null && daysUntil(item.paymentDeadline) < 0).length;
  const openContract = contracts.filter((item) => !item.contractClosed && contractBalanceKg(item) > 60).length;
  const missingDocs = billings.filter((item) => !item.nfe || !item.cte).length;
  return {
    crop,
    season,
    openFreight,
    overdueReceipt,
    openContract,
    missingDocs,
    ok: openFreight === 0 && overdueReceipt === 0 && openContract === 0 && missingDocs === 0
  };
}

async function recordAudit(action, collection, record = {}, changes = []) {
  const operatorText = document.getElementById("user-email")?.textContent || "Acesso geral";
  const payload = {
    action,
    collection,
    collectionLabel: collectionLabel(collection),
    summary: recordSummary(collection, record),
    recordId: record.id || "",
    operator: operatorText === "Acesso liberado" ? "Acesso geral" : operatorText,
    changes,
    changesText: changesText(changes),
    createdAt: new Date().toISOString()
  };
  data.auditLogs = [{ id: crypto.randomUUID(), ...payload }, ...(data.auditLogs || [])].slice(0, 250);
  if (useCloud) {
    try {
      await supabaseClient.from("audit_logs").insert([{ payload }]);
    } catch {
      // Historico e complementar; falha nele nao deve bloquear lancamentos.
    }
  } else {
    saveLocal();
  }
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
  return Number(item.bags || bagsForWeight(storageReturnWeight(item), item.crop) || 0);
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

function bagSizeForCrop(crop) {
  return cropBagKg[crop] || 60;
}

function bagsForWeight(weight, crop) {
  return Number(weight || 0) / bagSizeForCrop(crop);
}

function bagLabel(crop) {
  return `${bagSizeForCrop(crop)} kg/sc`;
}

function paidStatus(item) {
  return item.freightPaid === true || item.freightPaid === "on";
}

function receiptPaidStatus(item) {
  return item.receiptPaid === true || item.receiptPaid === "on" || (receiptPaymentValue(item) >= receiptTotalValue(item) && receiptTotalValue(item) > 0);
}

function receiptTotalValue(item) {
  return Number(item.receiptSource === "billing" || (!item.netValue && item.netInvoice) ? item.netInvoice || 0 : item.totalNetValue || item.netValue || 0);
}

function receiptPaymentValue(item) {
  return Number(item.receiptValue1 || 0) + Number(item.receiptValue2 || 0);
}

function receiptBalanceValue(item) {
  return Math.max(receiptTotalValue(item) - receiptPaymentValue(item), 0);
}

function receiptWeight(item) {
  return Number(item.kgContracted || item.exitWeight || 0);
}

function receiptBags(item) {
  return Number(item.bagsContracted || item.bags || bagsForWeight(receiptWeight(item), item.crop) || 0);
}

function receiptDueDate(item) {
  return item.paymentDeadline || item.receiptDate || "";
}

function receiptRows() {
  const contractRows = data.contracts.map((item) => ({ ...item, receiptSource: "contract", receiptLabel: item.contractNumber || "-" }));
  const saleRows = data.billings
    .filter((item) => !item.contractNumber || item.saleMode !== "Contrato" || item.priceStatus === "A fixar" || item.priceStatus === "Parcialmente fixado")
    .map((item) => ({
      ...item,
      receiptSource: "billing",
      receiptLabel: item.contractNumber || item.nfp || item.nfe || "-",
      paymentDeadline: item.receiptDate,
      totalNetValue: item.netInvoice
    }));
  return [...contractRows, ...saleRows];
}

function contractBillings(contract) {
  return data.billings.filter((item) => item.contractNumber && item.contractNumber === contract.contractNumber);
}

function contractBilledWeight(contract) {
  return contractBillings(contract).reduce((sum, item) => sum + billingWeight(item), 0);
}

function contractBalanceKg(contract) {
  return Number(contract.kgContracted || 0) - contractBilledWeight(contract);
}

function contractReceiptOpenValue(contract) {
  return receiptPaidStatus(contract) ? 0 : receiptTotalValue(contract);
}

function contractStatus(contract) {
  if (contract.closingStatus) return contract.closingStatus;
  if (Number(contract.closingToFixKg || 0) > 0 || Number(contract.closingToFixValue || 0) > 0) return "Fechado com saldo a fixar";
  if (Number(contract.closingPendingInvoiceKg || 0) > 0 || Number(contract.closingPendingInvoiceValue || 0) > 0) return "Fechado com NF pendente";
  if (Number(contract.closingReceivableKg || 0) > 0 || Number(contract.closingReceivableValue || 0) > 0) return "Fechado com valor a receber";
  const balance = contractBalanceKg(contract);
  const billed = contractBilledWeight(contract);
  const paidValue = receiptPaymentValue(contract);
  if (contract.contractClosed) return "Fechado";
  if (receiptPaidStatus(contract)) return "Recebido";
  if (paidValue > 0) return "Recebido parcial";
  if (billed <= 0) return "Aberto";
  if (balance > 0) return "Parcial";
  if (balance < 0) return "Faturado + excedente";
  return "Faturado";
}

function contractStatusClass(status) {
  const normalized = normalizeLookup(status);
  if (normalized.includes("EXCEDENTE")) return "status-excess";
  if (normalized.includes("FIXAR")) return "status-fix";
  if (normalized.includes("PENDENTE")) return "status-pending";
  if (normalized.includes("RECEBIDO")) return "status-received";
  if (normalized.includes("FECHADO") || normalized.includes("FATURADO")) return "status-closed";
  if (normalized.includes("PARCIAL")) return "status-partial";
  if (normalized.includes("ABERTO")) return "status-open";
  return "";
}

function contractStatusDisplay(status) {
  const normalized = normalizeLookup(status);
  if (normalized.includes("EXCEDENTE")) return "Excedente";
  if (normalized.includes("FIXAR")) return "A fixar";
  if (normalized.includes("PENDENTE")) return "Pendente";
  if (normalized.includes("RECEBIDO")) return normalized.includes("PARCIAL") ? "Recebido parcial" : "Recebido";
  if (normalized.includes("FECHADO") || normalized.includes("FATURADO")) return "Fechado";
  if (normalized.includes("PARCIAL")) return "Parcial";
  if (normalized.includes("ABERTO")) return "Aberto";
  return status || "-";
}

function netMarginValue(billings, contracts) {
  const netInvoice = billings.reduce((sum, item) => sum + Number(item.netInvoice || 0), 0);
  const freight = billings.reduce((sum, item) => sum + Number(item.totalFreight || 0), 0);
  const costs = contracts.reduce((sum, item) => sum + Number(item.commissionValue || 0) + Number(item.royaltiesValue || 0), 0);
  return netInvoice - freight - costs;
}

function freightTotalValue(record) {
  return Number(record.totalFreight || record.harvestFreightValue || 0);
}

function freightPaymentValue(record) {
  return Number(record.freightPaymentValue1 || 0) + Number(record.freightPaymentValue2 || 0);
}

function freightIsPaid(record) {
  const total = freightTotalValue(record);
  return paidStatus(record) || (total > 0 && freightPaymentValue(record) >= total);
}

function isSeasonClosed(crop, season) {
  return data.cropPlans.some((item) => item.crop === crop && recordSeason(item) === season && item.closed === true);
}

function recordIsClosed(record) {
  return isSeasonClosed(record.crop, recordSeason(record));
}

function requireDeleteText() {
  const typed = prompt("Para excluir, digite EXCLUIR. O lancamento ira para a lixeira temporaria.");
  return typed === "EXCLUIR";
}

function confirmChange(message = "Tem certeza que deseja confirmar esta alteracao?") {
  return confirm(message);
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
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = rows.length ? rows.join("") : emptyRow(colspan);
  const table = target.closest("table");
  if (!table) return;
  const labels = [...table.querySelectorAll("thead th")].map((item) => item.textContent.trim());
  target.querySelectorAll("tr").forEach((row) => {
    [...row.children].forEach((cell, index) => {
      if (labels[index] && !cell.dataset.label) cell.dataset.label = labels[index];
    });
  });
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
  const netMargin = netMarginValue(billings, contracts);
  const avgNetPrice = billed ? netInvoice / billed : 0;

  target.innerHTML = [
    insightSummaryCard("Indicadores", [
      insightMetric("Preco medio liquido/kg", money(avgNetPrice), "NF liquida / peso saida"),
      insightMetric("Peso faturado", kg(billed), `${number(billings.length, 0)} notas`),
      insightMetric("Contratado", kg(contracted), `${number(contracts.length, 0)} contratos`),
      insightMetric("Margem liquida", money(netMargin), "NF liquida - fretes - custos")
    ]),
    donutCard("Composicao colhida por cultura", aggregateRows(harvests, (item) => item.crop, harvestQuantity), kg),
    progressCard("Peso faturado sobre colhido", billed, harvested, "Faturado", "Colhido")
  ].join("");
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function dueLabel(days) {
  if (days === null) return "Sem prazo";
  if (days < 0) return `Vencido ha ${Math.abs(days)} dias`;
  if (days === 0) return "Vence hoje";
  return `Vence em ${days} dias`;
}

function renderExecutiveAlerts(contracts) {
  const rows = contracts
    .filter((item) => !receiptPaidStatus(item))
    .map((item) => ({ ...item, days: daysUntil(item.paymentDeadline) }))
    .filter((item) => item.days !== null && item.days <= 15)
    .sort((a, b) => a.days - b.days);

  renderTable(
    "executive-alerts",
    rows.map((item) => `<tr class="${item.days < 0 ? "danger-row" : item.days <= 7 ? "warning-row" : ""}">
      <td class="strong-cell">${escapeHtml(item.customer)}</td>
      <td>${escapeHtml(item.contractNumber)}</td>
      <td>${escapeHtml(shortDate(item.paymentDeadline))}</td>
      <td class="number strong-cell">${money(receiptTotalValue(item))}</td>
      <td>${escapeHtml(dueLabel(item.days))}</td>
    </tr>`),
    5
  );
}

function renderAuditLogs() {
  renderTable(
    "audit-log-list",
    (data.auditLogs || []).slice(0, 12).map((item) => `<tr>
      <td>${escapeHtml(shortDate(String(item.createdAt || "").slice(0, 10)))}</td>
      <td>${escapeHtml(item.operator || "Acesso geral")}</td>
      <td class="strong-cell">${escapeHtml(item.action || "-")}</td>
      <td>${escapeHtml(item.collectionLabel || collectionLabel(item.collection))}</td>
      <td>${escapeHtml(item.summary || "-")}</td>
    </tr>`),
    5
  );
}

function renderFullAudit() {
  const term = auditSearchTerm.toLowerCase();
  const rows = (data.auditLogs || []).filter((item) =>
    [item.action, item.collectionLabel, collectionLabel(item.collection), item.summary, item.changesText]
      .join(" ")
      .toLowerCase()
      .includes(term)
  );
  renderTable(
    "audit-full-list",
    rows.map((item) => `<tr>
      <td>${escapeHtml(shortDate(String(item.createdAt || "").slice(0, 10)))}</td>
      <td>${escapeHtml(item.operator || "Acesso geral")}</td>
      <td class="strong-cell">${escapeHtml(item.action || "-")}</td>
      <td>${escapeHtml(item.collectionLabel || collectionLabel(item.collection))}</td>
      <td>${escapeHtml(item.summary || "-")}</td>
      <td>${escapeHtml(item.changesText || changesText(item.changes || []))}</td>
    </tr>`),
    6
  );
}

function openRecordHistory(collection, id) {
  const record = data[collection]?.find((item) => item.id === id);
  const title = document.getElementById("history-title");
  const modal = document.getElementById("history-modal");
  if (!modal || !title) return;
  title.textContent = `Historico: ${recordSummary(collection, record || { id })}`;
  renderTable(
    "history-list",
    (data.auditLogs || [])
      .filter((item) => item.collection === collection && item.recordId === id)
      .map((item) => `<tr>
        <td>${escapeHtml(shortDate(String(item.createdAt || "").slice(0, 10)))}</td>
        <td>${escapeHtml(item.operator || "Acesso geral")}</td>
        <td class="strong-cell">${escapeHtml(item.action || "-")}</td>
        <td>${escapeHtml(item.changesText || changesText(item.changes || []))}</td>
      </tr>`),
    4
  );
  modal.classList.remove("hidden");
}

function closeRecordHistory() {
  document.getElementById("history-modal")?.classList.add("hidden");
}

function automaticAlerts() {
  const deliverySoon = data.contracts.filter((item) => !item.contractClosed && daysUntil(item.deliveryDeadline) !== null && daysUntil(item.deliveryDeadline) <= 10);
  const receiptsSoon = data.contracts.filter((item) => !receiptPaidStatus(item) && daysUntil(item.paymentDeadline) !== null && daysUntil(item.paymentDeadline) >= 0 && daysUntil(item.paymentDeadline) <= 7);
  const oldFreights = freightRows().filter((item) => !item.paid && daysUntil(item.date) !== null && daysUntil(item.date) < -15);
  const closedWithPending = data.cropPlans.filter((plan) => {
    if (!plan.closed) return false;
    const crop = plan.crop;
    const season = recordSeason(plan);
    const contracts = data.contracts.filter((item) => item.crop === crop && recordSeason(item) === season);
    const billings = data.billings.filter((item) => item.crop === crop && recordSeason(item) === season);
    const openReceipt = contracts.some((item) => !receiptPaidStatus(item));
    const openFreight = freightRows().some((item) => item.crop === crop && item.season === season && !item.paid && Number(item.freightValue || 0) > 0);
    const missingDocs = billings.some((item) => !item.nfe || !item.cte);
    return openReceipt || openFreight || missingDocs;
  });
  return { deliverySoon, receiptsSoon, oldFreights, closedWithPending };
}

function renderAutomaticAlerts() {
  const target = document.getElementById("automatic-alert-cards");
  if (!target) return;
  const alerts = automaticAlerts();
  target.innerHTML = [
    insightSummaryCard("Contrato perto do prazo", [
      insightMetric("Alertas", number(alerts.deliverySoon.length, 0), "Prazo final em ate 10 dias"),
      insightMetric("KG", kg(alerts.deliverySoon.reduce((sum, item) => sum + Math.max(contractBalanceKg(item), 0), 0)))
    ]),
    insightSummaryCard("Recebimento proximos 7 dias", [
      insightMetric("Contratos", number(alerts.receiptsSoon.length, 0)),
      insightMetric("Valor", money(alerts.receiptsSoon.reduce((sum, item) => sum + receiptBalanceValue(item), 0)))
    ]),
    insightSummaryCard("Frete aberto ha muitos dias", [
      insightMetric("Lancamentos", number(alerts.oldFreights.length, 0), "Mais de 15 dias"),
      insightMetric("Saldo", money(alerts.oldFreights.reduce((sum, item) => sum + Math.max(Number(item.freightValue || 0) - Number(item.paymentValue1 || 0) - Number(item.paymentValue2 || 0), 0), 0)))
    ]),
    insightSummaryCard("Safra fechada com pendencias", [
      insightMetric("Safras", number(alerts.closedWithPending.length, 0)),
      insightMetric("Status", alerts.closedWithPending.length ? "Revisar" : "OK")
    ])
  ].join("");
}

async function retrySyncLog(item) {
  if (!useCloud || !supabaseClient) {
    alert("O app nao esta conectado ao Supabase neste momento.");
    return;
  }
  updateSyncLog(item.id, { status: "Reenviando" });
  try {
    if (item.action === "Criar" || item.action === "Restaurar") {
      const { error } = await supabaseClient.from(item.table).insert([{ payload: cleanPayload(item.payload) }]);
      if (error) throw error;
    } else if (item.action === "Mover para lixeira") {
      const { error: insertError } = await supabaseClient.from("deleted_items").insert([{ payload: cleanPayload(item.payload) }]);
      if (insertError) throw insertError;
      const originalTable = tableName(item.payload.originalCollection);
      const { error: deleteError } = await supabaseClient.from(originalTable).delete().eq("id", item.payload.originalId);
      if (deleteError) throw deleteError;
    } else if (item.action === "Alterar") {
      const { error } = await supabaseClient.from(item.table).update({ payload: cleanPayload(item.payload) }).eq("id", item.recordId);
      if (error) throw error;
    } else if (item.action === "Excluir") {
      const { error } = await supabaseClient.from(item.table).delete().eq("id", item.recordId);
      if (error) throw error;
    }
    updateSyncLog(item.id, { status: "Resolvido", message: "Reenviado com sucesso." });
    await fetchCloudData();
  } catch (error) {
    updateSyncLog(item.id, { status: "Pendente", message: error?.message || "Falha ao reenviar." });
  }
}

async function retryPendingSyncLogs() {
  for (const item of syncLogs.filter((log) => log.status !== "Resolvido")) {
    await retrySyncLog(item);
  }
}

function renderSyncLogs() {
  const target = document.getElementById("sync-log-list");
  if (!target) return;
  renderTable(
    "sync-log-list",
    syncLogs.slice(0, 30).map((item) => `<tr class="${item.status === "Resolvido" ? "" : "warning-row"}">
      <td>${escapeHtml(shortDate(String(item.createdAt || "").slice(0, 10)))}</td>
      <td class="strong-cell">${escapeHtml(item.action || "-")}</td>
      <td>${escapeHtml(collectionLabel(item.collection))}</td>
      <td>${escapeHtml(item.status || "-")}</td>
      <td>${escapeHtml(item.message || "-")}</td>
      <td class="row-actions">${item.status === "Resolvido" ? "" : `<button class="edit" data-retry-sync="${item.id}">Reenviar</button>`}</td>
    </tr>`),
    6
  );
}

function renderScheduledBackups() {
  const target = document.getElementById("scheduled-backup-list");
  if (!target) return;
  const rows = scheduledBackups();
  renderTable(
    "scheduled-backup-list",
    rows.slice(0, 10).map((item) => `<tr>
      <td>${escapeHtml(shortDate(String(item.createdAt || "").slice(0, 10)))}</td>
      <td class="strong-cell">${escapeHtml(item.type)}</td>
      <td class="number">${number(item.count, 0)}</td>
    </tr>`),
    3
  );
}

function downloadLatestScheduledBackup() {
  const latest = scheduledBackups()[0];
  if (!latest) {
    alert("Ainda nao existe backup automatico salvo neste navegador.");
    return;
  }
  downloadText(`backup-automatico-${latest.type.toLowerCase()}-${String(latest.createdAt).slice(0, 10)}.json`, JSON.stringify(latest.data, null, 2), "application/json;charset=utf-8");
}

function renderClientReport(contracts, billings) {
  const rows = {};
  contracts.forEach((item) => {
    const key = item.customer || "Sem cliente";
    if (!rows[key]) rows[key] = { client: key, contracted: 0, billed: 0, received: 0, open: 0, funrural: 0, freight: 0 };
    rows[key].contracted += Number(item.kgContracted || 0);
    rows[key].received += receiptPaidStatus(item) ? receiptTotalValue(item) : 0;
    rows[key].open += receiptPaidStatus(item) ? 0 : receiptTotalValue(item);
  });
  billings.forEach((item) => {
    const key = item.customer || "Sem cliente";
    if (!rows[key]) rows[key] = { client: key, contracted: 0, billed: 0, received: 0, open: 0, funrural: 0, freight: 0 };
    rows[key].billed += billingWeight(item);
    rows[key].funrural += Number(item.funrural || 0);
    rows[key].freight += Number(item.totalFreight || 0);
  });

  renderTable(
    "client-report-list",
    Object.values(rows)
      .sort((a, b) => b.open - a.open)
      .map((item) => `<tr>
        <td class="strong-cell">${escapeHtml(item.client)}</td>
        <td class="number">${kg(item.contracted)}</td>
        <td class="number">${kg(item.billed)}</td>
        <td class="number strong-cell">${money(item.received)}</td>
        <td class="number strong-cell">${money(item.open)}</td>
        <td class="number">${money(item.funrural)}</td>
        <td class="number">${money(item.freight)}</td>
      </tr>`),
    7
  );
}

function monthKey(value) {
  if (!value) return "Sem data";
  return String(value).slice(0, 7);
}

function renderMonthlySummary(billings, contracts) {
  const rows = {};
  billings.forEach((item) => {
    const key = monthKey(item.date);
    if (!rows[key]) rows[key] = { month: key, gross: 0, net: 0, received: 0, open: 0 };
    rows[key].gross += Number(item.totalValue || 0);
    rows[key].net += Number(item.netInvoice || 0);
  });
  contracts.forEach((item) => {
    const key = monthKey(item.paymentDeadline);
    if (!rows[key]) rows[key] = { month: key, gross: 0, net: 0, received: 0, open: 0 };
    if (receiptPaidStatus(item)) rows[key].received += receiptTotalValue(item);
    else rows[key].open += receiptTotalValue(item);
  });

  renderTable(
    "monthly-summary-list",
    Object.values(rows)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => `<tr>
        <td class="strong-cell">${escapeHtml(item.month)}</td>
        <td class="number">${money(item.gross)}</td>
        <td class="number">${money(item.net)}</td>
        <td class="number strong-cell">${money(item.received)}</td>
        <td class="number strong-cell">${money(item.open)}</td>
      </tr>`),
    5
  );
}

function renderDataQualityAlerts() {
  const rows = [];
  data.contracts.forEach((item) => {
    if (!item.paymentDeadline) rows.push({ area: "Contratos", record: item.contractNumber || item.customer || "-", issue: "Informar prazo de pagamento", priority: "Media" });
    if (!item.deliveryDeadline) rows.push({ area: "Contratos", record: item.contractNumber || item.customer || "-", issue: "Informar prazo final de entrega", priority: "Media" });
    if (!item.crop || !item.season) rows.push({ area: "Contratos", record: item.contractNumber || "-", issue: "Completar cultura ou safra", priority: "Alta" });
  });
  data.billings.forEach((item) => {
    if (!item.contractNumber) rows.push({ area: "Faturamento", record: item.nfp || item.nfe || "-", issue: "Vincular contrato, se houver", priority: "Baixa" });
    if (!item.nfe) rows.push({ area: "Faturamento", record: item.nfp || "-", issue: "Informar NFE", priority: "Alta" });
    if (!transportName(item) || transportName(item) === "Sem transportador") rows.push({ area: "Faturamento", record: item.nfp || "-", issue: "Informar transportador", priority: "Media" });
  });
  data.harvests.forEach((item) => {
    if (!transportName(item) || transportName(item) === "Sem transportador") rows.push({ area: "Colheitas", record: item.invoice || item.date || "-", issue: "Informar transportador", priority: "Media" });
    if (!item.cooperative) rows.push({ area: "Colheitas", record: item.invoice || item.date || "-", issue: "Informar destino/cooperativa", priority: "Alta" });
  });

  renderTable(
    "data-quality-list",
    rows.slice(0, 80).map((item) => `<tr>
      <td class="strong-cell">${escapeHtml(item.area)}</td>
      <td>${escapeHtml(item.record)}</td>
      <td>${escapeHtml(item.issue)}</td>
      <td><span class="status-pill ${item.priority === "Alta" ? "status-pending" : item.priority === "Media" ? "status-partial" : "status-open"}">${escapeHtml(item.priority)}</span></td>
    </tr>`),
    4
  );
}

function renderHarvestInsights(harvests, byCooperative, byTransporter) {
  const target = document.getElementById("harvest-insights");
  if (!target) return;

  const gross = harvests.reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
  const net = harvests.reduce((sum, item) => sum + harvestQuantity(item), 0);
  const discount = harvests.reduce((sum, item) => sum + Number(item.discountTotal || 0), 0);
  const freight = harvests.reduce((sum, item) => sum + Number(item.harvestFreightValue || 0), 0);
  const adjustmentPositive = harvests.reduce((sum, item) => sum + Math.max(Number(item.adjustmentDifferenceKg || 0), 0), 0);
  const adjustmentNegative = harvests.reduce((sum, item) => sum + Math.max(-Number(item.adjustmentDifferenceKg || 0), 0), 0);
  const adjustmentValue = harvests.reduce((sum, item) => sum + Number(item.adjustmentEstimatedValue || 0), 0);
  const discountPercent = gross ? (discount / gross) * 100 : 0;

  target.innerHTML = [
    insightSummaryCard("Resumo da colheita", [
      insightMetric("Bruto registrado", kg(gross), `${number(harvests.length, 0)} cargas`),
      insightMetric("Descontos", kg(discount), `${number(discountPercent)}% do bruto`),
      insightMetric("Frete previsto", money(freight), "Pelos lancamentos filtrados")
    ]),
    insightSummaryCard("Ajustes de quebra", [
      insightMetric("Desconto a maior", kg(adjustmentPositive), "SC conforme cultura"),
      insightMetric("Quebra/perda", kg(adjustmentNegative), "SC conforme cultura"),
      insightMetric("Valor estimado", money(adjustmentValue), "Ajustes filtrados")
    ]),
    donutCard(
      "Destino da colheita",
      byCooperative.map((item) => ({ label: item.cooperative, value: item.netWeight })),
      kg
    ),
    donutCard(
      "Tipos de ajuste",
      aggregateRows(
        harvests.filter((item) => item.adjustmentType),
        (item) => item.adjustmentType,
        (item) => Math.abs(Number(item.adjustmentDifferenceKg || 0))
      ),
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
  const billed = contracts.reduce((sum, item) => sum + contractBilledWeight(item), 0);
  const pending = contracts.reduce((sum, item) => sum + Math.max(contractBalanceKg(item), 0), 0);
  const excess = contracts.reduce((sum, item) => sum + Math.max(-contractBalanceKg(item), 0), 0);
  const gross = contracts.reduce((sum, item) => sum + Number(item.grossValue || 0), 0);
  const net = contracts.reduce((sum, item) => sum + Number(item.netValue || 0), 0);
  const afterCosts = contracts.reduce((sum, item) => sum + Number(item.totalNetValue || item.netValue || 0), 0);
  const received = contracts.filter(receiptPaidStatus).reduce((sum, item) => sum + receiptTotalValue(item), 0);
  const openReceipt = contracts.reduce((sum, item) => sum + contractReceiptOpenValue(item), 0);
  const costImpact = Math.max(net - afterCosts, 0);

  target.innerHTML = [
    insightSummaryCard("Carteira de contratos", [
      insightMetric("KG vendido", kg(kgTotal), "SC conforme cultura"),
      insightMetric("KG faturado", kg(billed), `${kg(pending)} pendente`),
      insightMetric("Excedente faturado", kg(excess), "Permitido para fechamento")
    ]),
    insightSummaryCard("Valores dos contratos", [
      insightMetric("Bruto contratado", money(gross), `${number(contracts.length, 0)} contratos`),
      insightMetric("Liquido final", money(afterCosts), `${money(costImpact)} comissoes/royalties`),
      insightMetric("Recebimentos", money(received), `${money(openReceipt)} a receber`)
    ]),
    donutCard("Contratos por cultura", aggregateRows(contracts, (item) => item.crop, (item) => item.kgContracted), kg),
    barCard("Clientes por total liquido", aggregateRows(contracts, (item) => item.customer, receiptTotalValue), money),
    progressCard("Faturado x contratado", billed, kgTotal, "Faturado", "Contratado")
  ].join("");
}

function renderContractMargins(contracts) {
  renderTable(
    "contract-margin-list",
    contracts.map((item) => {
      const margin = contractMargin(item);
      return `<tr class="${margin.margin < 0 ? "danger-row" : ""}">
        <td class="strong-cell">${escapeHtml(item.customer || "-")}</td>
        <td>${escapeHtml(item.contractNumber || "-")}</td>
        <td class="number strong-cell">${money(margin.netInvoice)}</td>
        <td class="number">${money(margin.freight)}</td>
        <td class="number">${money(margin.commission)}</td>
        <td class="number">${money(margin.royalties)}</td>
        <td class="number">${money(margin.funrural)}</td>
        <td class="number strong-cell">${money(margin.margin)}</td>
        <td class="number">${money(margin.marginPerKg)}</td>
      </tr>`;
    }),
    9
  );
}

function renderBillingInsights(billings) {
  const target = document.getElementById("billing-insights");
  if (!target) return;

  const weight = billings.reduce((sum, item) => sum + billingWeight(item), 0);
  const gross = billings.reduce((sum, item) => sum + Number(item.totalValue || 0), 0);
  const funrural = billings.reduce((sum, item) => sum + Number(item.funrural || 0), 0);
  const net = billings.reduce((sum, item) => sum + Number(item.netInvoice || 0), 0);
  const portWeight = billings.reduce((sum, item) => sum + Number(item.portUnloadWeight || 0), 0);
  const weightDifference = weight - portWeight;
  const avgPrice = weight ? gross / weight : 0;
  const fixedWeight = billings.reduce((sum, item) => sum + Number(item.fixedWeight || 0), 0);
  const toFixWeight = billings.reduce((sum, item) => sum + Number(item.toFixWeight || 0), 0);
  const toFixValue = billings.reduce((sum, item) => sum + Number(item.estimatedToFixValue || 0), 0);

  target.innerHTML = [
    insightSummaryCard("Resumo do faturamento", [
      insightMetric("Peso saida", kg(weight), "SC conforme cultura"),
      insightMetric("Preco medio/kg", money(avgPrice), "Total / peso saida"),
      insightMetric("Total liquido", money(net), `${money(funrural)} FUNRURAL`)
    ]),
    insightSummaryCard("Diferenca de peso", [
      insightMetric("Peso saida", kg(weight), "Lancamentos filtrados"),
      insightMetric("Peso porto", kg(portWeight), "Peso descarga porto"),
      insightMetric("Diferenca", kg(weightDifference), "Saida - descarga")
    ]),
    insightSummaryCard("Preco a fixar", [
      insightMetric("Peso fixado", kg(fixedWeight), "SC conforme cultura"),
      insightMetric("Peso a fixar", kg(toFixWeight), "SC conforme cultura"),
      insightMetric("Valor estimado", money(toFixValue), "Pendente de fixacao")
    ]),
    donutCard("Peso faturado por cultura", aggregateRows(billings, (item) => item.crop, billingWeight), kg),
    donutCard("Modalidade da venda", aggregateRows(billings, (item) => item.saleMode || "Contrato", billingWeight), kg),
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
    barCard("Transportadores por frete", aggregateRows(rows, (item) => item.transporter, (item) => item.freightValue), money),
    barCard("Transportadores por kg", aggregateRows(rows, (item) => item.transporter, (item) => item.weight), kg)
  ].join("");
}

function renderReceiptInsights(contracts) {
  const target = document.getElementById("receipt-insights");
  if (!target) return;

  const kgTotal = contracts.reduce((sum, item) => sum + receiptWeight(item), 0);
  const receivable = contracts.reduce((sum, item) => sum + Number(item.netValue || item.netInvoice || 0), 0);
  const afterCosts = contracts.reduce((sum, item) => sum + receiptTotalValue(item), 0);
  const received = contracts.filter(receiptPaidStatus).reduce((sum, item) => sum + receiptTotalValue(item), 0);
  const open = contracts.filter((item) => !receiptPaidStatus(item)).reduce((sum, item) => sum + receiptTotalValue(item), 0);
  const costs = Math.max(receivable - afterCosts, 0);

  target.innerHTML = [
    insightSummaryCard("Conta corrente de recebimentos", [
      insightMetric("KG a receber", kg(kgTotal), "SC conforme cultura"),
      insightMetric("A receber", money(open), `${number(contracts.filter((item) => !receiptPaidStatus(item)).length, 0)} em aberto`),
      insightMetric("Recebido", money(received), `${number(contracts.filter(receiptPaidStatus).length, 0)} pagos`)
    ]),
    donutCard("Recebimentos por cultura", aggregateRows(contracts, (item) => item.crop, receiptTotalValue), money),
    barCard("Clientes a receber", aggregateRows(contracts.filter((item) => !receiptPaidStatus(item)), (item) => item.customer, receiptTotalValue), money),
    donutCard("Status dos recebimentos", [
      { label: "Recebido", value: received },
      { label: "A receber", value: open }
    ], money)
  ].join("");
}

function renderCashForecast(contracts) {
  const rows = {};
  contracts.filter((item) => !receiptPaidStatus(item)).forEach((item) => {
    const client = item.customer || "Sem cliente";
    if (!rows[client]) rows[client] = { client, overdue: 0, seven: 0, thirty: 0, future: 0 };
    const days = daysUntil(receiptDueDate(item));
    const value = receiptBalanceValue(item);
    if (days === null || days > 30) rows[client].future += value;
    else if (days < 0) rows[client].overdue += value;
    else if (days <= 7) rows[client].seven += value;
    else rows[client].thirty += value;
  });

  renderTable(
    "cash-forecast-list",
    Object.values(rows)
      .sort((a, b) => (b.overdue + b.seven + b.thirty + b.future) - (a.overdue + a.seven + a.thirty + a.future))
      .map((item) => {
        const total = item.overdue + item.seven + item.thirty + item.future;
        return `<tr>
          <td class="strong-cell">${escapeHtml(item.client)}</td>
          <td class="number ${item.overdue > 0 ? "danger-text" : ""}">${money(item.overdue)}</td>
          <td class="number ${item.seven > 0 ? "warning-text" : ""}">${money(item.seven)}</td>
          <td class="number">${money(item.thirty)}</td>
          <td class="number">${money(item.future)}</td>
          <td class="number strong-cell">${money(total)}</td>
        </tr>`;
      }),
    6
  );
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
  renderAuditLogs();
  renderClientReport(contracts, billings);
  renderMonthlySummary(billings, contracts);
  renderSeasonComparison();

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

function seasonMetrics(crop, season) {
  const harvests = data.harvests.filter((item) => item.crop === crop && recordSeason(item) === season);
  const billings = data.billings.filter((item) => item.crop === crop && recordSeason(item) === season);
  const contracts = data.contracts.filter((item) => item.crop === crop && recordSeason(item) === season);
  const plans = data.cropPlans.filter((item) => item.crop === crop && recordSeason(item) === season);
  const hectares = plans.reduce((sum, item) => sum + Number(item.hectares || 0), 0);
  const harvested = harvests.reduce((sum, item) => sum + harvestQuantity(item), 0);
  const billed = billings.reduce((sum, item) => sum + billingWeight(item), 0);
  const netInvoice = billings.reduce((sum, item) => sum + Number(item.netInvoice || 0), 0);
  const freight = billings.reduce((sum, item) => sum + Number(item.totalFreight || 0), 0) + harvests.reduce((sum, item) => sum + Number(item.harvestFreightValue || 0), 0);
  return {
    scHa: hectares ? bagsForWeight(harvested, crop) / hectares : 0,
    revenue: netInvoice,
    avgPrice: billed ? netInvoice / billed : 0,
    avgFreight: billed ? freight / (billed / 1000) : 0,
    margin: netMarginValue(billings, contracts)
  };
}

function renderSeasonComparison() {
  const seasons = availableSeasonNames();
  const currentSeason = dashboardFilters.season === "all" ? seasons[0] : dashboardFilters.season;
  const previousSeason = seasons.find((season) => season !== currentSeason) || "";
  const cropsToShow = dashboardFilters.crop === "all" ? availableCropNames() : [dashboardFilters.crop];
  renderTable(
    "season-comparison-list",
    cropsToShow.map((crop) => {
      const current = seasonMetrics(crop, currentSeason);
      const previous = previousSeason ? seasonMetrics(crop, previousSeason) : { scHa: 0, revenue: 0 };
      return `<tr>
        <td><span class="crop-dot">${escapeHtml(crop)}</span></td>
        <td>${escapeHtml(currentSeason || "-")}</td>
        <td>${escapeHtml(previousSeason || "-")}</td>
        <td class="number strong-cell">${number(current.scHa)} SC/ha</td>
        <td class="number">${number(previous.scHa)} SC/ha</td>
        <td class="number strong-cell">${money(current.revenue)}</td>
        <td class="number">${money(previous.revenue)}</td>
        <td class="number">${money(current.avgPrice)}</td>
        <td class="number">${money(current.avgFreight)}</td>
        <td class="number strong-cell">${money(current.margin)}</td>
      </tr>`;
    }),
    10
  );
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
      const averageBags = item.hectares ? bagsForWeight(harvested, item.crop) / item.hectares : 0;
      return `<tr>
        <td><span class="crop-dot">${escapeHtml(item.crop)}</span></td>
        <td>${escapeHtml(item.season)}</td>
        <td class="number">${number(item.hectares)}</td>
        <td class="number strong-cell">${kg(harvested)}</td>
        <td class="number strong-cell">${number(averageBags)} SC/ha</td>
      </tr>`;
    }),
    5
  );
}

function renderQuickFilterOptions() {
  const cropSelect = document.getElementById("quick-crop-filter");
  const seasonSelect = document.getElementById("quick-season-filter");
  if (!cropSelect || !seasonSelect) return;
  const cropsList = availableCropNames();
  const seasonsList = availableSeasonNames();

  cropSelect.innerHTML = [
    `<option value="all">Todas</option>`,
    ...cropsList.map((crop) => `<option value="${escapeHtml(crop)}">${escapeHtml(crop)}</option>`)
  ].join("");

  seasonSelect.innerHTML = [
    `<option value="latest">Ultima safra</option>`,
    `<option value="all">Todas</option>`,
    ...seasonsList.map((season) => `<option value="${escapeHtml(season)}">${escapeHtml(season)}</option>`)
  ].join("");

  if (!cropsList.includes(quickFilters.crop) && quickFilters.crop !== "all") quickFilters.crop = "all";
  if (!seasonsList.includes(quickFilters.season) && !["all", "latest"].includes(quickFilters.season)) quickFilters.season = "latest";
  cropSelect.value = quickFilters.crop;
  seasonSelect.value = quickFilters.season;
}

function matchesQuickFilters(item) {
  const latestSeason = availableSeasonNames()[0] || "";
  const selectedSeason = quickFilters.season === "latest" ? latestSeason : quickFilters.season;
  const cropMatch = quickFilters.crop === "all" || item.crop === quickFilters.crop;
  const seasonMatch = selectedSeason === "all" || !selectedSeason || recordSeason(item) === selectedSeason;
  return cropMatch && seasonMatch;
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

function matchesSummaryFilters(item) {
  const cropMatches = summaryFilters.crop === "all" || item.crop === summaryFilters.crop;
  const seasonMatches = summaryFilters.season === "all" || recordSeason(item) === summaryFilters.season;
  return cropMatches && seasonMatches;
}

function renderSummaryFilterOptions() {
  const cropSelect = document.getElementById("summary-crop-filter");
  const seasonSelect = document.getElementById("summary-season-filter");
  if (!cropSelect || !seasonSelect) return;

  const sourceItems = [...data.harvests, ...data.billings, ...data.contracts, ...data.storageReturns, ...data.cropPlans];
  summaryFilters.crop = setSelectOptions(
    cropSelect,
    [...new Set(sourceItems.map((item) => item.crop).filter(Boolean))].sort(),
    summaryFilters.crop,
    "Todas"
  );
  summaryFilters.season = setSelectOptions(
    seasonSelect,
    [...new Set(sourceItems.map(recordSeason).filter(Boolean))].sort().reverse(),
    summaryFilters.season,
    "Todas"
  );
}

function seasonSummaryRows() {
  const sourceItems = [...data.harvests, ...data.billings, ...data.contracts, ...data.storageReturns, ...data.cropPlans].filter(matchesSummaryFilters);
  const keys = [...new Set(sourceItems.map((item) => `${item.crop || "Sem cultura"}|${recordSeason(item)}`))].sort().reverse();
  return keys.map((key) => {
    const [crop, season] = key.split("|");
    const harvests = data.harvests.filter((item) => (item.crop || "Sem cultura") === crop && recordSeason(item) === season);
    const billings = data.billings.filter((item) => (item.crop || "Sem cultura") === crop && recordSeason(item) === season);
    const contracts = data.contracts.filter((item) => (item.crop || "Sem cultura") === crop && recordSeason(item) === season);
    const returns = data.storageReturns.filter((item) => (item.crop || "Sem cultura") === crop && recordSeason(item) === season);
    const harvested = harvests.reduce((sum, item) => sum + harvestQuantity(item), 0);
    const returned = returns.reduce((sum, item) => sum + storageReturnWeight(item), 0);
    const contracted = contracts.reduce((sum, item) => sum + Number(item.kgContracted || 0), 0);
    const billed = billings.reduce((sum, item) => sum + billingWeight(item), 0);
    const received = contracts.reduce((sum, item) => sum + (receiptPaidStatus(item) ? receiptTotalValue(item) : 0), 0);
    const receivable = contracts.reduce((sum, item) => sum + (receiptPaidStatus(item) ? 0 : receiptBalanceValue(item)), 0);
    const freight = harvests.reduce((sum, item) => sum + Number(item.harvestFreightValue || 0), 0) + billings.reduce((sum, item) => sum + Number(item.totalFreight || 0), 0);
    return {
      crop,
      season,
      harvested,
      stored: harvested,
      returned,
      contracted,
      billed,
      received,
      receivable,
      freight,
      margin: netMarginValue(billings, contracts)
    };
  });
}

function renderSummaryView() {
  renderSummaryFilterOptions();
  const rows = seasonSummaryRows();
  const summaryHarvests = data.harvests.filter(matchesSummaryFilters);
  const summaryContracts = data.contracts.filter(matchesSummaryFilters);
  const summaryFreights = freightRows().filter((item) => {
    const cropMatches = summaryFilters.crop === "all" || item.crop === summaryFilters.crop;
    const seasonMatches = summaryFilters.season === "all" || item.season === summaryFilters.season;
    return cropMatches && seasonMatches && !item.paid;
  });
  const totals = rows.reduce(
    (acc, item) => {
      acc.harvested += item.harvested;
      acc.returned += item.returned;
      acc.contracted += item.contracted;
      acc.billed += item.billed;
      acc.received += item.received;
      acc.receivable += item.receivable;
      acc.freight += item.freight;
      acc.margin += item.margin;
      return acc;
    },
    { harvested: 0, returned: 0, contracted: 0, billed: 0, received: 0, receivable: 0, freight: 0, margin: 0 }
  );

  document.getElementById("summary-insights").innerHTML = [
    insightSummaryCard("Resumo geral", [
      insightMetric("Colhido", kg(totals.harvested), "Total liquido"),
      insightMetric("Contratado", kg(totals.contracted), "Contratos ativos"),
      insightMetric("Faturado", kg(totals.billed), "Peso saida"),
      insightMetric("Margem liquida", money(totals.margin), "Receita liquida - custos")
    ]),
    donutCard("Ranking por cultura", aggregateRows(rows, (item) => item.crop, (item) => item.harvested), kg),
    barCard("Fluxo de caixa projetado", aggregateRows(summaryContracts.filter((item) => !receiptPaidStatus(item)), (item) => monthKey(item.paymentDeadline), receiptBalanceValue), money),
    barCard("Ranking clientes por valor", aggregateRows(summaryContracts, (item) => item.customer, receiptTotalValue), money),
    barCard("Ranking cooperativas por volume", aggregateRows(summaryHarvests, (item) => item.cooperative, harvestQuantity), kg),
    barCard(
      "Transportadores por pendencias",
      aggregateRows(summaryFreights, (item) => item.transporter, (item) => Math.max(Number(item.freightValue || 0) - Number(item.paymentValue1 || 0) - Number(item.paymentValue2 || 0), 0)),
      money
    )
  ].join("");

  renderTable(
    "summary-season-list",
    rows.map((item) => `<tr>
      <td><span class="crop-dot">${escapeHtml(item.crop)}</span></td>
      <td>${escapeHtml(item.season)}</td>
      <td class="number strong-cell">${kg(item.harvested)}</td>
      <td class="number">${kg(item.stored)}</td>
      <td class="number">${kg(item.returned)}</td>
      <td class="number">${kg(item.contracted)}</td>
      <td class="number">${kg(item.billed)}</td>
      <td class="number strong-cell">${money(item.received)}</td>
      <td class="number ${item.receivable > 0 ? "warning-text" : ""}">${money(item.receivable)}</td>
      <td class="number">${money(item.freight)}</td>
    </tr>`),
    10
  );
}

function renderQuickView() {
  const latestSeason = availableSeasonNames()[0] || "";
  const latestItems = (items) => latestSeason ? items.filter((item) => recordSeason(item) === latestSeason) : items;
  const harvests = latestItems(data.harvests);
  const billings = latestItems(data.billings);
  const contracts = latestItems(data.contracts);
  const freights = freightRows().filter((item) => !latestSeason || item.season === latestSeason);
  const harvested = harvests.reduce((sum, item) => sum + harvestQuantity(item), 0);
  const billed = billings.reduce((sum, item) => sum + billingWeight(item), 0);
  const received = contracts.filter(receiptPaidStatus).reduce((sum, item) => sum + receiptTotalValue(item), 0);
  const receivable = contracts.filter((item) => !receiptPaidStatus(item)).reduce((sum, item) => sum + receiptBalanceValue(item), 0);
  const openFreight = freights.filter((item) => !item.paid).reduce((sum, item) => sum + Math.max(Number(item.freightValue || 0) - Number(item.paymentValue1 || 0) - Number(item.paymentValue2 || 0), 0), 0);
  const margin = netMarginValue(billings, contracts);

  const target = document.getElementById("quick-insights");
  if (target) {
    target.innerHTML = [
      insightSummaryCard(`Safra ${latestSeason || "atual"}`, [
        insightMetric("Colhido", kg(harvested), "Peso liquido"),
        insightMetric("Vendido", kg(billed), "Peso saida"),
        insightMetric("Recebido", money(received), `${money(receivable)} a receber`)
      ]),
      insightSummaryCard("Financeiro", [
        insightMetric("A receber", money(receivable), "Recebimentos abertos"),
        insightMetric("Frete aberto", money(openFreight), "Saldo pendente"),
        insightMetric("Margem liquida", money(margin), "NF liquida - custos")
      ]),
      insightSummaryCard("Operacao", [
        insightMetric("Contratos", number(contracts.length, 0), "Ultima safra"),
        insightMetric("Fretes", number(freights.length, 0), "Lancamentos"),
        insightMetric("Margem liquida", money(margin), "NF liquida - custos")
      ])
    ].join("");
  }

  renderTable(
    "quick-contract-list",
    contracts
      .filter((item) => contractBalanceKg(item) < 0 || !receiptPaidStatus(item))
      .slice(0, 12)
      .map((item) => {
        const status = contractStatus(item);
        return `<tr>
          <td class="strong-cell">${escapeHtml(item.customer || "-")}</td>
          <td>${escapeHtml(item.contractNumber || "-")}</td>
          <td><span class="status-pill ${contractStatusClass(status)}">${escapeHtml(contractStatusDisplay(status))}</span></td>
          <td class="number">${kg(contractBalanceKg(item))}</td>
          <td class="number strong-cell">${money(receiptBalanceValue(item))}</td>
        </tr>`;
      }),
    5
  );
}

function seasonOperationalRows() {
  const sourceItems = [...data.cropPlans, ...data.harvests, ...data.billings, ...data.contracts, ...data.storageReturns];
  const keys = [...new Set(sourceItems.map((item) => `${item.crop || "Sem cultura"}|${recordSeason(item)}`))].filter((key) => !key.includes("Sem safra"));
  return keys.sort().map((key) => {
    const [crop, season] = key.split("|");
    const plan = data.cropPlans.find((item) => item.crop === crop && recordSeason(item) === season);
    const harvestKg = data.harvests.filter((item) => item.crop === crop && recordSeason(item) === season).reduce((sum, item) => sum + harvestQuantity(item), 0);
    const contractKg = data.contracts.filter((item) => item.crop === crop && recordSeason(item) === season).reduce((sum, item) => sum + Number(item.kgContracted || 0), 0);
    const billedKg = data.billings.filter((item) => item.crop === crop && recordSeason(item) === season).reduce((sum, item) => sum + billingWeight(item), 0);
    let status = "Em andamento";
    if (plan?.closed) status = "Safra encerrada";
    else if (contractKg > 0 && billedKg >= contractKg * 0.98) status = "Faturamento em andamento";
    else if (harvestKg > 0 && contractKg === 0) status = "Colheita finalizada";
    return { crop, season, status, harvestKg, contractKg, billedKg, closed: Boolean(plan?.closed) };
  });
}

function renderSeasonStatus() {
  const target = document.getElementById("season-status-cards");
  if (!target) return;
  const rows = seasonOperationalRows();
  target.innerHTML = rows.length
    ? rows.map((item) => insightSummaryCard(`${item.crop} ${item.season}`, [
        insightMetric("Status", item.status),
        insightMetric("Colhido", kg(item.harvestKg)),
        insightMetric("Faturado", kg(item.billedKg))
      ])).join("")
    : insightSummaryCard("Status operacional", [
        insightMetric("Sem safras", "Cadastre a primeira safra", "Acompanhamento aparece aqui")
      ]);
}

function renderClosingChecklist() {
  const rows = seasonOperationalRows().map((item) => closingChecklistFor(item.crop, item.season));
  renderTable(
    "closing-checklist-list",
    rows.map((item) => `<tr class="${item.ok ? "" : "warning-row"}">
      <td><span class="crop-dot">${escapeHtml(item.crop)}</span></td>
      <td>${escapeHtml(item.season)}</td>
      <td class="number">${number(item.openFreight, 0)}</td>
      <td class="number">${number(item.overdueReceipt, 0)}</td>
      <td class="number">${number(item.openContract, 0)}</td>
      <td class="number">${number(item.missingDocs, 0)}</td>
      <td class="strong-cell">${item.ok ? "Pronta para fechar" : "Revisar pendencias"}</td>
    </tr>`),
    7
  );
}

function universalSearchRows() {
  const term = globalSearchTerm.toLowerCase().trim();
  if (!term) return [];
  const rows = [];
  const add = (collection, item, label, value) => {
    const text = JSON.stringify(item).toLowerCase();
    if (!text.includes(term)) return;
    rows.push({
      collection,
      id: item.id,
      area: collectionLabel(collection),
      label,
      crop: item.crop || "-",
      season: recordSeason(item),
      value
    });
  };
  data.harvests.forEach((item) => add("harvests", item, recordSummary("harvests", item), kg(harvestQuantity(item))));
  data.billings.forEach((item) => add("billings", item, recordSummary("billings", item), money(item.netInvoice)));
  data.contracts.forEach((item) => add("contracts", item, recordSummary("contracts", item), money(receiptTotalValue(item))));
  data.storageReturns.forEach((item) => add("storageReturns", item, recordSummary("storageReturns", item), kg(storageReturnWeight(item))));
  data.cropPlans.forEach((item) => add("cropPlans", item, recordSummary("cropPlans", item), `${number(item.hectares)} ha`));
  return rows.slice(0, 40);
}

function renderUniversalSearch() {
  const panel = document.getElementById("global-search-panel");
  const list = document.getElementById("global-search-list");
  if (!panel || !list) return;
  panel.classList.toggle("hidden", !globalSearchTerm.trim());
  renderTable(
    "global-search-list",
    universalSearchRows().map((item) => `<tr>
      <td>${escapeHtml(item.area)}</td>
      <td class="strong-cell">${escapeHtml(item.label)}</td>
      <td><span class="crop-dot">${escapeHtml(item.crop)}</span></td>
      <td>${escapeHtml(item.season)}</td>
      <td class="number">${escapeHtml(item.value)}</td>
    </tr>`),
    5
  );
}

function pendingItems() {
  const overdueContracts = data.contracts.filter((item) => !receiptPaidStatus(item) && daysUntil(item.paymentDeadline) !== null && daysUntil(item.paymentDeadline) < 0);
  return {
    missingNfe: data.billings.filter((item) => !item.nfe),
    missingCte: data.billings.filter((item) => !item.cte),
    openFreights: freightRows().filter((item) => !item.paid && Number(item.freightValue || 0) > 0),
    overdueReceipts: overdueContracts,
    exceededContracts: data.contracts.filter((item) => contractBalanceKg(item) < 0)
  };
}

function renderPendingMap() {
  renderDataQualityAlerts();
  renderExecutiveAlerts(data.contracts);
  renderAutomaticAlerts();
  renderSyncLogs();
  renderScheduledBackups();
  const pending = pendingItems();
  document.getElementById("pending-map-cards").innerHTML = [
    insightSummaryCard("Sem NFE", [
      insightMetric("Pendentes", number(pending.missingNfe.length, 0), "Faturamentos"),
      insightMetric("Peso", kg(pending.missingNfe.reduce((sum, item) => sum + billingWeight(item), 0)))
    ]),
    insightSummaryCard("Sem CT-e", [
      insightMetric("Pendentes", number(pending.missingCte.length, 0), "Faturamentos"),
      insightMetric("Frete", money(pending.missingCte.reduce((sum, item) => sum + Number(item.totalFreight || 0), 0)))
    ]),
    insightSummaryCard("Frete aberto", [
      insightMetric("Lancamentos", number(pending.openFreights.length, 0)),
      insightMetric("Saldo", money(pending.openFreights.reduce((sum, item) => sum + Math.max(Number(item.freightValue || 0) - Number(item.paymentValue1 || 0) - Number(item.paymentValue2 || 0), 0), 0)))
    ]),
    insightSummaryCard("Recebimento vencido", [
      insightMetric("Contratos", number(pending.overdueReceipts.length, 0)),
      insightMetric("A receber", money(pending.overdueReceipts.reduce((sum, item) => sum + receiptBalanceValue(item), 0)))
    ]),
    insightSummaryCard("Contrato com excedente", [
      insightMetric("Contratos", number(pending.exceededContracts.length, 0)),
      insightMetric("Excedente", kg(pending.exceededContracts.reduce((sum, item) => sum + Math.abs(Math.min(contractBalanceKg(item), 0)), 0)))
    ])
  ].join("");

  renderTable(
    "deleted-list",
    (data.deletedItems || []).map((item) => `<tr>
      <td>${escapeHtml(shortDate(String(item.deletedAt || "").slice(0, 10)))}</td>
      <td>${escapeHtml(collectionLabel(item.originalCollection))}</td>
      <td class="strong-cell">${escapeHtml(item.summary || "-")}</td>
      <td class="row-actions"><button class="edit" data-restore-deleted="${item.id}">Recuperar</button></td>
    </tr>`),
    4
  );
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
      <td>${escapeHtml(item.freightMode || "Frete terceiro")}</td>
      <td>${escapeHtml(item.cooperative)}</td>
      <td>${escapeHtml(item.invoice)}</td>
      <td class="number">${kg(item.grossWeight)}</td>
      <td class="number">${number(item.impurityDiscount)}%</td>
      <td class="number">${number(item.humidityDiscount)}%</td>
      <td class="number">${kg(item.discountTotal)}</td>
      <td class="number strong-cell">${kg(item.netWeight)}</td>
      <td class="number">${money(item.harvestFreightPerTon)}</td>
      <td class="number">${money(item.harvestFreightValue)}</td>
      <td>${escapeHtml(item.adjustmentType || "-")}</td>
      <td class="number">${kg(item.adjustmentDifferenceKg)}</td>
      <td class="number">${number(item.adjustmentDifferenceBags)}</td>
      <td class="number">${money(item.adjustmentEstimatedValue)}</td>
      <td>${escapeHtml(item.notes || "-")}</td>
      <td class="row-actions">
        <button class="edit" data-history="harvests" data-id="${item.id}">Historico</button>
        <button class="edit" data-edit-harvest="${item.id}">Editar</button>
        <button class="delete" data-delete="harvests" data-id="${item.id}">Excluir</button>
      </td>
    </tr>`),
    21
  );
}

function renderBilling() {
  renderBillingFilterOptions();
  const search = document.getElementById("billing-search").value.toLowerCase();
  const filtered = data.billings.filter((item) => {
    const text = [item.crop, item.season, item.nfp, item.nfe, item.invoiceStatus, item.contractNumber, item.saleMode, item.priceStatus, item.freightMode, item.externalCheckStatus, item.departureLocation, item.customer, transportName(item), item.cte, item.notes]
      .join(" ")
      .toLowerCase();
    return text.includes(search) && matchesBillingFilters(item);
  });

  renderBillingInsights(filtered);

  renderTable(
    "billing-list",
    filtered.map((item) => {
      const contract = data.contracts.find((contractItem) => contractItem.contractNumber && contractItem.contractNumber === item.contractNumber);
      const contractBalance = contract ? contractBalanceKg(contract) : 0;
      return `<tr>
      <td>${escapeHtml(item.date)}</td>
      <td>${escapeHtml(item.nfp)}</td>
      <td>${escapeHtml(item.nfe)}</td>
      <td>${escapeHtml(item.invoiceStatus || "Emitida")}</td>
      <td>${escapeHtml(item.contractNumber || "-")}</td>
      <td>${escapeHtml(item.saleMode || "Contrato")}</td>
      <td>${escapeHtml(item.priceStatus || "Fixado")}</td>
      <td class="number">${kg(item.fixedWeight)}</td>
      <td class="number">${kg(item.toFixWeight)}</td>
      <td class="number ${contractBalance < 0 ? "danger-text" : "strong-cell"}">${contract ? kg(contractBalance) : "-"}</td>
      <td><span class="crop-dot">${escapeHtml(item.crop || "-")}</span></td>
      <td>${escapeHtml(recordSeason(item))}</td>
      <td>${escapeHtml(item.departureLocation || "-")}</td>
      <td class="strong-cell">${escapeHtml(item.customer)}</td>
      <td>${escapeHtml(transportName(item))}</td>
      <td>${escapeHtml(item.freightMode || "Frete terceiro")}</td>
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
      <td>
        <input class="billing-table-input" data-billing-field="cte" data-id="${item.id}" value="${escapeHtml(item.cte || "")}" />
      </td>
      <td>
        <input class="billing-table-input billing-number-input" data-billing-field="portUnloadWeight" data-id="${item.id}" type="number" min="0" step="0.01" value="${Number(item.portUnloadWeight || 0).toFixed(2)}" />
      </td>
      <td class="number">${kg(Number(item.exitWeight || 0) - Number(item.portUnloadWeight || 0))}</td>
      <td class="number">${money(item.externalSystemValue)}</td>
      <td class="number ${Math.abs(Number(item.externalDifference || 0)) > 1 ? "warning-text" : ""}">${money(item.externalDifference)}</td>
      <td>${escapeHtml(item.externalCheckStatus || "Nao conferido")}</td>
      <td class="row-actions">
        <button class="edit" data-history="billings" data-id="${item.id}">Historico</button>
        <button class="edit" data-edit-billing="${item.id}">Editar</button>
        <button class="delete" data-delete="billings" data-id="${item.id}">Excluir</button>
      </td>
    </tr>`;
    }),
    33
  );
}

function matchesBillingFilters(item) {
  const cropMatches = billingFilters.crop === "all" || item.crop === billingFilters.crop;
  const seasonMatches = billingFilters.season === "all" || recordSeason(item) === billingFilters.season;
  const contractMatches = billingFilters.contract === "all" || item.contractNumber === billingFilters.contract;
  return cropMatches && seasonMatches && contractMatches;
}

function renderBillingFilterOptions() {
  const cropSelect = document.getElementById("billing-crop-filter");
  const seasonSelect = document.getElementById("billing-season-filter");
  const contractSelect = document.getElementById("billing-contract-filter");
  if (!cropSelect || !seasonSelect || !contractSelect) return;

  const sourceItems = [...data.billings, ...data.contracts];
  billingFilters.crop = setSelectOptions(
    cropSelect,
    [...new Set(sourceItems.map((item) => item.crop).filter(Boolean))].sort(),
    billingFilters.crop,
    "Todas"
  );
  billingFilters.season = setSelectOptions(
    seasonSelect,
    [...new Set(sourceItems.map(recordSeason).filter(Boolean))].sort().reverse(),
    billingFilters.season,
    "Todos"
  );
  billingFilters.contract = setSelectOptions(
    contractSelect,
    [...new Set(sourceItems.map((item) => item.contractNumber).filter(Boolean))].sort(),
    billingFilters.contract,
    "Todos"
  );
}

function renderContracts() {
  const search = document.getElementById("contract-search").value.toLowerCase();
  const filtered = data.contracts.filter((item) => {
    const text = [item.customer, item.contractNumber, item.broker, item.crop, item.season].join(" ").toLowerCase();
    return text.includes(search);
  });

  renderContractInsights(filtered);
  renderContractMargins(filtered);

  const cards = filtered.map((item) => {
    const balance = contractBalanceKg(item);
    const alertClass = balance < -1000 ? "danger-row" : balance < 0 ? "warning-row" : "";
    return `<article class="contract-card ${alertClass}">
    <div>
      <span>ENTREGA: ${escapeHtml(item.deliveryStart || "-")} | PRAZO: ${escapeHtml(item.deliveryDeadline || "-")}</span>
      <strong>${escapeHtml(item.customer)}</strong>
      <small>${escapeHtml(item.contractNumber)} - ${escapeHtml(contractStatusDisplay(contractStatus(item)))} - saldo ${escapeHtml(kg(balance))}</small>
    </div>
    <button class="contract-card-action" data-edit-contract="${item.id}" type="button">&gt;</button>
  </article>`;
  });
  document.getElementById("contract-card-list").innerHTML = cards.length ? cards.join("") : `<p class="empty">Nenhum contrato encontrado.</p>`;

  renderTable(
    "contract-list",
    filtered.map((item) => {
      const balance = contractBalanceKg(item);
      const canClose = !item.contractClosed && balance <= 60;
      const rowClass = balance < -1000 ? "danger-row" : balance < 0 ? "warning-row" : "";
      return `<tr class="${rowClass}">
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
      <td class="number">${kg(item.settlementBalanceKg)}</td>
      <td class="number">${money(item.settlementBalanceValue)}</td>
      <td class="number">${money(item.settlementCommissionValue)}</td>
      <td class="number">${money(item.settlementRoyaltiesValue)}</td>
      <td>${escapeHtml(item.settlementNotes || "-")}</td>
      <td class="number">${kg(item.closingBalanceKg)}</td>
      <td class="number">${money(item.closingBalanceValue)}</td>
      <td class="number">${money(item.closingCommissionValue)}</td>
      <td class="number">${money(item.closingRoyaltiesValue)}</td>
      <td>${escapeHtml(item.closingStatus || "-")}</td>
      <td><span class="status-pill ${contractStatusClass(contractStatus(item))}">${escapeHtml(contractStatusDisplay(contractStatus(item)))}</span></td>
      <td class="row-actions">
        <button class="edit" data-history="contracts" data-id="${item.id}">Historico</button>
        ${canClose ? `<button class="edit" data-close-contract="${item.id}">Fechar</button>` : ""}
        ${item.contractClosed ? `<button class="edit" data-reopen-contract="${item.id}">Reabrir</button>` : ""}
        <button class="edit" data-edit-contract="${item.id}">Editar</button>
        <button class="delete" data-delete="contracts" data-id="${item.id}">Excluir</button>
      </td>
    </tr>`;
    }),
    29
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
    bags: bagsForWeight(harvestQuantity(item), item.crop),
    freightPerTon: item.harvestFreightPerTon,
    freightValue: item.harvestFreightValue,
    paymentDate1: item.freightPaymentDate1 || "",
    paymentValue1: Number(item.freightPaymentValue1 || 0),
    paymentDate2: item.freightPaymentDate2 || "",
    paymentValue2: Number(item.freightPaymentValue2 || 0),
    paid: paidStatus(item) || (Number(item.harvestFreightValue || 0) > 0 && Number(item.freightPaymentValue1 || 0) + Number(item.freightPaymentValue2 || 0) >= Number(item.harvestFreightValue || 0))
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
    bags: Number(item.bags || bagsForWeight(billingWeight(item), item.crop)),
    freightPerTon: item.freightPerTon,
    freightValue: item.totalFreight,
    paymentDate1: item.freightPaymentDate1 || item.cteDate || "",
    paymentValue1: Number(item.freightPaymentValue1 || 0),
    paymentDate2: item.freightPaymentDate2 || "",
    paymentValue2: Number(item.freightPaymentValue2 || 0),
    paid: paidStatus(item) || (Number(item.totalFreight || 0) > 0 && Number(item.freightPaymentValue1 || 0) + Number(item.freightPaymentValue2 || 0) >= Number(item.totalFreight || 0))
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
  const contractDatalist = document.getElementById("contract-number-options");
  const customerDatalist = document.getElementById("customer-options");
  const cooperativeDatalist = document.getElementById("cooperative-options");
  const transporterDatalist = document.getElementById("transporter-options");
  const brokerDatalist = document.getElementById("broker-options");

  if (cropDatalist) {
    cropDatalist.innerHTML = cropNames.map((crop) => `<option value="${escapeHtml(crop)}"></option>`).join("");
  }
  if (seasonDatalist) {
    seasonDatalist.innerHTML = seasonNames.map((season) => `<option value="${escapeHtml(season)}"></option>`).join("");
  }
  if (contractDatalist) {
    contractDatalist.innerHTML = [...new Set(data.contracts.map((item) => item.contractNumber).filter(Boolean))]
      .sort()
      .map((contract) => `<option value="${escapeHtml(contract)}"></option>`)
      .join("");
  }
  if (customerDatalist) {
    customerDatalist.innerHTML = [...new Set([...directoryNames("customers"), ...data.contracts.map((item) => item.customer), ...data.billings.map((item) => item.customer)].filter(Boolean))]
      .sort()
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join("");
  }
  if (cooperativeDatalist) {
    cooperativeDatalist.innerHTML = [...new Set([...directoryNames("cooperatives"), ...data.harvests.map((item) => item.cooperative), ...data.storageReturns.map((item) => item.company)].filter(Boolean))]
      .sort()
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join("");
  }
  if (transporterDatalist) {
    transporterDatalist.innerHTML = [...new Set([...directoryNames("transporters"), ...data.harvests.map(transportName), ...data.billings.map(transportName)].filter((name) => name && name !== "Sem transportador"))]
      .sort()
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join("");
  }
  if (brokerDatalist) {
    brokerDatalist.innerHTML = [...new Set([...directoryNames("brokers"), ...data.contracts.map((item) => item.broker)].filter(Boolean))]
      .sort()
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join("");
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
      <td>
        <input class="freight-money-input" data-freight-value="freightPaymentValue1" data-source="${item.source}" data-id="${item.id}" type="number" min="0" step="0.01" value="${Number(item.paymentValue1 || 0).toFixed(2)}" />
      </td>
      <td>
        <input class="freight-date-input" data-freight-date="freightPaymentDate2" data-source="${item.source}" data-id="${item.id}" type="date" value="${escapeHtml(item.paymentDate2 || "")}" />
      </td>
      <td>
        <input class="freight-money-input" data-freight-value="freightPaymentValue2" data-source="${item.source}" data-id="${item.id}" type="number" min="0" step="0.01" value="${Number(item.paymentValue2 || 0).toFixed(2)}" />
      </td>
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
  const filtered = receiptRows()
    .filter(matchesReceiptFilters)
    .sort((a, b) => String(receiptDueDate(a) || "9999-12-31").localeCompare(String(receiptDueDate(b) || "9999-12-31")));

  renderReceiptInsights(filtered);
  renderCashForecast(filtered);

  renderTable(
    "receipt-list",
    filtered.map((item) => {
      const total = receiptTotalValue(item);
      const paidValue = receiptPaymentValue(item);
      const balance = Math.max(total - paidValue, 0);
      return `<tr>
        <td class="strong-cell">${escapeHtml(item.customer)}</td>
        <td>${escapeHtml(item.receiptLabel)}</td>
        <td>${escapeHtml(shortDate(receiptDueDate(item)))}</td>
        <td class="number">${kg(receiptWeight(item))}</td>
        <td class="number">${number(receiptBags(item))}</td>
        <td class="number strong-cell">${money(item.netValue || item.netInvoice)}</td>
        <td class="number strong-cell">${money(total)}</td>
        <td>
          <input class="receipt-table-input" data-receipt-source="${item.receiptSource}" data-receipt-field="receiptDate1" data-id="${item.id}" type="date" value="${escapeHtml(item.receiptDate1 || "")}" />
        </td>
        <td>
          <input class="receipt-table-input receipt-money-input" data-receipt-source="${item.receiptSource}" data-receipt-field="receiptValue1" data-id="${item.id}" type="number" min="0" step="0.01" value="${Number(item.receiptValue1 || 0).toFixed(2)}" />
        </td>
        <td>
          <input class="receipt-table-input" data-receipt-source="${item.receiptSource}" data-receipt-field="receiptDate2" data-id="${item.id}" type="date" value="${escapeHtml(item.receiptDate2 || "")}" />
        </td>
        <td>
          <input class="receipt-table-input receipt-money-input" data-receipt-source="${item.receiptSource}" data-receipt-field="receiptValue2" data-id="${item.id}" type="number" min="0" step="0.01" value="${Number(item.receiptValue2 || 0).toFixed(2)}" />
        </td>
        <td class="number strong-cell">${money(balance)}</td>
        <td>
          <input class="receipt-paid-checkbox" data-receipt-source="${item.receiptSource}" data-receipt-paid="${item.id}" type="checkbox" ${receiptPaidStatus(item) ? "checked" : ""} />
        </td>
        <td class="row-actions">
          <button class="edit" data-history="${item.receiptSource === "billing" ? "billings" : "contracts"}" data-id="${item.id}">Historico</button>
        </td>
      </tr>`;
    }),
    14
  );
}

function matchesReceiptFilters(item) {
  const cropMatches = receiptFilters.crop === "all" || item.crop === receiptFilters.crop;
  const seasonMatches = receiptFilters.season === "all" || recordSeason(item) === receiptFilters.season;
  const days = daysUntil(receiptDueDate(item));
  const paid = receiptPaidStatus(item);
  const dueMatches =
    receiptFilters.due === "all" ||
    (receiptFilters.due === "paid" && paid) ||
    (receiptFilters.due === "open" && !paid) ||
    (receiptFilters.due === "overdue" && !paid && days !== null && days < 0) ||
    (receiptFilters.due === "7" && !paid && days !== null && days >= 0 && days <= 7) ||
    (receiptFilters.due === "30" && !paid && days !== null && days >= 0 && days <= 30);
  return cropMatches && seasonMatches && dueMatches;
}

function renderReceiptFilterOptions() {
  const cropSelect = document.getElementById("receipt-crop-filter");
  const seasonSelect = document.getElementById("receipt-season-filter");
  const dueSelect = document.getElementById("receipt-due-filter");
  if (!cropSelect || !seasonSelect || !dueSelect) return;

  receiptFilters.crop = setSelectOptions(
    cropSelect,
    [...new Set(receiptRows().map((item) => item.crop).filter(Boolean))].sort(),
    receiptFilters.crop,
    "Todas"
  );
  receiptFilters.season = setSelectOptions(
    seasonSelect,
    [...new Set(receiptRows().map(recordSeason).filter(Boolean))].sort().reverse(),
    receiptFilters.season,
    "Todos"
  );
  dueSelect.value = ["all", "overdue", "7", "30", "paid", "open"].includes(receiptFilters.due) ? receiptFilters.due : "all";
  receiptFilters.due = dueSelect.value;
}

function setCropSeasonFilters(prefix, filters, sourceItems) {
  const cropSelect = document.getElementById(`${prefix}-crop-filter`);
  const seasonSelect = document.getElementById(`${prefix}-season-filter`);
  if (!cropSelect || !seasonSelect) return;
  filters.crop = setSelectOptions(
    cropSelect,
    [...new Set(sourceItems.map((item) => item.crop).filter(Boolean))].sort(),
    filters.crop,
    "Todas"
  );
  filters.season = setSelectOptions(
    seasonSelect,
    [...new Set(sourceItems.map(recordSeason).filter(Boolean))].sort().reverse(),
    filters.season,
    "Todos"
  );
}

function matchesCropSeason(item, filters) {
  return (filters.crop === "all" || item.crop === filters.crop) && (filters.season === "all" || recordSeason(item) === filters.season);
}

function contractClosingMetrics(contract) {
  const billings = contractBillings(contract);
  const billed = billings.reduce((sum, item) => sum + billingWeight(item), 0);
  const portWeight = billings.reduce((sum, item) => sum + Number(item.portUnloadWeight || 0), 0);
  const weightDifference = billed - portWeight;
  const excess = Math.max(billed - Number(contract.kgContracted || 0), 0);
  const toFixKg = Number(contract.closingToFixKg || contract.settlementToFixKg || 0);
  const pendingInvoiceKg = Number(contract.closingPendingInvoiceKg || 0);
  const freight = billings.reduce((sum, item) => sum + Number(item.totalFreight || 0), 0);
  const margin = contractMargin(contract);
  const received = receiptPaymentValue(contract);
  const receivable = receiptBalanceValue(contract);
  return { billings, billed, portWeight, weightDifference, excess, toFixKg, pendingInvoiceKg, freight, margin: margin.margin, received, receivable };
}

function renderClosingContracts() {
  const sourceItems = [...data.contracts, ...data.billings];
  setCropSeasonFilters("closing", closingFilters, sourceItems);
  const contracts = data.contracts.filter((item) => matchesCropSeason(item, closingFilters));
  const rows = contracts.map((contract) => ({ contract, ...contractClosingMetrics(contract) }));
  const contracted = contracts.reduce((sum, item) => sum + Number(item.kgContracted || 0), 0);
  const billed = rows.reduce((sum, item) => sum + item.billed, 0);
  const toFix = rows.reduce((sum, item) => sum + item.toFixKg, 0);
  const receivable = rows.reduce((sum, item) => sum + item.receivable, 0);
  const target = document.getElementById("closing-insights");
  if (target) {
    target.innerHTML = [
      insightSummaryCard("Fechamento geral", [
        insightMetric("Contratado", kg(contracted), "SC conforme cultura"),
        insightMetric("Faturado", kg(billed), `${number(rows.length, 0)} contratos`),
        insightMetric("Excedente", kg(rows.reduce((sum, item) => sum + item.excess, 0)), "Faturado acima")
      ]),
      insightSummaryCard("Pendencias do fechamento", [
        insightMetric("A fixar", kg(toFix), "SC conforme cultura"),
        insightMetric("NF pendente", kg(rows.reduce((sum, item) => sum + item.pendingInvoiceKg, 0)), "Kg sem NF"),
        insightMetric("A receber", money(receivable), "Saldo financeiro")
      ]),
      barCard("Clientes por faturado", aggregateRows(rows, (item) => item.contract.customer, (item) => item.billed), kg)
    ].join("");
  }
  renderTable(
    "closing-contract-list",
    rows.map((item) => `<tr class="${item.excess > 0 ? "warning-row" : ""}">
      <td class="strong-cell">${escapeHtml(item.contract.customer || "-")}</td>
      <td>${escapeHtml(item.contract.contractNumber || "-")}</td>
      <td><span class="crop-dot">${escapeHtml(item.contract.crop || "-")}</span></td>
      <td>${escapeHtml(recordSeason(item.contract))}</td>
      <td class="number">${kg(item.contract.kgContracted)}</td>
      <td class="number strong-cell">${kg(item.billed)}</td>
      <td class="number">${kg(item.portWeight)}</td>
      <td class="number ${Math.abs(item.weightDifference) > 1000 ? "warning-text" : ""}">${kg(item.weightDifference)}</td>
      <td class="number ${item.excess > 0 ? "warning-text" : ""}">${kg(item.excess)}</td>
      <td class="number">${kg(item.toFixKg)}</td>
      <td class="number">${kg(item.pendingInvoiceKg)}</td>
      <td class="number">${money(item.received)}</td>
      <td class="number strong-cell">${money(item.receivable)}</td>
      <td class="number">${money(item.freight)}</td>
      <td class="number ${item.margin < 0 ? "danger-text" : "strong-cell"}">${money(item.margin)}</td>
      <td><span class="status-pill ${contractStatusClass(contractStatus(item.contract))}">${escapeHtml(contractStatusDisplay(contractStatus(item.contract)))}</span></td>
    </tr>`),
    16
  );
}

function clientAccountRows() {
  const contracts = data.contracts.filter((item) => matchesCropSeason(item, clientAccountFilters)).map((item) => {
    const metrics = contractClosingMetrics(item);
    return {
      client: item.customer || "Sem cliente",
      type: "Contrato",
      reference: item.contractNumber || "-",
      crop: item.crop,
      season: recordSeason(item),
      weight: Number(item.kgContracted || 0),
      net: receiptTotalValue(item),
      received: receiptPaymentValue(item),
      receivable: receiptBalanceValue(item),
      toFix: Number(item.closingToFixKg || item.settlementToFixKg || 0),
      freight: metrics.freight,
      status: contractStatus(item)
    };
  });
  const billings = data.billings
    .filter((item) => matchesCropSeason(item, clientAccountFilters))
    .filter((item) => !item.contractNumber || item.saleMode !== "Contrato" || item.priceStatus === "A fixar" || item.priceStatus === "Parcialmente fixado")
    .map((item) => ({
      client: item.customer || "Sem cliente",
      type: item.saleMode || "Venda",
      reference: item.contractNumber || item.nfp || item.nfe || "-",
      crop: item.crop,
      season: recordSeason(item),
      weight: billingWeight(item),
      net: Number(item.netInvoice || 0),
      received: receiptPaymentValue(item),
      receivable: receiptBalanceValue({ ...item, receiptSource: "billing" }),
      toFix: Number(item.toFixWeight || 0),
      freight: Number(item.totalFreight || 0),
      status: item.priceStatus || "Fixado"
    }));
  return [...contracts, ...billings].sort((a, b) => a.client.localeCompare(b.client) || a.reference.localeCompare(b.reference));
}

function renderClientAccount() {
  const sourceItems = [...data.contracts, ...data.billings];
  setCropSeasonFilters("client-account", clientAccountFilters, sourceItems);
  const rows = clientAccountRows();
  const grouped = rows.reduce((acc, item) => {
    if (!acc[item.client]) acc[item.client] = { client: item.client, weight: 0, net: 0, received: 0, receivable: 0, toFix: 0, freight: 0, count: 0 };
    acc[item.client].weight += Number(item.weight || 0);
    acc[item.client].net += Number(item.net || 0);
    acc[item.client].received += Number(item.received || 0);
    acc[item.client].receivable += Number(item.receivable || 0);
    acc[item.client].toFix += Number(item.toFix || 0);
    acc[item.client].freight += Number(item.freight || 0);
    acc[item.client].count += 1;
    return acc;
  }, {});
  const clientRows = Object.values(grouped);
  const target = document.getElementById("client-account-insights");
  if (target) {
    target.innerHTML = [
      insightSummaryCard("Conta corrente filtrada", [
        insightMetric("Clientes", number(clientRows.length, 0), `${number(rows.length, 0)} registros`),
        insightMetric("A receber", money(clientRows.reduce((sum, item) => sum + item.receivable, 0)), "Contratos e vendas"),
        insightMetric("A fixar", kg(clientRows.reduce((sum, item) => sum + item.toFix, 0)), "Peso pendente")
      ]),
      barCard("Clientes por saldo a receber", clientRows.map((item) => ({ label: item.client, value: item.receivable })), money),
      donutCard("Tipo de operacao", aggregateRows(rows, (item) => item.type, (item) => item.weight), kg)
    ].join("");
  }
  const tableRows = [];
  clientRows.forEach((client) => {
    tableRows.push(`<tr class="total-row">
      <td class="strong-cell">${escapeHtml(client.client)}</td>
      <td>${number(client.count, 0)} registros</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
      <td class="number strong-cell">${kg(client.weight)}</td>
      <td class="number strong-cell">${money(client.net)}</td>
      <td class="number">${money(client.received)}</td>
      <td class="number strong-cell">${money(client.receivable)}</td>
      <td class="number">${kg(client.toFix)}</td>
      <td class="number">${money(client.freight)}</td>
      <td>Resumo</td>
    </tr>`);
    rows.filter((item) => item.client === client.client).forEach((item) => {
      tableRows.push(`<tr>
        <td>${escapeHtml(item.client)}</td>
        <td>${escapeHtml(item.type)}</td>
        <td>${escapeHtml(item.reference)}</td>
        <td><span class="crop-dot">${escapeHtml(item.crop || "-")}</span></td>
        <td>${escapeHtml(item.season || "-")}</td>
        <td class="number">${kg(item.weight)}</td>
        <td class="number">${money(item.net)}</td>
        <td class="number">${money(item.received)}</td>
        <td class="number strong-cell">${money(item.receivable)}</td>
        <td class="number">${kg(item.toFix)}</td>
        <td class="number">${money(item.freight)}</td>
        <td>${escapeHtml(item.status || "-")}</td>
      </tr>`);
    });
  });
  renderTable("client-account-list", tableRows, 12);
}

function costMatchesDre(item) {
  return matchesCropSeason(item, dreFilters);
}

function costAmount(items) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function dreCultureRows() {
  const sourceItems = [...data.cropPlans, ...data.harvests, ...data.billings, ...data.contracts, ...data.costs];
  const keys = [...new Set(sourceItems.filter((item) => matchesCropSeason(item, dreFilters)).map((item) => `${item.crop || "Sem cultura"}|${recordSeason(item)}`))];
  return keys.map((key) => {
    const [crop, season] = key.split("|");
    const plan = data.cropPlans.find((item) => (item.crop || "Sem cultura") === crop && recordSeason(item) === season);
    const harvests = data.harvests.filter((item) => (item.crop || "Sem cultura") === crop && recordSeason(item) === season);
    const billings = data.billings.filter((item) => (item.crop || "Sem cultura") === crop && recordSeason(item) === season);
    const contracts = data.contracts.filter((item) => (item.crop || "Sem cultura") === crop && recordSeason(item) === season);
    const costs = data.costs.filter((item) => (item.crop || "Sem cultura") === crop && recordSeason(item) === season);
    const hectares = Number(plan?.hectares || 0) || costs.reduce((sum, item) => sum + Number(item.hectares || 0), 0);
    const netRevenue = billings.reduce((sum, item) => sum + Number(item.netInvoice || 0), 0);
    const freight = billings.reduce((sum, item) => sum + Number(item.totalFreight || 0), 0) + harvests.reduce((sum, item) => sum + Number(item.harvestFreightValue || 0), 0);
    const directCosts = costAmount(costs);
    const commissions = contracts.reduce((sum, item) => sum + Number(item.commissionValue || 0) + Number(item.settlementCommissionValue || 0) + Number(item.closingCommissionValue || 0), 0);
    const royalties = contracts.reduce((sum, item) => sum + Number(item.royaltiesValue || 0) + Number(item.settlementRoyaltiesValue || 0) + Number(item.closingRoyaltiesValue || 0), 0);
    const margin = netRevenue - freight - directCosts - commissions - royalties;
    return { crop, season, hectares, netRevenue, freight, directCosts, commissions, royalties, margin };
  }).sort((a, b) => a.crop.localeCompare(b.crop) || b.season.localeCompare(a.season));
}

function dreClientRows() {
  const rows = [];
  data.contracts.filter((item) => matchesCropSeason(item, dreFilters)).forEach((contract) => {
    const margin = contractMargin(contract);
    rows.push({
      client: contract.customer || "Sem cliente",
      reference: contract.contractNumber || "-",
      crop: contract.crop,
      season: recordSeason(contract),
      weight: contractBilledWeight(contract) || Number(contract.kgContracted || 0),
      netRevenue: margin.netInvoice || receiptTotalValue(contract),
      freight: margin.freight,
      commission: margin.commission,
      royalties: margin.royalties,
      funrural: margin.funrural,
      margin: margin.margin
    });
  });
  data.billings
    .filter((item) => matchesCropSeason(item, dreFilters))
    .filter((item) => !item.contractNumber || item.saleMode !== "Contrato")
    .forEach((item) => {
      rows.push({
        client: item.customer || "Sem cliente",
        reference: item.nfp || item.nfe || "-",
        crop: item.crop,
        season: recordSeason(item),
        weight: billingWeight(item),
        netRevenue: Number(item.netInvoice || 0),
        freight: Number(item.totalFreight || 0),
        commission: 0,
        royalties: 0,
        funrural: Number(item.funrural || 0),
        margin: Number(item.netInvoice || 0) - Number(item.totalFreight || 0)
      });
    });
  return rows.sort((a, b) => a.client.localeCompare(b.client) || a.reference.localeCompare(b.reference));
}

function renderDreCosts() {
  const sourceItems = [...data.cropPlans, ...data.harvests, ...data.billings, ...data.contracts, ...data.costs];
  setCropSeasonFilters("dre", dreFilters, sourceItems);
  const cultureRows = dreCultureRows();
  const clientRows = dreClientRows();
  const filteredCosts = data.costs.filter(costMatchesDre);
  const totalRevenue = cultureRows.reduce((sum, item) => sum + item.netRevenue, 0);
  const totalFreight = cultureRows.reduce((sum, item) => sum + item.freight, 0);
  const totalCosts = cultureRows.reduce((sum, item) => sum + item.directCosts, 0);
  const totalMargin = cultureRows.reduce((sum, item) => sum + item.margin, 0);
  const hectares = cultureRows.reduce((sum, item) => sum + Number(item.hectares || 0), 0);
  const target = document.getElementById("dre-insights");
  if (target) {
    target.innerHTML = [
      insightSummaryCard("DRE filtrada", [
        insightMetric("Receita liquida", money(totalRevenue), "NF liquida"),
        insightMetric("Custos + fretes", money(totalCosts + totalFreight), `${money(totalCosts)} custos`),
        insightMetric("Margem real", money(totalMargin), `${money(hectares ? totalMargin / hectares : 0)} / ha`)
      ]),
      insightSummaryCard("Custo por hectare", [
        insightMetric("Hectares", number(hectares), "Safras/custos"),
        insightMetric("Custo/ha", money(hectares ? totalCosts / hectares : 0), "Custos diretos"),
        insightMetric("Frete/ha", money(hectares ? totalFreight / hectares : 0), "Fretes")
      ]),
      barCard("Resultado por cultura", cultureRows.map((item) => ({ label: `${item.crop} ${item.season}`, value: item.margin })), money),
      donutCard("Custos por categoria", aggregateRows(filteredCosts, (item) => item.category || "Outros", (item) => item.amount), money)
    ].join("");
  }
  renderTable(
    "dre-culture-list",
    cultureRows.map((item) => `<tr class="${item.margin < 0 ? "danger-row" : ""}">
      <td><span class="crop-dot">${escapeHtml(item.crop)}</span></td>
      <td>${escapeHtml(item.season)}</td>
      <td class="number">${number(item.hectares)}</td>
      <td class="number strong-cell">${money(item.netRevenue)}</td>
      <td class="number">${money(item.freight)}</td>
      <td class="number">${money(item.directCosts)}</td>
      <td class="number">${money(item.hectares ? item.directCosts / item.hectares : 0)}</td>
      <td class="number strong-cell">${money(item.margin)}</td>
      <td class="number">${money(item.hectares ? item.margin / item.hectares : 0)}</td>
    </tr>`),
    9
  );
  renderTable(
    "dre-client-list",
    clientRows.map((item) => `<tr class="${item.margin < 0 ? "danger-row" : ""}">
      <td class="strong-cell">${escapeHtml(item.client)}</td>
      <td>${escapeHtml(item.reference)}</td>
      <td><span class="crop-dot">${escapeHtml(item.crop || "-")}</span></td>
      <td>${escapeHtml(item.season || "-")}</td>
      <td class="number">${kg(item.weight)}</td>
      <td class="number strong-cell">${money(item.netRevenue)}</td>
      <td class="number">${money(item.freight)}</td>
      <td class="number">${money(item.commission)}</td>
      <td class="number">${money(item.royalties)}</td>
      <td class="number">${money(item.funrural)}</td>
      <td class="number strong-cell">${money(item.margin)}</td>
    </tr>`),
    11
  );
  renderTable(
    "cost-list",
    filteredCosts.map((item) => `<tr>
      <td>${escapeHtml(shortDate(item.date))}</td>
      <td><span class="crop-dot">${escapeHtml(item.crop || "-")}</span></td>
      <td>${escapeHtml(recordSeason(item))}</td>
      <td>${escapeHtml(item.category || "-")}</td>
      <td class="strong-cell">${escapeHtml(item.description || "-")}</td>
      <td class="number">${number(item.hectares)}</td>
      <td class="number strong-cell">${money(item.amount)}</td>
      <td>${escapeHtml(item.notes || "-")}</td>
      <td class="row-actions">
        <button class="edit" data-history="costs" data-id="${item.id}">Historico</button>
        <button class="edit" data-edit-cost="${item.id}">Editar</button>
        <button class="delete" data-delete="costs" data-id="${item.id}">Excluir</button>
      </td>
    </tr>`),
    9
  );
}

function matchesStorageFilters(item) {
  const cropMatches = storageFilters.crop === "all" || item.crop === storageFilters.crop;
  const seasonMatches = storageFilters.season === "all" || recordSeason(item) === storageFilters.season;
  return cropMatches && seasonMatches;
}

function matchesStorageContractFilters(item) {
  const baseMatches = matchesStorageFilters(item);
  const contractMatches = storageFilters.contract === "all" || item.contractNumber === storageFilters.contract;
  return baseMatches && contractMatches;
}

function renderStorageFilterOptions() {
  const cropSelect = document.getElementById("storage-crop-filter");
  const seasonSelect = document.getElementById("storage-season-filter");
  const contractSelect = document.getElementById("storage-contract-filter");
  if (!cropSelect || !seasonSelect || !contractSelect) return;

  const sourceItems = [...data.harvests, ...data.storageReturns, ...data.contracts, ...data.billings];
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
  storageFilters.contract = setSelectOptions(
    contractSelect,
    [...new Set(data.contracts.map((item) => item.contractNumber).filter(Boolean))].sort(),
    storageFilters.contract,
    "Todos"
  );
}

function renderStorageSummary() {
  const harvests = data.harvests.filter(matchesStorageFilters);
  const returns = data.storageReturns.filter(matchesStorageFilters);
  const contracts = data.contracts.filter(matchesStorageContractFilters);
  const contractNumbers = new Set(contracts.map((item) => item.contractNumber).filter(Boolean));
  const billings = data.billings.filter((item) => {
    const cropMatches = storageFilters.crop === "all" || item.crop === storageFilters.crop;
    const seasonMatches = storageFilters.season === "all" || recordSeason(item) === storageFilters.season;
    const contractMatches =
      storageFilters.contract === "all"
        ? contractNumbers.has(item.contractNumber)
        : item.contractNumber === storageFilters.contract;
    return cropMatches && seasonMatches && contractMatches;
  });
  const companies = [...new Set([...harvests.map((item) => item.cooperative), ...returns.map((item) => item.company)].filter(Boolean))].sort();
  const totalStored = harvests.reduce((sum, item) => sum + harvestQuantity(item), 0);
  const totalReturned = returns.reduce((sum, item) => sum + storageReturnWeight(item), 0);
  const totalSold = contracts.reduce((sum, item) => sum + Number(item.kgContracted || 0), 0);
  const totalBilledByContract = billings.reduce((sum, item) => sum + billingWeight(item), 0);
  const remainingContracts = totalSold - totalBilledByContract;

  const companyCards = companies.map((company, index) => {
    const storedKg = harvests.filter((item) => item.cooperative === company).reduce((sum, item) => sum + harvestQuantity(item), 0);
    const returnedKg = returns.filter((item) => item.company === company).reduce((sum, item) => sum + storageReturnWeight(item), 0);
    const remainingKg = Math.max(storedKg - returnedKg, 0);
    return `<article class="storage-card tone-${(index % 4) + 1}">
      <span>${escapeHtml(company)}</span>
      <strong>${number(storedKg)} kg</strong>
      <small>SC conforme cultura</small>
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
      <small>SC conforme cultura</small>
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
        <b>Falta retornar para fechar</b><em>${number(remainingContracts)} kg</em>
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
        <td class="row-actions">
          <button class="edit" data-history="storageReturns" data-id="${item.id}">Historico</button>
          <button class="edit" data-edit-storage-return="${item.id}">Editar</button>
          <button class="delete" data-delete="storageReturns" data-id="${item.id}">Excluir</button>
        </td>
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
  renderSeasonStatus();
  renderClosingChecklist();
  renderTable(
    "crop-plan-list",
    data.cropPlans.map((item) => `<tr>
      <td><span class="crop-dot">${escapeHtml(item.crop)}</span></td>
      <td>${escapeHtml(recordSeason(item))}</td>
      <td class="number strong-cell">${number(item.hectares)}</td>
      <td><span class="status-pill ${item.closed ? "closed" : ""}">${item.closed ? "Fechada" : "Aberta"}</span></td>
      <td class="row-actions">
        <button class="edit" data-history="cropPlans" data-id="${item.id}">Historico</button>
        <button class="edit" data-toggle-crop-plan-closed="${item.id}">${item.closed ? "Reabrir" : "Fechar safra"}</button>
        <button class="edit" data-edit-crop-plan="${item.id}">Editar</button>
        <button class="delete" data-delete="cropPlans" data-id="${item.id}">Excluir</button>
      </td>
    </tr>`),
    5
  );
}

function setDirectoryEditState(isEditing) {
  document.getElementById("directory-submit").textContent = isEditing ? "Atualizar cadastro" : "Salvar cadastro";
  document.getElementById("cancel-directory-edit").classList.toggle("hidden", !isEditing);
}

function startDirectoryEdit(id) {
  const record = data.directories.find((item) => item.id === id);
  if (!record) return;
  const form = document.getElementById("directory-form");
  editingDirectoryId = id;
  form.reset();
  fillForm(form, record);
  setDirectoryEditState(true);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function stopDirectoryEdit() {
  editingDirectoryId = null;
  setDirectoryEditState(false);
}

function renderDirectories() {
  const rows = (data.directories || []).slice().sort((a, b) => directoryTypeLabel(a.type).localeCompare(directoryTypeLabel(b.type)) || String(a.name || "").localeCompare(String(b.name || "")));
  renderTable(
    "directory-list",
    rows.map((item) => `<tr>
      <td class="strong-cell">${escapeHtml(directoryTypeLabel(item.type))}</td>
      <td class="strong-cell">${escapeHtml(item.name || "-")}</td>
      <td>${escapeHtml(item.aliases || "-")}</td>
      <td class="row-actions">
        <button class="edit" data-history="directories" data-id="${item.id}">Historico</button>
        <button class="edit" data-edit-directory="${item.id}">Editar</button>
        <button class="delete" data-delete="directories" data-id="${item.id}">Excluir</button>
      </td>
    </tr>`),
    4
  );
}

function render() {
  normalizeLoadedData();
  renderFormOptions();
  renderUniversalSearch();
  renderDashboard();
  renderQuickView();
  renderSummaryView();
  renderDreCosts();
  renderPendingMap();
  renderFullAudit();
  renderHarvests();
  renderContracts();
  renderBilling();
  renderFreights();
  renderReceipts();
  renderClosingContracts();
  renderClientAccount();
  renderStorageReturns();
  renderCropPlans();
  renderDirectories();
  applyViewMode();
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
  const harvestFreightValue =
    ["FOB", "Sem frete"].includes(form.elements.freightMode?.value)
      ? 0
      : (netWeight / 1000) * Number(form.elements.harvestFreightPerTon.value || 0);
  const adjustmentEffectiveNetWeight = Number(form.elements.adjustmentEffectiveNetWeight?.value || netWeight || 0);
  const adjustmentConfirmedWeight = Number(form.elements.adjustmentConfirmedWeight?.value || 0);
  const adjustmentDifferenceKg = adjustmentConfirmedWeight ? adjustmentConfirmedWeight - adjustmentEffectiveNetWeight : 0;

  setNumberField(form, "impurityDiscount", impurityDiscount);
  setNumberField(form, "humidityDiscount", humidityDiscount);
  setNumberField(form, "discountTotal", discountTotal);
  setNumberField(form, "netWeight", netWeight);
  setNumberField(form, "harvestFreightValue", harvestFreightValue);
  setNumberField(form, "adjustmentGrossWeight", grossWeight);
  setNumberField(form, "adjustmentEffectiveNetWeight", adjustmentEffectiveNetWeight || netWeight);
  setNumberField(form, "adjustmentDifferenceKg", adjustmentDifferenceKg);
  setNumberField(form, "adjustmentDifferenceBags", bagsForWeight(adjustmentDifferenceKg, form.elements.crop?.value));
}

function calculateBilling() {
  const form = document.getElementById("billing-form");
  if (!form) return;

  const exitWeight = Number(form.elements.exitWeight.value || 0);
  const pricePerKg = Number(form.elements.pricePerKg.value || 0);
  const funruralRate = Number(form.elements.funruralRate.value || 0);
  const freightPerTon = Number(form.elements.freightPerTon.value || 0);
  const fixedWeight = Number(form.elements.fixedWeight?.value || 0);
  const fixedPrice = Number(form.elements.fixedPrice?.value || 0);
  const toFixWeight = Number(form.elements.toFixWeight?.value || 0);
  const estimatedPrice = Number(form.elements.estimatedPrice?.value || 0);
  const externalSystemValue = Number(form.elements.externalSystemValue?.value || 0);
  const totalValue = exitWeight * pricePerKg;
  const funrural = totalValue * (funruralRate / 100);
  const netInvoice = Math.max(totalValue - funrural, 0);
  const bags = bagsForWeight(exitWeight, form.elements.crop?.value);
  const totalFreight =
    ["FOB", "Sem frete"].includes(form.elements.freightMode?.value)
      ? 0
      : (exitWeight / 1000) * freightPerTon;
  const fixedValue = fixedWeight * fixedPrice;
  const estimatedToFixValue = toFixWeight * estimatedPrice;
  const externalDifference = externalSystemValue ? externalSystemValue - netInvoice : 0;

  setNumberField(form, "totalValue", totalValue);
  setNumberField(form, "funrural", funrural);
  setNumberField(form, "netInvoice", netInvoice);
  setNumberField(form, "bags", bags);
  setNumberField(form, "totalFreight", totalFreight);
  setNumberField(form, "fixedValue", fixedValue);
  setNumberField(form, "estimatedToFixValue", estimatedToFixValue);
  setNumberField(form, "externalDifference", externalDifference);
  updateBillingContractHint();
}

function selectedBillingContract() {
  const form = document.getElementById("billing-form");
  if (!form) return null;
  const contractNumber = form.elements.contractNumber.value;
  return data.contracts.find((item) => item.contractNumber && item.contractNumber === contractNumber) || null;
}

function updateBillingContractHint() {
  const hint = document.getElementById("billing-contract-hint");
  const form = document.getElementById("billing-form");
  if (!hint || !form) return;
  const contract = selectedBillingContract();
  if (!contract) {
    hint.textContent = "Selecione um contrato para preencher cliente, cultura, safra e valor/kg.";
    hint.dataset.type = "info";
    return;
  }
  const currentBillingId = editingBillingId;
  const billedBefore = data.billings
    .filter((item) => item.contractNumber === contract.contractNumber && item.id !== currentBillingId)
    .reduce((sum, item) => sum + billingWeight(item), 0);
  const currentWeight = Number(form.elements.exitWeight.value || 0);
  const balanceAfter = Number(contract.kgContracted || 0) - billedBefore - currentWeight;
  hint.textContent =
    balanceAfter >= 0
      ? `Contrato ${contract.contractNumber}: saldo apos este faturamento ${kg(balanceAfter)}.`
      : `Contrato ${contract.contractNumber}: excedente previsto ${kg(Math.abs(balanceAfter))}.`;
  hint.dataset.type = balanceAfter >= 0 ? "info" : "warning";
}

function applySelectedContractToBilling() {
  const form = document.getElementById("billing-form");
  if (!form) return;
  const contract = selectedBillingContract();
  if (!contract) {
    updateBillingContractHint();
    return;
  }
  if (contract.crop) form.elements.crop.value = contract.crop;
  if (contract.season) form.elements.season.value = contract.season;
  if (contract.customer) form.elements.customer.value = contract.customer;
  if (contract.pricePerKg) form.elements.pricePerKg.value = Number(contract.pricePerKg || 0);
  calculateBilling();
}

function calculateContract() {
  const form = document.getElementById("contract-form");
  if (!form) return;

  const kgContracted = Number(form.elements.kgContracted.value || 0);
  const pricePerKg = Number(form.elements.pricePerKg.value || 0);
  const funruralRate = Number(form.elements.funruralRate.value || 0);
  const commissionRate = Number(form.elements.commission.value || 0);
  const royaltiesRate = Number(form.elements.royalties.value || 0);
  const bagsContracted = bagsForWeight(kgContracted, form.elements.crop?.value);
  const grossValue = kgContracted * pricePerKg;
  const funrural = grossValue * (funruralRate / 100);
  const netValue = grossValue - funrural;
  const commissionValue = grossValue * (commissionRate / 100);
  const royaltiesValue = grossValue * (royaltiesRate / 100);
  const settlementExtraDiscountValue = Number(form.elements.settlementExtraDiscountValue?.value || 0);
  const settlementReturnsValue = Number(form.elements.settlementReturnsValue?.value || 0);
  const settlementSpecialNegotiationValue = Number(form.elements.settlementSpecialNegotiationValue?.value || 0);
  const settlementExcessValue = Number(form.elements.settlementExcessValue?.value || 0);
  const settlementToFixKg = Number(form.elements.settlementToFixKg?.value || 0);
  const settlementToFixValue = Number(form.elements.settlementToFixValue?.value || 0);
  const settlementFixedPrice = Number(form.elements.settlementFixedPrice?.value || 0);
  const settlementFixedValue = settlementToFixKg * settlementFixedPrice;
  const settlementToFixEffectiveValue = settlementFixedValue || settlementToFixValue;
  const settlementCostPrice = settlementFixedPrice || pricePerKg;
  const settlementCommissionValue =
    Number(form.elements.settlementCommissionKg?.value || 0) *
    settlementCostPrice *
    (Number(form.elements.settlementCommissionRate?.value || 0) / 100);
  const settlementRoyaltiesValue =
    Number(form.elements.settlementRoyaltiesKg?.value || 0) *
    settlementCostPrice *
    (Number(form.elements.settlementRoyaltiesRate?.value || 0) / 100);
  const settlementBalanceKg =
    Number(form.elements.settlementExcessKg?.value || 0) +
    settlementToFixKg -
    Number(form.elements.settlementReturnsKg?.value || 0);
  const settlementBalanceValue =
    settlementSpecialNegotiationValue +
    settlementExcessValue +
    settlementToFixEffectiveValue -
    settlementExtraDiscountValue -
    settlementReturnsValue -
    settlementCommissionValue -
    settlementRoyaltiesValue;
  const closingCommissionValue =
    Number(form.elements.closingCommissionKg?.value || 0) *
    pricePerKg *
    (Number(form.elements.closingCommissionRate?.value || 0) / 100);
  const closingRoyaltiesValue =
    Number(form.elements.closingRoyaltiesKg?.value || 0) *
    pricePerKg *
    (Number(form.elements.closingRoyaltiesRate?.value || 0) / 100);
  const closingBalanceKg =
    Number(form.elements.closingConfirmedKg?.value || 0) +
    Number(form.elements.closingCounterKg?.value || 0) +
    Number(form.elements.closingExcessKg?.value || 0) +
    Number(form.elements.closingToFixKg?.value || 0) -
    Number(form.elements.closingTransferredKg?.value || 0) -
    Number(form.elements.closingIssuedInvoiceKg?.value || 0) -
    Number(form.elements.closingPendingInvoiceKg?.value || 0);
  const closingBalanceValue =
    Number(form.elements.closingConfirmedValue?.value || 0) +
    Number(form.elements.closingCounterValue?.value || 0) +
    Number(form.elements.closingExcessValue?.value || 0) +
    Number(form.elements.closingToFixValue?.value || 0) +
    Number(form.elements.closingPendingInvoiceValue?.value || 0) -
    Number(form.elements.closingTransferredValue?.value || 0) -
    Number(form.elements.closingStorageFeeValue?.value || 0) -
    Number(form.elements.closingRoundingValue?.value || 0) -
    Number(form.elements.closingIssuedInvoiceValue?.value || 0) -
    Number(form.elements.closingPaidValue?.value || 0) -
    closingCommissionValue -
    closingRoyaltiesValue;
  const totalNetValue = netValue - commissionValue - royaltiesValue + settlementBalanceValue - closingCommissionValue - closingRoyaltiesValue;

  setNumberField(form, "bagsContracted", bagsContracted);
  setNumberField(form, "grossValue", grossValue);
  setNumberField(form, "funrural", funrural);
  setNumberField(form, "netValue", netValue);
  setNumberField(form, "commissionValue", commissionValue);
  setNumberField(form, "royaltiesValue", royaltiesValue);
  setNumberField(form, "settlementFixedValue", settlementFixedValue);
  setNumberField(form, "settlementCommissionValue", settlementCommissionValue);
  setNumberField(form, "settlementRoyaltiesValue", settlementRoyaltiesValue);
  setNumberField(form, "settlementBalanceKg", settlementBalanceKg);
  setNumberField(form, "settlementBalanceValue", settlementBalanceValue);
  setNumberField(form, "closingCommissionValue", closingCommissionValue);
  setNumberField(form, "closingRoyaltiesValue", closingRoyaltiesValue);
  setNumberField(form, "closingBalanceKg", closingBalanceKg);
  setNumberField(form, "closingBalanceValue", closingBalanceValue);
  setNumberField(form, "totalNetValue", totalNetValue);
}

function calculateStorageReturn() {
  const form = document.getElementById("storage-return-form");
  if (!form) return;
  const weightKg = Number(form.elements.weightKg.value || 0);
  setNumberField(form, "bags", bagsForWeight(weightKg, form.elements.crop?.value));
}

function setBillingEditState(isEditing) {
  document.getElementById("billing-submit").textContent = isEditing ? "Atualizar faturamento" : "Salvar faturamento";
  document.getElementById("cancel-billing-edit").classList.toggle("hidden", !isEditing);
}

function fillForm(form, record) {
  const normalized = { ...record };
  if (form.id === "harvest-form") {
    normalized.transporter = normalized.transporter || normalized.identifier || "";
    normalized.unit = "Quilogramas";
  }
  if (form.id === "contract-form") {
    normalized.kgContracted = Number(normalized.kgContracted || 0) || Number(normalized.bagsContracted || 0) * bagSizeForCrop(normalized.crop);
    normalized.bagsContracted = Number(normalized.bagsContracted || bagsForWeight(normalized.kgContracted, normalized.crop) || 0);
    normalized.pricePerKg = Number(normalized.pricePerKg || 0) || Number(normalized.pricePerBag || 0) / bagSizeForCrop(normalized.crop);
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
  document.getElementById("harvest-submit").textContent = isEditing ? "Atualizar colheita" : "Salvar colheita";
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
  document.getElementById("contract-submit").textContent = isEditing ? "Atualizar contrato" : "Salvar contrato";
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
  document.getElementById("crop-plan-submit").textContent = isEditing ? "Atualizar safra" : "Salvar safra";
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

function setCostEditState(isEditing) {
  document.getElementById("cost-submit").textContent = isEditing ? "Atualizar custo" : "Salvar custo";
  document.getElementById("cancel-cost-edit").classList.toggle("hidden", !isEditing);
}

function startCostEdit(id) {
  const record = data.costs.find((item) => item.id === id);
  if (!record) return;
  const form = document.getElementById("cost-form");
  editingCostId = id;
  form.reset();
  fillForm(form, record);
  setCostEditState(true);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function stopCostEdit() {
  editingCostId = null;
  setCostEditState(false);
}

function stopCropPlanEdit() {
  editingCropPlanId = null;
  setCropPlanEditState(false);
}

function setStorageReturnEditState(isEditing) {
  document.getElementById("storage-return-submit").textContent = isEditing ? "Atualizar retorno" : "Salvar retorno";
  document.getElementById("cancel-storage-return-edit").classList.toggle("hidden", !isEditing);
}

function startStorageReturnEdit(id) {
  const record = data.storageReturns.find((item) => item.id === id);
  if (!record) return;

  const form = document.getElementById("storage-return-form");
  editingStorageReturnId = id;
  form.reset();
  fillForm(form, record);
  calculateStorageReturn();
  setStorageReturnEditState(true);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function stopStorageReturnEdit() {
  editingStorageReturnId = null;
  setStorageReturnEditState(false);
}

function setActiveView(view) {
  if (!titles[view]) return;
  document.querySelectorAll(".nav-item, .admin-menu-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `${view}-view`));
  document.getElementById("page-title").textContent = titles[view][0];
  document.getElementById("page-subtitle").textContent = titles[view][1];
  document.getElementById("admin-menu")?.classList.add("hidden");
}

document.querySelectorAll(".nav-item, .admin-menu-item").forEach((button) => {
  button.addEventListener("click", () => setActiveView(button.dataset.view));
});

document.getElementById("admin-menu-toggle").addEventListener("click", (event) => {
  event.stopPropagation();
  document.getElementById("admin-menu").classList.toggle("hidden");
});

document.addEventListener("click", (event) => {
  const menu = document.getElementById("admin-menu");
  const toggle = document.getElementById("admin-menu-toggle");
  if (!menu || !toggle || menu.classList.contains("hidden")) return;
  if (!menu.contains(event.target) && !toggle.contains(event.target)) menu.classList.add("hidden");
});

document.getElementById("harvest-form").addEventListener("input", calculateHarvest);
document.getElementById("harvest-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  calculateHarvest();
  const record = numericRecord(formValues(event.currentTarget), harvestNumericFields);
  record.unit = "Quilogramas";
  record.identifier = record.transporter;
  if (!record.adjustmentEffectiveNetWeight) record.adjustmentEffectiveNetWeight = record.netWeight;
  record.adjustmentDifferenceKg = Number(record.adjustmentConfirmedWeight || 0)
    ? Number(record.adjustmentConfirmedWeight || 0) - Number(record.adjustmentEffectiveNetWeight || 0)
    : 0;
  record.adjustmentDifferenceBags = bagsForWeight(record.adjustmentDifferenceKg, record.crop);

  if (editingHarvestId) {
    if (!confirmChange("Tem certeza que deseja salvar a alteracao desta colheita?")) return;
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
document.getElementById("billing-form").elements.contractNumber.addEventListener("change", applySelectedContractToBilling);
document.getElementById("billing-form").elements.contractNumber.addEventListener("blur", applySelectedContractToBilling);
document.getElementById("billing-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  calculateBilling();
  const record = numericRecord(formValues(event.currentTarget), billingNumericFields);
  record.saleMode = record.saleMode || "Contrato";
  record.priceStatus = record.priceStatus || (record.saleMode === "Venda a fixar" ? "A fixar" : "Fixado");
  if (record.priceStatus === "Fixado" && !record.fixedWeight) {
    record.fixedWeight = Number(record.exitWeight || 0);
    record.fixedPrice = Number(record.pricePerKg || 0);
    record.fixedValue = Number(record.totalValue || 0);
  }
  if (record.priceStatus === "A fixar" && !record.toFixWeight) {
    record.toFixWeight = Number(record.exitWeight || 0);
    record.estimatedPrice = Number(record.pricePerKg || 0);
    record.estimatedToFixValue = Number(record.totalValue || 0);
  }
  const linkedContract = data.contracts.find((item) => item.contractNumber && item.contractNumber === record.contractNumber);
  const requiresContract = !record.saleMode || record.saleMode === "Contrato";
  if (requiresContract && !record.contractNumber) {
    if (!confirmChange("Este faturamento esta sem contrato vinculado. Deseja salvar mesmo assim?")) return;
  } else if (requiresContract && !linkedContract) {
    if (!confirmChange("O contrato informado nao existe na aba Contratos. Deseja salvar mesmo assim?")) return;
  }
  if (!editingBillingId) {
    record.cte = "";
    record.portUnloadWeight = 0;
    record.weightDifference = Number(record.exitWeight || 0);
  } else {
    const existingBilling = data.billings.find((item) => item.id === editingBillingId);
    record.weightDifference = Number(record.exitWeight || 0) - Number(existingBilling?.portUnloadWeight || 0);
  }

  if (editingBillingId) {
    if (!confirmChange("Tem certeza que deseja salvar a alteracao deste faturamento?")) return;
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
    if (!confirmChange("Tem certeza que deseja salvar a alteracao deste contrato?")) return;
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
    if (!confirmChange("Tem certeza que deseja salvar a alteracao desta safra?")) return;
    await updateRecord("cropPlans", editingCropPlanId, record);
    stopCropPlanEdit();
  } else {
    await addRecord("cropPlans", record);
  }

  event.currentTarget.reset();
});

document.getElementById("cost-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const record = numericRecord(formValues(event.currentTarget), costNumericFields);
  if (editingCostId) {
    if (!confirmChange("Tem certeza que deseja salvar a alteracao deste custo?")) return;
    await updateRecord("costs", editingCostId, record);
    stopCostEdit();
  } else {
    await addRecord("costs", record);
  }
  event.currentTarget.reset();
});

document.getElementById("directory-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const record = normalizeRecordNames("directories", formValues(event.currentTarget));
  if (editingDirectoryId) {
    if (!confirmChange("Tem certeza que deseja salvar a alteracao deste cadastro?")) return;
    await updateRecord("directories", editingDirectoryId, record);
    stopDirectoryEdit();
  } else {
    await addRecord("directories", record);
  }
  event.currentTarget.reset();
});

document.getElementById("storage-return-form").addEventListener("input", calculateStorageReturn);
document.getElementById("storage-return-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  calculateStorageReturn();
  const record = numericRecord(formValues(form), storageReturnNumericFields);
  record.bags = bagsForWeight(record.weightKg, record.crop);
  if (editingStorageReturnId) {
    if (!confirmChange("Tem certeza que deseja salvar a alteracao deste retorno?")) return;
    await updateRecord("storageReturns", editingStorageReturnId, record);
    stopStorageReturnEdit();
  } else {
    await addRecord("storageReturns", record);
  }
  form.reset();
  if (storageFilters.crop !== "all") form.elements.crop.value = storageFilters.crop;
  if (storageFilters.season !== "all") form.elements.season.value = storageFilters.season;
  calculateStorageReturn();
});

document.getElementById("billing-search").addEventListener("input", renderBilling);
document.getElementById("contract-search").addEventListener("input", renderContracts);
document.getElementById("global-search").addEventListener("input", (event) => {
  globalSearchTerm = event.target.value;
  renderUniversalSearch();
});
document.getElementById("audit-search").addEventListener("input", (event) => {
  auditSearchTerm = event.target.value;
  renderFullAudit();
});
document.getElementById("retry-sync-log").addEventListener("click", retryPendingSyncLogs);
document.getElementById("download-scheduled-backup").addEventListener("click", downloadLatestScheduledBackup);
document.getElementById("close-history").addEventListener("click", closeRecordHistory);
document.getElementById("history-modal").addEventListener("click", (event) => {
  if (event.target.id === "history-modal") closeRecordHistory();
});
document.getElementById("show-contract-form").addEventListener("click", () => {
  document.getElementById("contract-form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
});

["billing-crop-filter", "billing-season-filter", "billing-contract-filter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    const key =
      id === "billing-crop-filter"
        ? "crop"
        : id === "billing-season-filter"
          ? "season"
          : "contract";
    billingFilters[key] = event.target.value;
    renderBilling();
  });
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

["storage-crop-filter", "storage-season-filter", "storage-contract-filter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    const key =
      id === "storage-crop-filter"
        ? "crop"
        : id === "storage-season-filter"
          ? "season"
          : "contract";
    storageFilters[key] = event.target.value;
    const form = document.getElementById("storage-return-form");
    if (key === "crop" && storageFilters.crop !== "all") form.elements.crop.value = storageFilters.crop;
    if (key === "season" && storageFilters.season !== "all") form.elements.season.value = storageFilters.season;
    renderStorageReturns();
  });
});

["receipt-crop-filter", "receipt-season-filter", "receipt-due-filter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    const key =
      id === "receipt-crop-filter"
        ? "crop"
        : id === "receipt-season-filter"
          ? "season"
          : "due";
    receiptFilters[key] = event.target.value;
    renderReceipts();
  });
});

["closing-crop-filter", "closing-season-filter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    closingFilters[id === "closing-crop-filter" ? "crop" : "season"] = event.target.value;
    renderClosingContracts();
  });
});

["client-account-crop-filter", "client-account-season-filter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    clientAccountFilters[id === "client-account-crop-filter" ? "crop" : "season"] = event.target.value;
    renderClientAccount();
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

["summary-crop-filter", "summary-season-filter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    summaryFilters[id === "summary-crop-filter" ? "crop" : "season"] = event.target.value;
    renderSummaryView();
  });
});

["dre-crop-filter", "dre-season-filter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    dreFilters[id === "dre-crop-filter" ? "crop" : "season"] = event.target.value;
    renderDreCosts();
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

  const editCostButton = event.target.closest("[data-edit-cost]");
  if (editCostButton) {
    startCostEdit(editCostButton.dataset.editCost);
    return;
  }

  const editDirectoryButton = event.target.closest("[data-edit-directory]");
  if (editDirectoryButton) {
    startDirectoryEdit(editDirectoryButton.dataset.editDirectory);
    return;
  }

  const editStorageReturnButton = event.target.closest("[data-edit-storage-return]");
  if (editStorageReturnButton) {
    startStorageReturnEdit(editStorageReturnButton.dataset.editStorageReturn);
    return;
  }

  const historyButton = event.target.closest("[data-history]");
  if (historyButton) {
    openRecordHistory(historyButton.dataset.history, historyButton.dataset.id);
    return;
  }

  const closeContractButton = event.target.closest("[data-close-contract]");
  if (closeContractButton) {
    const record = data.contracts.find((item) => item.id === closeContractButton.dataset.closeContract);
    if (!record) return;
    if (!confirmChange(`Fechar o contrato ${record.contractNumber || ""}? Ele ficara marcado como encerrado.`)) return;
    await updateRecord("contracts", record.id, { contractClosed: true });
    return;
  }

  const reopenContractButton = event.target.closest("[data-reopen-contract]");
  if (reopenContractButton) {
    const record = data.contracts.find((item) => item.id === reopenContractButton.dataset.reopenContract);
    if (!record) return;
    if (!confirmChange(`Reabrir o contrato ${record.contractNumber || ""}?`)) return;
    await updateRecord("contracts", record.id, { contractClosed: false });
    return;
  }

  const toggleCropPlanButton = event.target.closest("[data-toggle-crop-plan-closed]");
  if (toggleCropPlanButton) {
    const record = data.cropPlans.find((item) => item.id === toggleCropPlanButton.dataset.toggleCropPlanClosed);
    if (!record) return;
    const nextClosed = !record.closed;
    if (nextClosed) {
      const checklist = closingChecklistFor(record.crop, recordSeason(record));
      if (!checklist.ok) {
        const pendingText = [
          checklist.openFreight ? `${checklist.openFreight} frete(s) aberto(s)` : "",
          checklist.overdueReceipt ? `${checklist.overdueReceipt} recebimento(s) vencido(s)` : "",
          checklist.openContract ? `${checklist.openContract} contrato(s) aberto(s)` : "",
          checklist.missingDocs ? `${checklist.missingDocs} NFE/CT-e faltando` : ""
        ].filter(Boolean).join("\n");
        const typed = prompt(`Checklist de fechamento encontrou pendencias:\n\n${pendingText}\n\nDigite FECHAR para encerrar mesmo assim.`);
        if (typed !== "FECHAR") return;
      }
    }
    const message = nextClosed
      ? `Fechar a safra ${record.crop || ""} ${recordSeason(record)}? Depois disso, lancamentos dessa safra ficam somente leitura.`
      : `Reabrir a safra ${record.crop || ""} ${recordSeason(record)} para permitir alteracoes?`;
    if (!confirmChange(message)) return;
    await updateRecord("cropPlans", record.id, { closed: nextClosed });
    return;
  }

  const restoreDeletedButton = event.target.closest("[data-restore-deleted]");
  if (restoreDeletedButton) {
    if (!confirmChange("Deseja recuperar este lancamento da lixeira?")) return;
    await restoreDeletedItem(restoreDeletedButton.dataset.restoreDeleted);
    return;
  }

  const retrySyncButton = event.target.closest("[data-retry-sync]");
  if (retrySyncButton) {
    const log = syncLogs.find((item) => item.id === retrySyncButton.dataset.retrySync);
    if (log) await retrySyncLog(log);
    return;
  }

  const deleteButton = event.target.closest("[data-delete]");
  if (!deleteButton) return;
  if (!requireDeleteText()) return;
  await deleteRecord(deleteButton.dataset.delete, deleteButton.dataset.id);
});

document.addEventListener("change", async (event) => {
  const freightDateInput = event.target.closest("[data-freight-date]");
  if (freightDateInput) {
    const record = data[freightDateInput.dataset.source].find((item) => item.id === freightDateInput.dataset.id);
    if (record && freightIsPaid(record) && !confirmChange("Este frete ja esta pago. Confirma mesmo assim a alteracao?")) {
      renderFreights();
      return;
    }
    if (!confirmChange("Tem certeza que deseja alterar esta data de pagamento do frete?")) {
      renderFreights();
      return;
    }
    await updateRecord(freightDateInput.dataset.source, freightDateInput.dataset.id, {
      [freightDateInput.dataset.freightDate]: freightDateInput.value
    });
    return;
  }

  const freightValueInput = event.target.closest("[data-freight-value]");
  if (freightValueInput) {
    const record = data[freightValueInput.dataset.source].find((item) => item.id === freightValueInput.dataset.id);
    if (record && freightIsPaid(record) && !confirmChange("Este frete ja esta pago. Confirma mesmo assim a alteracao?")) {
      renderFreights();
      return;
    }
    if (!confirmChange("Tem certeza que deseja alterar este valor liquidado do frete?")) {
      renderFreights();
      return;
    }
    if (!record) return;
    const field = freightValueInput.dataset.freightValue;
    const value = Number(freightValueInput.value || 0);
    const updated = { ...record, [field]: value };
    await updateRecord(freightValueInput.dataset.source, freightValueInput.dataset.id, {
      [field]: value,
      freightPaid: freightTotalValue(updated) > 0 && freightPaymentValue(updated) >= freightTotalValue(updated)
    });
    return;
  }

  const paidCheckbox = event.target.closest("[data-freight-paid]");
  if (paidCheckbox) {
    const record = data[paidCheckbox.dataset.freightPaid].find((item) => item.id === paidCheckbox.dataset.id);
    if (record && freightIsPaid(record) && !confirmChange("Este frete ja esta pago. Confirma mesmo assim a alteracao?")) {
      renderFreights();
      return;
    }
    if (!confirmChange("Tem certeza que deseja alterar o status de pagamento do frete?")) {
      renderFreights();
      return;
    }
    await updateRecord(paidCheckbox.dataset.freightPaid, paidCheckbox.dataset.id, { freightPaid: paidCheckbox.checked });
    return;
  }

  const billingFieldInput = event.target.closest("[data-billing-field]");
  if (billingFieldInput) {
    if (!confirmChange("Tem certeza que deseja alterar este campo do faturamento?")) {
      renderBilling();
      return;
    }
    const record = data.billings.find((item) => item.id === billingFieldInput.dataset.id);
    if (!record) return;
    const field = billingFieldInput.dataset.billingField;
    const value = field === "portUnloadWeight" ? Number(billingFieldInput.value || 0) : billingFieldInput.value;
    const update = { [field]: value };
    if (field === "portUnloadWeight") {
      update.weightDifference = Number(record.exitWeight || 0) - value;
    }
    await updateRecord("billings", billingFieldInput.dataset.id, update);
    return;
  }

  const receiptPaidCheckbox = event.target.closest("[data-receipt-paid]");
  if (receiptPaidCheckbox) {
    const source = receiptPaidCheckbox.dataset.receiptSource === "billing" ? "billings" : "contracts";
    const record = data[source].find((item) => item.id === receiptPaidCheckbox.dataset.receiptPaid);
    if (record && receiptPaidStatus(record) && !confirmChange("Este recebimento ja esta pago. Confirma mesmo assim a alteracao?")) {
      renderReceipts();
      return;
    }
    if (!confirmChange("Tem certeza que deseja alterar o status de pagamento deste recebimento?")) {
      renderReceipts();
      return;
    }
    await updateRecord(source, receiptPaidCheckbox.dataset.receiptPaid, { receiptPaid: receiptPaidCheckbox.checked });
    return;
  }

  const receiptFieldInput = event.target.closest("[data-receipt-field]");
  if (receiptFieldInput) {
    const source = receiptFieldInput.dataset.receiptSource === "billing" ? "billings" : "contracts";
    const record = data[source].find((item) => item.id === receiptFieldInput.dataset.id);
    if (record && receiptPaidStatus(record) && !confirmChange("Este recebimento ja esta pago. Confirma mesmo assim a alteracao?")) {
      renderReceipts();
      return;
    }
    if (!confirmChange("Tem certeza que deseja alterar este recebimento?")) {
      renderReceipts();
      return;
    }
    const field = receiptFieldInput.dataset.receiptField;
    const value = field === "receiptValue1" || field === "receiptValue2" ? Number(receiptFieldInput.value || 0) : receiptFieldInput.value;
    if (!record) return;
    const updated = { ...record, [field]: value };
    await updateRecord(source, receiptFieldInput.dataset.id, {
      [field]: value,
      receiptPaid: receiptPaymentValue(updated) >= receiptTotalValue(updated) && receiptTotalValue(updated) > 0
    });
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

document.getElementById("cancel-cost-edit").addEventListener("click", () => {
  document.getElementById("cost-form").reset();
  stopCostEdit();
});

document.getElementById("cancel-directory-edit").addEventListener("click", () => {
  document.getElementById("directory-form").reset();
  stopDirectoryEdit();
});

document.getElementById("cancel-storage-return-edit").addEventListener("click", () => {
  const form = document.getElementById("storage-return-form");
  form.reset();
  stopStorageReturnEdit();
  calculateStorageReturn();
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

document.getElementById("view-mode-toggle").addEventListener("click", () => {
  localStorage.setItem(VIEW_MODE_STORAGE_KEY, String(!isViewMode()));
  applyViewMode();
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

function downloadText(filename, content, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function rowsToCsv(rows) {
  if (!rows.length) return "Sem dados\n";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvCell).join(";"),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(";"))
  ].join("\n");
}

function activeViewName() {
  return document.querySelector(".nav-item.active, .admin-menu-item.active")?.dataset.view || "dashboard";
}

function filteredFreightExportRows() {
  return freightRows().filter((item) => {
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
}

function currentViewExportRows() {
  const view = activeViewName();
  if (view === "visao") {
    const pending = pendingItems();
    return [
      { Indicador: "Sem NFE", Quantidade: pending.missingNfe.length },
      { Indicador: "Sem CT-e", Quantidade: pending.missingCte.length },
      { Indicador: "Frete aberto", Quantidade: pending.openFreights.length },
      { Indicador: "Recebimento vencido", Quantidade: pending.overdueReceipts.length },
      { Indicador: "Contrato com excedente", Quantidade: pending.exceededContracts.length }
    ];
  }
  if (view === "colheitas") {
    return data.harvests.map((item) => ({
      Data: item.date,
      Safra: recordSeason(item),
      Cultura: item.crop,
      Transportador: transportName(item),
      Destino: item.cooperative,
      Nota: item.invoice,
      "Peso liquido": harvestQuantity(item),
      "Valor frete": item.harvestFreightValue
    }));
  }
  if (view === "faturamento") {
    return data.billings.filter(matchesBillingFilters).map((item) => ({
      Data: item.date,
      NFP: item.nfp,
      NFE: item.nfe,
      "Status NF": item.invoiceStatus,
      Contrato: item.contractNumber,
      Modalidade: item.saleMode,
      "Status preco": item.priceStatus,
      Cultura: item.crop,
      Safra: recordSeason(item),
      Cliente: item.customer,
      "Tipo frete": item.freightMode,
      "Peso saida": billingWeight(item),
      "Peso porto": item.portUnloadWeight,
      "Diferenca peso": Number(item.exitWeight || 0) - Number(item.portUnloadWeight || 0),
      "NF liquida": item.netInvoice,
      "Sistema externo": item.externalSystemValue,
      "Dif sistema": item.externalDifference,
      "Status conferencia": item.externalCheckStatus
    }));
  }
  if (view === "contratos") {
    return data.contracts.map((item) => ({
      Cliente: item.customer,
      Contrato: item.contractNumber,
      Cultura: item.crop,
      Safra: recordSeason(item),
      KG: item.kgContracted,
      "KG faturado": contractBilledWeight(item),
      "Saldo kg": contractBalanceKg(item),
      "Total liquido": receiptTotalValue(item),
      Status: contractStatus(item)
    }));
  }
  if (view === "recebimentos") {
    return data.contracts.filter(matchesReceiptFilters).map((item) => ({
      Cliente: item.customer,
      Contrato: item.contractNumber,
      Prazo: item.paymentDeadline,
      "Liq final": receiptTotalValue(item),
      "Data 1": item.receiptDate1,
      "Valor 1": item.receiptValue1,
      "Data 2": item.receiptDate2,
      "Valor 2": item.receiptValue2,
      Saldo: Math.max(receiptTotalValue(item) - receiptPaymentValue(item), 0),
      Pago: receiptPaidStatus(item) ? "Sim" : "Nao"
    }));
  }
  if (view === "fretes") {
    return filteredFreightExportRows().map((item) => ({
      Data: item.date,
      Origem: item.sourceLabel,
      Referencia: item.reference,
      Cultura: item.crop,
      Safra: item.season,
      Transportador: item.transporter,
      Peso: item.weight,
      "Valor frete": item.freightValue,
      "Pago 1": item.paymentValue1,
      "Pago 2": item.paymentValue2,
      Saldo: Math.max(Number(item.freightValue || 0) - Number(item.paymentValue1 || 0) - Number(item.paymentValue2 || 0), 0)
    }));
  }
  if (view === "retorno-armazenagem") {
    return data.storageReturns.filter(matchesStorageFilters).map((item) => ({
      Data: item.date,
      NFE: item.nfe,
      NFP: item.nfp,
      Empresa: item.company,
      Peso: item.weightKg,
      SC: storageReturnBags(item),
      Cultura: item.crop,
      Safra: recordSeason(item)
    }));
  }
  if (view === "safras") {
    return data.cropPlans.map((item) => ({
      Cultura: item.crop,
      Safra: recordSeason(item),
      Hectares: item.hectares,
      Status: item.closed ? "Fechada" : "Aberta"
    }));
  }
  if (view === "cadastros") {
    return (data.directories || []).map((item) => ({
      Tipo: directoryTypeLabel(item.type),
      Nome: item.name,
      Variacoes: item.aliases
    }));
  }
  if (view === "dre-custos") {
    return dreCultureRows().map((item) => ({
      Cultura: item.crop,
      Safra: item.season,
      Hectares: item.hectares,
      "Receita liquida": item.netRevenue,
      Frete: item.freight,
      Custos: item.directCosts,
      "Comissao": item.commissions,
      Royalties: item.royalties,
      "Custo/ha": item.hectares ? item.directCosts / item.hectares : 0,
      "Margem real": item.margin,
      "Margem/ha": item.hectares ? item.margin / item.hectares : 0
    }));
  }
  if (view === "resumo-safra") {
    return seasonSummaryRows().map((item) => ({
      Cultura: item.crop,
      Safra: item.season,
      Colhido: item.harvested,
      Armazenado: item.stored,
      Retornado: item.returned,
      Contratado: item.contracted,
      Faturado: item.billed,
      Recebido: item.received,
      "A receber": item.receivable,
      Frete: item.freight,
      "Margem liquida": item.margin
    }));
  }
  if (view === "mapa-pendencias") {
    const pending = pendingItems();
    return [
      { Pendencia: "Sem NFE", Quantidade: pending.missingNfe.length },
      { Pendencia: "Sem CT-e", Quantidade: pending.missingCte.length },
      { Pendencia: "Frete aberto", Quantidade: pending.openFreights.length },
      { Pendencia: "Recebimento vencido", Quantidade: pending.overdueReceipts.length },
      { Pendencia: "Contrato com excedente", Quantidade: pending.exceededContracts.length },
      { Pendencia: "Itens na lixeira", Quantidade: (data.deletedItems || []).length }
    ];
  }
  if (view === "auditoria") {
    return (data.auditLogs || []).map((item) => ({
      Data: item.createdAt,
      Operador: item.operator || "Acesso geral",
      Acao: item.action,
      Tela: item.collectionLabel || collectionLabel(item.collection),
      Registro: item.summary,
      Alteracoes: item.changesText || changesText(item.changes || [])
    }));
  }
  if (view === "dashboard") {
    return seasonSummaryRows().map((item) => ({
      Cultura: item.crop,
      Safra: item.season,
      Colhido: item.harvested,
      Faturado: item.billed,
      Recebido: item.received,
      "A receber": item.receivable,
      Frete: item.freight
    }));
  }
  return [];
}

function directorReportSheets() {
  const summary = seasonSummaryRows().map((item) => ({
    Cultura: item.crop,
    Safra: item.season,
    Colhido: item.harvested,
    Armazenado: item.stored,
    Retornado: item.returned,
    Contratado: item.contracted,
    Faturado: item.billed,
    Recebido: item.received,
    "A receber": item.receivable,
    Frete: item.freight,
    "Margem liquida": item.margin
  }));
  const pending = pendingItems();
  const alerts = automaticAlerts();
  return {
    "Resumo Safra": summary,
    Contratos: data.contracts.map((item) => ({
      Cliente: item.customer,
      Contrato: item.contractNumber,
      Cultura: item.crop,
      Safra: recordSeason(item),
      KG: item.kgContracted,
      Faturado: contractBilledWeight(item),
      Saldo: contractBalanceKg(item),
      Status: contractStatus(item),
      "Total liquido": receiptTotalValue(item)
    })),
    Recebimentos: data.contracts.map((item) => ({
      Cliente: item.customer,
      Contrato: item.contractNumber,
      "Prazo pgto": item.paymentDeadline,
      Valor: receiptTotalValue(item),
      Recebido: receiptPaymentValue(item),
      Saldo: receiptBalanceValue(item),
      Pago: receiptPaidStatus(item) ? "Sim" : "Nao"
    })),
    Pendencias: [
      { Tipo: "Sem NFE", Quantidade: pending.missingNfe.length },
      { Tipo: "Sem CT-e", Quantidade: pending.missingCte.length },
      { Tipo: "Frete aberto", Quantidade: pending.openFreights.length },
      { Tipo: "Recebimento vencido", Quantidade: pending.overdueReceipts.length },
      { Tipo: "Contrato com excedente", Quantidade: pending.exceededContracts.length },
      { Tipo: "Contrato perto do prazo", Quantidade: alerts.deliverySoon.length },
      { Tipo: "Recebimento proximos 7 dias", Quantidade: alerts.receiptsSoon.length },
      { Tipo: "Safra fechada com pendencia", Quantidade: alerts.closedWithPending.length }
    ],
    "Status Safra": seasonOperationalRows()
    ,
    "DRE Custos": dreCultureRows().map((item) => ({
      Cultura: item.crop,
      Safra: item.season,
      Hectares: item.hectares,
      "Receita liquida": item.netRevenue,
      Frete: item.freight,
      Custos: item.directCosts,
      Comissao: item.commissions,
      Royalties: item.royalties,
      "Custo/ha": item.hectares ? item.directCosts / item.hectares : 0,
      "Margem real": item.margin,
      "Margem/ha": item.hectares ? item.margin / item.hectares : 0
    })),
    Cadastros: (data.directories || []).map((item) => ({
      Tipo: directoryTypeLabel(item.type),
      Nome: item.name,
      Variacoes: item.aliases
    })),
    "Margem Contratos": data.contracts.map((item) => {
      const margin = contractMargin(item);
      return {
        Cliente: item.customer,
        Contrato: item.contractNumber,
        "Receita liquida": margin.netInvoice,
        Frete: margin.freight,
        Comissao: margin.commission,
        Royalties: margin.royalties,
        FUNRURAL: margin.funrural,
        Margem: margin.margin,
        "Margem/kg": margin.marginPerKg
      };
    }),
    "Previsao Caixa": Object.values(
      data.contracts.filter((item) => !receiptPaidStatus(item)).reduce((acc, item) => {
        const client = item.customer || "Sem cliente";
        if (!acc[client]) acc[client] = { Cliente: client, Vencido: 0, "7 dias": 0, "30 dias": 0, "Mais de 30 dias": 0 };
        const days = daysUntil(item.paymentDeadline);
        const value = receiptBalanceValue(item);
        if (days === null || days > 30) acc[client]["Mais de 30 dias"] += value;
        else if (days < 0) acc[client].Vencido += value;
        else if (days <= 7) acc[client]["7 dias"] += value;
        else acc[client]["30 dias"] += value;
        return acc;
      }, {})
    ),
    "Checklist Fechamento": seasonOperationalRows().map((item) => closingChecklistFor(item.crop, item.season)),
    "Comparativo Safras": availableCropNames().map((crop) => {
      const seasons = availableSeasonNames();
      const current = seasons[0] || "";
      const previous = seasons[1] || "";
      const currentMetrics = seasonMetrics(crop, current);
      const previousMetrics = seasonMetrics(crop, previous);
      return {
        Cultura: crop,
        "Safra atual": current,
        "Safra anterior": previous,
        "SC/ha atual": currentMetrics.scHa,
        "SC/ha anterior": previousMetrics.scHa,
        "Faturamento atual": currentMetrics.revenue,
        "Faturamento anterior": previousMetrics.revenue,
        "Preco medio atual": currentMetrics.avgPrice,
        "Frete medio atual": currentMetrics.avgFreight,
        "Margem atual": currentMetrics.margin
      };
    })
  };
}

function downloadDirectorReport() {
  const sheets = directorReportSheets();
  const date = new Date().toISOString().slice(0, 10);
  if (window.XLSX) {
    const workbook = XLSX.utils.book_new();
    Object.entries(sheets).forEach(([name, rows]) => {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Aviso: "Sem dados" }]), name.slice(0, 31));
    });
    XLSX.writeFile(workbook, `relatorio-safras-${date}.xlsx`);
    return;
  }
  const content = Object.entries(sheets)
    .map(([name, rows]) => `## ${name}\n${rowsToCsv(rows)}`)
    .join("\n\n");
  downloadText(`relatorio-safras-${date}.csv`, content);
}

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function rowPick(row, names) {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
  for (const name of names) {
    const value = normalized[normalizeHeader(name)];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function parseDateCell(value) {
  if (!value) return "";
  if (typeof value === "number" && window.XLSX) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const text = String(value).trim();
  const brazil = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brazil) {
    const year = brazil[3].length === 2 ? `20${brazil[3]}` : brazil[3];
    return `${year}-${brazil[2].padStart(2, "0")}-${brazil[1].padStart(2, "0")}`;
  }
  return text;
}

function parseNumberCell(value) {
  if (typeof value === "number") return value;
  return Number(String(value || "0").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
}

function inferCropFromText(text) {
  const normalized = normalizeHeader(text);
  if (normalized.includes("aveia")) return "Aveia";
  if (normalized.includes("trigo")) return "Trigo";
  if (normalized.includes("soja")) return "Soja";
  if (normalized.includes("milho")) return "Milho";
  return "";
}

function inferImportTarget(sheetName, rows, fileName = "") {
  const text = `${fileName} ${sheetName} ${Object.keys(rows[0] || {}).join(" ")}`;
  const normalized = normalizeHeader(text);
  const headers = normalizeHeader(Object.keys(rows[0] || {}).join(" "));
  const crop = inferCropFromText(text);
  if (normalized.includes("custo") || normalized.includes("dre")) return { collection: "costs", type: "custos", crop };
  if (normalized.includes("contrato")) return { collection: "contracts", type: "contratos", crop };
  if (normalized.includes("retorno")) return { collection: "storageReturns", type: "retorno", crop };
  if (normalized.includes("faturamento") || normalized.includes("venda") || normalized.includes("fat")) return { collection: "billings", type: "faturamento", crop };
  if (normalized.includes("armazenagem") || normalized.includes("colheita") || normalized.includes("remessa")) return { collection: "harvests", type: "colheitas", crop };
  if (headers.includes("nfp") && headers.includes("nfe") && headers.includes("cliente") && (headers.includes("pesosaida") || headers.includes("pesokg"))) {
    return { collection: "billings", type: "faturamento", crop };
  }
  if (headers.includes("nfp") && headers.includes("nfe") && headers.includes("empresa") && headers.includes("pesokg") && !headers.includes("bruto")) {
    return { collection: "storageReturns", type: "retorno", crop };
  }
  if (headers.includes("nfp") && headers.includes("nfe") && (headers.includes("bruto") || headers.includes("pesoliquidoefetivo"))) {
    return { collection: "harvests", type: "colheitas", crop };
  }
  if ((headers.includes("categoria") || headers.includes("descricao") || headers.includes("descrio")) && (headers.includes("valor") || headers.includes("custo") || headers.includes("total"))) {
    return { collection: "costs", type: "custos", crop };
  }
  if (normalized.includes("safra") || normalized.includes("hectare")) return { collection: "cropPlans", type: "safras", crop };
  return null;
}

function isMeaningfulImportedRecord(type, record) {
  if (type === "colheitas") return Boolean(record.date && (record.invoice || record.cooperative) && Number(record.netWeight || record.grossWeight || 0) > 0);
  if (type === "faturamento") return Boolean((record.nfp || record.nfe || record.customer) && Number(record.exitWeight || record.totalValue || record.netInvoice || 0) > 0);
  if (type === "contratos") return Boolean((record.contractNumber || record.customer) && Number(record.kgContracted || record.grossValue || record.netValue || 0) > 0);
  if (type === "retorno") return Boolean(record.date && (record.nfe || record.nfp || record.company) && Number(record.weightKg || 0) > 0);
  if (type === "safras") return Boolean(record.crop && (record.season || Number(record.hectares || 0) > 0));
  if (type === "custos") return Boolean((record.description || record.category) && Number(record.amount || 0) > 0);
  return true;
}

function mapImportedRow(type, row, defaults = {}) {
  if (type === "colheitas") {
    const grossWeight = parseNumberCell(rowPick(row, ["Bruto kg", "Bruto", "Bruto da carga", "Peso bruto"]));
    const netWeight = parseNumberCell(rowPick(row, ["Liquido kg", "Liquido", "Total liquido", "Peso liquido efetivo", "Peso liquido"]));
    const crop = rowPick(row, ["Cultura"]) || defaults.crop || "Milho";
    const freightMode = rowPick(row, ["Tipo frete", "Modalidade frete"]) || (String(rowPick(row, ["Frete", "Frete R$/Ton", "Frete R$X/Ton"])).toUpperCase().includes("FOB") ? "FOB" : "Frete terceiro");
    return {
      date: parseDateCell(rowPick(row, ["Data"])),
      season: rowPick(row, ["Safra", "Ano safra", "Ano da safra"]) || defaults.season || "",
      crop,
      unit: "Quilogramas",
      transporter: rowPick(row, ["Transportador", "Identificador"]),
      identifier: rowPick(row, ["Transportador", "Identificador"]),
      cooperative: rowPick(row, ["Cooperativa", "Destino", "Empresa", "Cliente"]),
      invoice: rowPick(row, ["Nota fiscal", "NFP", "NF", "Nota"]),
      freightMode,
      grossWeight,
      impurityWeight: parseNumberCell(rowPick(row, ["Impureza kg", "Impureza"])),
      humidityWeight: parseNumberCell(rowPick(row, ["Umidade kg", "Umidade"])),
      discountTotal: Math.max(grossWeight - netWeight, 0),
      netWeight,
      harvestFreightValue: parseNumberCell(rowPick(row, ["Valor frete", "Valor total do frete", "Total frete"]))
    };
  }
  if (type === "faturamento") {
    const exitWeight = parseNumberCell(rowPick(row, ["Peso saida", "Peso saida kg", "Peso liquido efetivo"]));
    const totalValue = parseNumberCell(rowPick(row, ["Total", "Bruto"]));
    const crop = rowPick(row, ["Cultura"]) || defaults.crop || "Milho";
    const netInvoice = parseNumberCell(rowPick(row, ["NF liquida", "Nf liquida", "Liquido"]));
    const externalSystemValue = parseNumberCell(rowPick(row, ["Aegro lancado", "Sistema externo", "Valor sistema externo"]));
    const freightText = rowPick(row, ["Frete", "Frete R$/Ton", "Frete R$X/Ton"]);
    const freightMode = rowPick(row, ["Tipo frete", "Modalidade frete"]) || (String(freightText).toUpperCase().includes("FOB") ? "FOB" : "Frete terceiro");
    return {
      date: parseDateCell(rowPick(row, ["Data"])),
      nfp: rowPick(row, ["NFP"]),
      nfe: rowPick(row, ["NFE"]),
      invoiceStatus: rowPick(row, ["Status NF", "Status da NF"]) || "Emitida",
      contractNumber: rowPick(row, ["Contrato", "No contrato", "N contrato"]),
      crop,
      season: rowPick(row, ["Safra", "Ano safra"]) || defaults.season || "",
      saleMode: rowPick(row, ["Modalidade venda", "Modalidade da venda"]) || (rowPick(row, ["Contrato", "No contrato", "N contrato"]) ? "Contrato" : "Venda direta"),
      priceStatus: rowPick(row, ["Status preco", "Status do preco"]) || "Fixado",
      departureLocation: rowPick(row, ["Local de saida", "Local saida"]),
      customer: rowPick(row, ["Cliente", "Cooperativa"]),
      transporter: rowPick(row, ["Transportador"]),
      freightMode,
      exitWeight,
      bags: bagsForWeight(exitWeight, crop),
      pricePerKg: parseNumberCell(rowPick(row, ["Valor kg", "R$/kg", "Preco kg"])),
      totalValue,
      funruralRate: parseNumberCell(rowPick(row, ["Aliq funrural", "Funrural %"])),
      funrural: parseNumberCell(rowPick(row, ["Funrural", "Funrural R$"])),
      netInvoice,
      receiptDate: parseDateCell(rowPick(row, ["Recebimento"])),
      totalFreight: parseNumberCell(rowPick(row, ["Total frete", "Valor total do frete"])),
      cte: rowPick(row, ["CT-e", "CTE"]),
      portUnloadWeight: parseNumberCell(rowPick(row, ["Peso descarga porto", "Peso porto"])),
      weightDifference: exitWeight - parseNumberCell(rowPick(row, ["Peso descarga porto", "Peso porto"])),
      externalSystemValue,
      externalDifference: externalSystemValue ? externalSystemValue - netInvoice : 0,
      externalCheckStatus: externalSystemValue ? "Conferido" : "Nao conferido"
    };
  }
  if (type === "contratos") {
    const kgContracted = parseNumberCell(rowPick(row, ["KG", "Kg", "Quilos"]));
    const grossValue = parseNumberCell(rowPick(row, ["Bruto"]));
    const crop = rowPick(row, ["Cultura"]) || defaults.crop || "Milho";
    return {
      customer: rowPick(row, ["Cliente"]),
      contractNumber: rowPick(row, ["Contrato"]),
      deliveryStart: parseDateCell(rowPick(row, ["Entrega a partir de", "Entrega"])),
      deliveryDeadline: parseDateCell(rowPick(row, ["Prazo final de entrega", "Final prazo de entrega"])),
      broker: rowPick(row, ["Corretora"]),
      kgContracted,
      bagsContracted: bagsForWeight(kgContracted, crop),
      pricePerKg: parseNumberCell(rowPick(row, ["R$/kg", "Valor kg"])),
      grossValue,
      funruralRate: parseNumberCell(rowPick(row, ["Funrural %", "Aliq funrural"])),
      funrural: parseNumberCell(rowPick(row, ["Funrural"])),
      netValue: parseNumberCell(rowPick(row, ["Valor liquido", "Liquido"])),
      paymentDeadline: parseDateCell(rowPick(row, ["Prazo pgto", "Prazo de pgto"])),
      commission: parseNumberCell(rowPick(row, ["Comissao"])),
      royalties: parseNumberCell(rowPick(row, ["Royalties"])),
      totalNetValue: parseNumberCell(rowPick(row, ["Total liquido"])),
      crop,
      season: rowPick(row, ["Safra", "Ano safra"]) || defaults.season || ""
    };
  }
  if (type === "retorno") {
    const weightKg = parseNumberCell(rowPick(row, ["Peso kg", "KG", "Peso"]));
    const crop = rowPick(row, ["Cultura"]) || defaults.crop || "Milho";
    return {
      date: parseDateCell(rowPick(row, ["Data"])),
      nfe: rowPick(row, ["NFE"]),
      nfp: rowPick(row, ["NFP"]),
      company: rowPick(row, ["Empresa", "Cooperativa"]),
      weightKg,
      bags: bagsForWeight(weightKg, crop),
      crop,
      season: rowPick(row, ["Safra", "Ano safra"]) || defaults.season || ""
    };
  }
  if (type === "custos") {
    return {
      date: parseDateCell(rowPick(row, ["Data"])),
      crop: rowPick(row, ["Cultura"]) || defaults.crop || "Milho",
      season: rowPick(row, ["Safra", "Ano safra", "Ano da safra"]) || defaults.season || "",
      category: rowPick(row, ["Categoria", "Tipo", "Grupo", "Conta"]) || "Outros",
      description: rowPick(row, ["Descricao", "Descrição", "Item", "Conta", "Historico", "Histórico"]) || rowPick(row, ["Categoria", "Tipo", "Grupo"]) || "Custo importado",
      hectares: parseNumberCell(rowPick(row, ["Hectares", "Ha", "Area", "Área"])),
      amount: parseNumberCell(rowPick(row, ["Valor", "Valor R$", "Custo", "Total", "Montante"])),
      notes: rowPick(row, ["Observacoes", "Observações", "Obs", "Notas"])
    };
  }
  return {
    crop: rowPick(row, ["Cultura"]) || defaults.crop || "Milho",
    season: rowPick(row, ["Safra", "Ano safra", "Ano de vigencia"]) || defaults.season || "",
    hectares: parseNumberCell(rowPick(row, ["Hectares", "Ha"]))
  };
}

async function importSpreadsheetFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "json") {
    const imported = { ...defaultData, ...JSON.parse(await file.text()) };
    if (useCloud) {
      for (const harvest of imported.harvests) await addRecord("harvests", harvest);
      for (const billing of imported.billings) await addRecord("billings", billing);
      for (const contract of imported.contracts || []) await addRecord("contracts", contract);
      for (const storageReturn of imported.storageReturns || []) await addRecord("storageReturns", storageReturn);
      for (const cropPlan of imported.cropPlans || []) await addRecord("cropPlans", cropPlan);
      for (const cost of imported.costs || []) await addRecord("costs", cost);
      for (const directory of imported.directories || []) await addRecord("directories", directory);
    } else {
      data = imported;
      saveLocal();
      render();
    }
    return;
  }

  if (!window.XLSX) {
    alert("Nao foi possivel carregar o leitor de planilhas. Tente importar em JSON ou verifique a internet.");
    return;
  }
  const targetMap = {
    colheitas: { collection: "harvests", type: "colheitas" },
    faturamento: { collection: "billings", type: "faturamento" },
    contratos: { collection: "contracts", type: "contratos" },
    retorno: { collection: "storageReturns", type: "retorno" },
    retornos: { collection: "storageReturns", type: "retorno" },
    safras: { collection: "cropPlans", type: "safras" },
    custos: { collection: "costs", type: "custos" },
    dre: { collection: "costs", type: "custos" }
  };
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  let importedCount = 0;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!rows.length) continue;
    let target = inferImportTarget(sheetName, rows, file.name);
    if (!target) continue;
    for (const row of rows) {
      const mapped = mapImportedRow(target.type, row, { crop: target.crop, season: rowPick(row, ["Safra", "Ano safra", "Ano da safra"]) });
      if (!isMeaningfulImportedRecord(target.type, mapped)) continue;
      await addRecord(target.collection, mapped);
      importedCount += 1;
    }
  }
  if (!importedCount) {
    const type = prompt("Nao reconheci automaticamente. Importar para qual tela? Digite: colheitas, faturamento, contratos, retorno, safras ou custos.");
    const target = targetMap[normalizeHeader(type)];
    if (!target) {
      alert("Tipo de importacao nao reconhecido.");
      return;
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const crop = inferCropFromText(file.name) || "Milho";
    for (const row of rows) {
      const mapped = mapImportedRow(target.type, row, { crop });
      if (!isMeaningfulImportedRecord(target.type, mapped)) continue;
      await addRecord(target.collection, mapped);
      importedCount += 1;
    }
  }
  alert(`${importedCount} registro(s) importado(s).`);
}

document.getElementById("export-view").addEventListener("click", () => {
  const view = activeViewName();
  downloadText(`central-safras-${view}-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(currentViewExportRows()));
});

document.getElementById("director-report").addEventListener("click", downloadDirectorReport);

document.getElementById("import-data").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    await importSpreadsheetFile(file);
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
