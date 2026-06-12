import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs";
const outputPath = `${outputDir}/Central_de_Safras_Excel.xlsx`;
const maxRows = 501;
const inputRows = maxRows - 4;
const freteColheitaRows = 248;
const freteFaturamentoRows = inputRows - freteColheitaRows;

const green = "#1f7a4d";
const dark = "#10251b";
const light = "#edf4ef";
const line = "#d8ded9";
const warn = "#fff4d6";
const danger = "#fde8e8";

const workbook = Workbook.create();

function addSheet(name) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  return sheet;
}

function col(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}

function setTitle(sheet, title, subtitle, lastCol) {
  sheet.getRange(`A1:${lastCol}1`).merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange(`A2:${lastCol}2`).merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A1:${lastCol}2`).format = {
    fill: dark,
    font: { color: "#ffffff", bold: true },
  };
  sheet.getRange("A1").format.font = { color: "#ffffff", bold: true, size: 18 };
  sheet.getRange("A2").format.font = { color: "#d8e5de", bold: false, size: 11 };
}

function writeTable(sheet, startRow, headers, rows, tableName) {
  const lastCol = col(headers.length);
  const start = startRow;
  sheet.getRange(`A${start}:${lastCol}${start}`).values = [headers];
  if (rows.length) {
    sheet.getRange(`A${start + 1}:${lastCol}${start + rows.length}`).values = rows;
  }
  const tableRange = `A${start}:${lastCol}${start + Math.max(rows.length, 1)}`;
  const table = sheet.tables.add(tableRange, true, tableName);
  table.style = "TableStyleMedium4";
  table.showFilterButton = true;
  sheet.getRange(`A${start}:${lastCol}${start}`).format = {
    fill: green,
    font: { color: "#ffffff", bold: true },
  };
  sheet.freezePanes.freezeRows(start);
  sheet.getRange(`A:${lastCol}`).format.autofitColumns();
  return table;
}

function addRows(sheet, startRow, headers, formulaByCol = {}, validations = {}, widths = {}) {
  const rows = Array.from({ length: inputRows }, () => headers.map(() => ""));
  writeTable(sheet, startRow, headers, rows, `${sheet.name.replace(/[^A-Za-z0-9]/g, "")}Tabela`);
  Object.entries(formulaByCol).forEach(([letter, formulaFn]) => {
    const formulas = Array.from({ length: inputRows }, (_, i) => [formulaFn(startRow + 1 + i)]);
    sheet.getRange(`${letter}${startRow + 1}:${letter}${startRow + inputRows}`).formulas = formulas;
  });
  Object.entries(validations).forEach(([range, values]) => {
    sheet.getRange(range).dataValidation = { rule: { type: "list", values } };
  });
  Object.entries(widths).forEach(([letter, width]) => {
    sheet.getRange(`${letter}:${letter}`).format.columnWidthPx = width;
  });
  sheet.getRange(`${col(1)}${startRow}:${col(headers.length)}${startRow + inputRows}`).format.borders = { preset: "all", style: "thin", color: line };
}

function moneyFmt(sheet, range) {
  sheet.getRange(range).format.numberFormat = "R$ #,##0.00";
}

function numFmt(sheet, range, fmt = "#,##0.00") {
  sheet.getRange(range).format.numberFormat = fmt;
}

function dateFmt(sheet, range) {
  sheet.getRange(range).format.numberFormat = "dd/mm/yyyy";
}

function percentFmt(sheet, range) {
  sheet.getRange(range).format.numberFormat = "0.00%";
}

const painel = addSheet("Painel");
const recebimentos = addSheet("Recebimentos");
const contratos = addSheet("Contratos");
const faturamento = addSheet("Faturamento");
const colheita = addSheet("Colheita");
const retorno = addSheet("Retorno");
const fretes = addSheet("Fretes");
const safras = addSheet("Safras");
const resumo = addSheet("Resumo Safra");
const pendencias = addSheet("Pendencias");
const auditoria = addSheet("Auditoria");
const listas = addSheet("Listas");

listas.getRange("A1:D1").values = [["Culturas", "Status Sim/Nao", "Status Operacional", "Origem Frete"]];
listas.getRange("A2:A5").values = [["Milho"], ["Trigo"], ["Soja"], ["Aveia"]];
listas.getRange("B2:B3").values = [["Sim"], ["Nao"]];
listas.getRange("C2:C5").values = [["Em andamento"], ["Colheita finalizada"], ["Faturamento em andamento"], ["Safra encerrada"]];
listas.getRange("D2:D3").values = [["Colheita"], ["Faturamento"]];
listas.getRange("A1:D5").format = { borders: { preset: "all", style: "thin", color: line } };
listas.getRange("A1:D1").format = { fill: green, font: { color: "#ffffff", bold: true } };

setTitle(colheita, "Colheita", "Registre cargas, descontos, destino/cooperativa e frete previsto.", "Q");
addRows(colheita, 4, [
  "Data", "Safra", "Cultura", "Unidade", "Transportador", "Nota Fiscal", "Destino/Cooperativa",
  "Bruto kg", "Impureza kg", "Impureza %", "Umidade kg", "Umidade %", "Total Descontado kg",
  "Total Liquido kg", "Frete R$/t", "Valor Frete R$", "Observacoes"
], {
  J: (r) => `=IF($H${r}="","",$I${r}/$H${r})`,
  L: (r) => `=IF($H${r}="","",$K${r}/$H${r})`,
  M: (r) => `=IF($H${r}="","",$I${r}+$K${r})`,
  N: (r) => `=IF($H${r}="","",$H${r}-$M${r})`,
  P: (r) => `=IF($N${r}="","",$N${r}/1000*$O${r})`,
}, {
  "C5:C501": ["Milho", "Trigo", "Soja", "Aveia"],
  "D5:D501": ["Quilogramas"],
}, { A: 95, B: 95, C: 95, E: 140, G: 170, Q: 190 });
dateFmt(colheita, "A5:A501");
numFmt(colheita, "H5:I501");
percentFmt(colheita, "J5:J501");
numFmt(colheita, "K5:K501");
percentFmt(colheita, "L5:L501");
numFmt(colheita, "M5:N501");
moneyFmt(colheita, "O5:P501");

setTitle(faturamento, "Faturamento", "Notas, contratos, FUNRURAL, NF liquida, frete e conferencia de peso.", "W");
addRows(faturamento, 4, [
  "Data", "NFP", "NFE", "Contrato", "Cultura", "Safra", "Local Saida", "Cliente", "Transportador",
  "Peso Saida kg", "Sacas", "Valor/kg", "Total", "Aliq FUNRURAL", "FUNRURAL", "NF Liquida",
  "Recebimento", "Frete R$/t", "Total Frete", "CT-e", "Peso Descarga Porto", "Diferenca Peso", "Observacoes"
], {
  K: (r) => `=IF($J${r}="","",$J${r}/60)`,
  M: (r) => `=IF($J${r}="","",$J${r}*$L${r})`,
  O: (r) => `=IF($M${r}="","",$M${r}*$N${r})`,
  P: (r) => `=IF($M${r}="","",$M${r}-$O${r})`,
  S: (r) => `=IF($J${r}="","",$J${r}/1000*$R${r})`,
  V: (r) => `=IF($J${r}="","",$J${r}-$U${r})`,
}, {
  "E5:E501": ["Milho", "Trigo", "Soja", "Aveia"],
}, { A: 95, D: 105, H: 150, I: 140, W: 190 });
dateFmt(faturamento, "A5:A501");
dateFmt(faturamento, "Q5:Q501");
numFmt(faturamento, "J5:K501");
moneyFmt(faturamento, "L5:M501");
percentFmt(faturamento, "N5:N501");
moneyFmt(faturamento, "O5:P501");
moneyFmt(faturamento, "R5:S501");
numFmt(faturamento, "U5:V501");

setTitle(contratos, "Contratos", "Cadastro de contratos, custos, status automatico e margem liquida.", "AD");
addRows(contratos, 4, [
  "Cliente", "Contrato", "Cultura", "Safra", "Entrega a partir", "Prazo final entrega", "Corretora",
  "KG", "SC", "R$/KG", "Bruto", "FUNRURAL %", "FUNRURAL R$", "Valor Liquido", "Prazo pgto",
  "Comissao %", "Comissao R$", "Royalties %", "Royalties R$", "Total Liquido", "Fechado?",
  "KG Faturado", "Saldo KG", "Recebido R$", "Saldo Receber", "Status", "Margem Liquida", "Margem/kg",
  "Observacoes", "Alerta"
], {
  I: (r) => `=IF($H${r}="","",$H${r}/60)`,
  K: (r) => `=IF($H${r}="","",$H${r}*$J${r})`,
  M: (r) => `=IF($K${r}="","",$K${r}*$L${r})`,
  N: (r) => `=IF($K${r}="","",$K${r}-$M${r})`,
  Q: (r) => `=IF($K${r}="","",$K${r}*$P${r})`,
  S: (r) => `=IF($K${r}="","",$K${r}*$R${r})`,
  T: (r) => `=IF($N${r}="","",$N${r}-$Q${r}-$S${r})`,
  V: (r) => `=IF($B${r}="","",SUMIFS(Faturamento!$J$5:$J$501,Faturamento!$D$5:$D$501,$B${r}))`,
  W: (r) => `=IF($B${r}="","",$H${r}-$V${r})`,
  X: (r) => `=IF($B${r}="","",SUMIFS(Recebimentos!$K$5:$K$501,Recebimentos!$B$5:$B$501,$B${r})+SUMIFS(Recebimentos!$M$5:$M$501,Recebimentos!$B$5:$B$501,$B${r}))`,
  Y: (r) => `=IF($B${r}="","",MAX($T${r}-$X${r},0))`,
  Z: (r) => `=IF($B${r}="","",IF($U${r}="Sim","Fechado",IF($Y${r}=0,"Recebido",IF($X${r}>0,"Recebido parcial",IF($V${r}=0,"Aberto",IF($W${r}>0,"Parcial",IF($W${r}<0,"Faturado + excedente","Faturado")))))))`,
  AA: (r) => `=IF($B${r}="","",SUMIFS(Faturamento!$P$5:$P$501,Faturamento!$D$5:$D$501,$B${r})-SUMIFS(Faturamento!$S$5:$S$501,Faturamento!$D$5:$D$501,$B${r})-$Q${r}-$S${r})`,
  AB: (r) => `=IF($V${r}=0,"",$AA${r}/$V${r})`,
  AD: (r) => `=IF($B${r}="","",IF($W${r}<0,"Excedente de "&TEXT(ABS($W${r}),"#,##0")&" kg",""))`,
}, {
  "C5:C501": ["Milho", "Trigo", "Soja", "Aveia"],
  "U5:U501": ["Sim", "Nao"],
}, { A: 150, B: 105, G: 140, Z: 145, AD: 180 });
dateFmt(contratos, "E5:F501");
dateFmt(contratos, "O5:O501");
numFmt(contratos, "H5:I501");
moneyFmt(contratos, "J5:K501");
percentFmt(contratos, "L5:L501");
moneyFmt(contratos, "M5:N501");
percentFmt(contratos, "P5:P501");
moneyFmt(contratos, "Q5:Q501");
percentFmt(contratos, "R5:R501");
moneyFmt(contratos, "S5:T501");
moneyFmt(contratos, "X5:Y501");
moneyFmt(contratos, "AA5:AB501");

setTitle(recebimentos, "Recebimentos", "Conta corrente calculada a partir dos contratos. Preencha datas e valores recebidos aqui.", "O");
addRows(recebimentos, 4, [
  "Cliente", "Contrato", "Cultura", "Safra", "Prazo pgto", "KG", "SC", "Liq Contrato", "Liq Final",
  "Data Rec 1", "1 R$", "Data Rec 2", "2 R$", "Saldo", "Pago?"
], {
  A: (r) => `=IF(Contratos!$B${r}="","",Contratos!$A${r})`,
  B: (r) => `=IF(Contratos!$B${r}="","",Contratos!$B${r})`,
  C: (r) => `=IF(Contratos!$B${r}="","",Contratos!$C${r})`,
  D: (r) => `=IF(Contratos!$B${r}="","",Contratos!$D${r})`,
  E: (r) => `=IF(Contratos!$B${r}="","",Contratos!$O${r})`,
  F: (r) => `=IF(Contratos!$B${r}="","",Contratos!$H${r})`,
  G: (r) => `=IF(Contratos!$B${r}="","",Contratos!$I${r})`,
  H: (r) => `=IF(Contratos!$B${r}="","",Contratos!$N${r})`,
  I: (r) => `=IF(Contratos!$B${r}="","",Contratos!$T${r})`,
  N: (r) => `=IF($B${r}="","",MAX($I${r}-$K${r}-$M${r},0))`,
  O: (r) => `=IF($B${r}="","",IF($N${r}=0,"Sim","Nao"))`,
}, {
  "O5:O501": ["Sim", "Nao"],
}, { A: 150, B: 105 });
dateFmt(recebimentos, "E5:E501");
dateFmt(recebimentos, "J5:J501");
dateFmt(recebimentos, "L5:L501");
moneyFmt(recebimentos, "H5:I501");
moneyFmt(recebimentos, "K5:K501");
moneyFmt(recebimentos, "M5:N501");

setTitle(retorno, "Retorno", "Conta corrente de retorno de armazenagem por cultura, safra e empresa.", "I");
addRows(retorno, 4, ["Data", "NFE", "NFP", "Empresa", "Peso kg", "SC", "Cultura", "Safra", "Contrato"], {
  F: (r) => `=IF($E${r}="","",$E${r}/60)`,
}, { "G5:G501": ["Milho", "Trigo", "Soja", "Aveia"] }, { D: 160 });
dateFmt(retorno, "A5:A501");
numFmt(retorno, "E5:F501");

setTitle(safras, "Safras", "Cadastre cultura, ano de vigencia, hectares e status operacional.", "G");
addRows(safras, 4, ["Cultura", "Safra", "Hectares", "Status", "Colhido kg", "SC/ha", "Observacoes"], {
  E: (r) => `=IF($A${r}="","",SUMIFS(Colheita!$N$5:$N$501,Colheita!$C$5:$C$501,$A${r},Colheita!$B$5:$B$501,$B${r}))`,
  F: (r) => `=IF($C${r}=0,"",$E${r}/60/$C${r})`,
}, { "A5:A501": ["Milho", "Trigo", "Soja", "Aveia"], "D5:D501": ["Em andamento", "Colheita finalizada", "Faturamento em andamento", "Safra encerrada"] }, { A: 100, B: 110, D: 170 });
numFmt(safras, "C5:F501");

setTitle(fretes, "Fretes", "Visao automatica dos fretes de colheita e faturamento. Preencha pagamentos nas colunas de baixa.", "N");
const freteHeaders = ["Data", "Cooperativa/Cliente", "NFE", "NFP", "Peso Liquido Efetivo", "SC", "Transportador", "Valor Total do Frete", "Data Pgto 1", "1 R$", "Data Pgto 2", "2 R$", "Saldo a Pagar Frete", "Frete Pago"];
writeTable(fretes, 4, freteHeaders, Array.from({ length: inputRows }, () => freteHeaders.map(() => "")), "FretesTabela");
for (let i = 0; i < freteColheitaRows; i++) {
  const r = 5 + i;
  const src = 5 + i;
  fretes.getRange(`A${r}:H${r}`).formulas = [[
    `=IF(Colheita!$A${src}="","",Colheita!$A${src})`,
    `=IF(Colheita!$G${src}="","",Colheita!$G${src})`,
    "",
    `=IF(Colheita!$F${src}="","",Colheita!$F${src})`,
    `=IF(Colheita!$N${src}="","",Colheita!$N${src})`,
    `=IF($E${r}="","",$E${r}/60)`,
    `=IF(Colheita!$E${src}="","",Colheita!$E${src})`,
    `=IF(Colheita!$P${src}="","",Colheita!$P${src})`,
  ]];
}
for (let i = 0; i < freteFaturamentoRows; i++) {
  const r = 5 + freteColheitaRows + i;
  const src = 5 + i;
  fretes.getRange(`A${r}:H${r}`).formulas = [[
    `=IF(Faturamento!$A${src}="","",Faturamento!$A${src})`,
    `=IF(Faturamento!$H${src}="","",Faturamento!$H${src})`,
    `=IF(Faturamento!$C${src}="","",Faturamento!$C${src})`,
    `=IF(Faturamento!$B${src}="","",Faturamento!$B${src})`,
    `=IF(Faturamento!$J${src}="","",Faturamento!$J${src})`,
    `=IF($E${r}="","",$E${r}/60)`,
    `=IF(Faturamento!$I${src}="","",Faturamento!$I${src})`,
    `=IF(Faturamento!$S${src}="","",Faturamento!$S${src})`,
  ]];
}
const freteSaldoFormulas = Array.from({ length: inputRows }, (_, i) => {
  const r = 5 + i;
  return [`=IF($H${r}="","",MAX($H${r}-$J${r}-$L${r},0))`, `=IF($H${r}="","",IF($M${r}=0,"Sim","Nao"))`];
});
fretes.getRange("M5:N501").formulas = freteSaldoFormulas;
dateFmt(fretes, "A5:A501");
dateFmt(fretes, "I5:I501");
dateFmt(fretes, "K5:K501");
numFmt(fretes, "E5:F501");
moneyFmt(fretes, "H5:H501");
moneyFmt(fretes, "J5:J501");
moneyFmt(fretes, "L5:M501");
fretes.getRange("A4:N501").format.borders = { preset: "all", style: "thin", color: line };

setTitle(resumo, "Resumo Safra", "Resumo consolidado por cultura e safra.", "J");
const resumoHeaders = ["Cultura", "Safra", "Colhido kg", "Retornado kg", "Contratado kg", "Faturado kg", "Recebido R$", "A Receber R$", "Frete R$", "Margem R$"];
const resumoRows = [];
for (const cultura of ["Milho", "Trigo", "Soja", "Aveia"]) {
  for (let y = 2025; y <= 2030; y++) resumoRows.push([cultura, `${y}/${y + 1}`, "", "", "", "", "", "", "", ""]);
}
writeTable(resumo, 4, resumoHeaders, resumoRows, "ResumoTabela");
for (let i = 0; i < resumoRows.length; i++) {
  const r = 5 + i;
  resumo.getRange(`C${r}:J${r}`).formulas = [[
    `=SUMIFS(Colheita!$N$5:$N$501,Colheita!$C$5:$C$501,$A${r},Colheita!$B$5:$B$501,$B${r})`,
    `=SUMIFS(Retorno!$E$5:$E$501,Retorno!$G$5:$G$501,$A${r},Retorno!$H$5:$H$501,$B${r})`,
    `=SUMIFS(Contratos!$H$5:$H$501,Contratos!$C$5:$C$501,$A${r},Contratos!$D$5:$D$501,$B${r})`,
    `=SUMIFS(Faturamento!$J$5:$J$501,Faturamento!$E$5:$E$501,$A${r},Faturamento!$F$5:$F$501,$B${r})`,
    `=SUMIFS(Recebimentos!$K$5:$K$501,Recebimentos!$C$5:$C$501,$A${r},Recebimentos!$D$5:$D$501,$B${r})+SUMIFS(Recebimentos!$M$5:$M$501,Recebimentos!$C$5:$C$501,$A${r},Recebimentos!$D$5:$D$501,$B${r})`,
    `=SUMIFS(Recebimentos!$N$5:$N$501,Recebimentos!$C$5:$C$501,$A${r},Recebimentos!$D$5:$D$501,$B${r})`,
    `=SUMIFS(Fretes!$H$5:$H$501,Fretes!$A$5:$A$501,">0")`,
    `=SUMIFS(Contratos!$AA$5:$AA$501,Contratos!$C$5:$C$501,$A${r},Contratos!$D$5:$D$501,$B${r})`,
  ]];
}
numFmt(resumo, "C5:F28");
moneyFmt(resumo, "G5:J28");

setTitle(pendencias, "Pendencias", "Alertas automáticos para fechamento e conferência operacional.", "F");
const pendHeaders = ["Tipo", "Quantidade", "Valor/Peso", "Observacao", "Prioridade", "Status"];
writeTable(pendencias, 4, pendHeaders, [
  ["Sem NFE", "", "", "Faturamentos sem NFE", "Alta", ""],
  ["Sem CT-e", "", "", "Faturamentos sem CT-e", "Media", ""],
  ["Frete aberto", "", "", "Saldo de fretes nao pagos", "Alta", ""],
  ["Recebimento vencido", "", "", "Contratos com prazo vencido", "Alta", ""],
  ["Contrato com excedente", "", "", "Faturado acima do contratado", "Media", ""],
], "PendenciasTabela");
pendencias.getRange("B5:C9").formulas = [
  [`=COUNTIFS(Faturamento!$A$5:$A$501,"<>",Faturamento!$C$5:$C$501,"")`, `=SUMIFS(Faturamento!$J$5:$J$501,Faturamento!$A$5:$A$501,"<>",Faturamento!$C$5:$C$501,"")`],
  [`=COUNTIFS(Faturamento!$A$5:$A$501,"<>",Faturamento!$T$5:$T$501,"")`, `=SUMIFS(Faturamento!$S$5:$S$501,Faturamento!$A$5:$A$501,"<>",Faturamento!$T$5:$T$501,"")`],
  [`=COUNTIF(Fretes!$N$5:$N$501,"Nao")`, `=SUM(Fretes!$M$5:$M$501)`],
  [`=COUNTIFS(Recebimentos!$O$5:$O$501,"Nao",Recebimentos!$E$5:$E$501,"<"&TODAY())`, `=SUMIFS(Recebimentos!$N$5:$N$501,Recebimentos!$O$5:$O$501,"Nao",Recebimentos!$E$5:$E$501,"<"&TODAY())`],
  [`=COUNTIF(Contratos!$W$5:$W$501,"<0")`, `=SUMIF(Contratos!$W$5:$W$501,"<0",Contratos!$W$5:$W$501)`],
];
pendencias.getRange("F5:F9").formulas = Array.from({ length: 5 }, (_, i) => [`=IF(B${5 + i}>0,"Revisar","OK")`]);
moneyFmt(pendencias, "C5:C9");

setTitle(auditoria, "Auditoria", "Registro manual ou importado de alteracoes relevantes.", "F");
addRows(auditoria, 4, ["Data", "Operador", "Acao", "Tela", "Registro", "Alteracoes"], {}, {}, { F: 260 });
dateFmt(auditoria, "A5:A501");

setTitle(painel, "Painel", "Visao executiva da safra, faturamento, margem e pendencias.", "L");
painel.getRange("A4:L8").values = [
  ["Total Colhido kg", "Estoque kg", "Faturado R$", "FUNRURAL R$", "NF Liquida R$", "Margem R$", "Frete R$", "A Receber R$", "Recebido R$", "Contratado kg", "Retornado kg", "Pendencias"],
  ["=SUM(Colheita!N5:N501)", "=B5", "=SUM(Faturamento!M5:M501)", "=SUM(Faturamento!O5:O501)", "=SUM(Faturamento!P5:P501)", "=SUM(Contratos!AA5:AA501)", "=SUM(Fretes!H5:H501)", "=SUM(Recebimentos!N5:N501)", "=SUM(Recebimentos!K5:K501)+SUM(Recebimentos!M5:M501)", "=SUM(Contratos!H5:H501)", "=SUM(Retorno!E5:E501)", "=SUM(Pendencias!B5:B9)"],
  ["", "", "", "", "", "", "", "", "", "", "", ""],
  ["Cultura", "Colhido kg", "Faturado kg", "Estoque kg", "Contratado kg", "Recebido R$", "A Receber R$", "Margem R$", "", "Cliente", "A Receber R$", "Recebido R$"],
  ["Milho", "=SUMIF(Colheita!C:C,A8,Colheita!N:N)", "=SUMIF(Faturamento!E:E,A8,Faturamento!J:J)", "=B8-C8", "=SUMIF(Contratos!C:C,A8,Contratos!H:H)", "=SUMIF(Recebimentos!C:C,A8,Recebimentos!K:K)+SUMIF(Recebimentos!C:C,A8,Recebimentos!M:M)", "=SUMIF(Recebimentos!C:C,A8,Recebimentos!N:N)", "=SUMIF(Contratos!C:C,A8,Contratos!AA:AA)", "", "", "", ""],
];
painel.getRange("A9:H11").values = [
  ["Trigo", "=SUMIF(Colheita!C:C,A9,Colheita!N:N)", "=SUMIF(Faturamento!E:E,A9,Faturamento!J:J)", "=B9-C9", "=SUMIF(Contratos!C:C,A9,Contratos!H:H)", "=SUMIF(Recebimentos!C:C,A9,Recebimentos!K:K)+SUMIF(Recebimentos!C:C,A9,Recebimentos!M:M)", "=SUMIF(Recebimentos!C:C,A9,Recebimentos!N:N)", "=SUMIF(Contratos!C:C,A9,Contratos!AA:AA)"],
  ["Soja", "=SUMIF(Colheita!C:C,A10,Colheita!N:N)", "=SUMIF(Faturamento!E:E,A10,Faturamento!J:J)", "=B10-C10", "=SUMIF(Contratos!C:C,A10,Contratos!H:H)", "=SUMIF(Recebimentos!C:C,A10,Recebimentos!K:K)+SUMIF(Recebimentos!C:C,A10,Recebimentos!M:M)", "=SUMIF(Recebimentos!C:C,A10,Recebimentos!N:N)", "=SUMIF(Contratos!C:C,A10,Contratos!AA:AA)"],
  ["Aveia", "=SUMIF(Colheita!C:C,A11,Colheita!N:N)", "=SUMIF(Faturamento!E:E,A11,Faturamento!J:J)", "=B11-C11", "=SUMIF(Contratos!C:C,A11,Contratos!H:H)", "=SUMIF(Recebimentos!C:C,A11,Recebimentos!K:K)+SUMIF(Recebimentos!C:C,A11,Recebimentos!M:M)", "=SUMIF(Recebimentos!C:C,A11,Recebimentos!N:N)", "=SUMIF(Contratos!C:C,A11,Contratos!AA:AA)"],
];
painel.getRange("A4:L4").format = { fill: green, font: { color: "#ffffff", bold: true } };
painel.getRange("A5:L5").format = { fill: light, font: { bold: true } };
painel.getRange("A7:L7").format = { fill: green, font: { color: "#ffffff", bold: true } };
painel.getRange("A4:L11").format.borders = { preset: "all", style: "thin", color: line };
numFmt(painel, "A5:B5");
moneyFmt(painel, "C5:I5");
numFmt(painel, "J5:K5");
numFmt(painel, "B8:E11");
moneyFmt(painel, "F8:H11");

const chart1 = painel.charts.add("bar", painel.getRange("A7:D11"));
chart1.title = "Colhido x Faturado x Estoque";
chart1.setPosition("A14", "F29");
const chart2 = painel.charts.add("doughnut", painel.getRange("A7:B11"));
chart2.title = "Colheita por Cultura";
chart2.setPosition("G14", "L29");

for (const sh of [painel, recebimentos, contratos, faturamento, colheita, retorno, fretes, safras, resumo, pendencias, auditoria, listas]) {
  sh.getUsedRange()?.format.autofitColumns();
  sh.getUsedRange()?.format.autofitRows();
}

contratos.getRange("W5:W501").conditionalFormats.add("cellIs", { operator: "lessThan", formula: 0, format: { fill: danger, font: { bold: true, color: "#b42318" } } });
contratos.getRange("Z5:Z501").conditionalFormats.add("containsText", { text: "excedente", format: { fill: warn, font: { bold: true, color: "#9a5b00" } } });
fretes.getRange("N5:N501").conditionalFormats.add("containsText", { text: "Nao", format: { fill: warn, font: { bold: true, color: "#9a5b00" } } });
recebimentos.getRange("N5:N501").conditionalFormats.add("cellIs", { operator: "greaterThan", formula: 0, format: { fill: warn, font: { bold: true, color: "#9a5b00" } } });
pendencias.getRange("F5:F9").conditionalFormats.add("containsText", { text: "Revisar", format: { fill: danger, font: { bold: true, color: "#b42318" } } });

await fs.mkdir(outputDir, { recursive: true });

const overview = await workbook.inspect({ kind: "sheet", include: "name", maxChars: 3000 });
console.log(overview.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errors.ndjson);
for (const sheetName of ["Painel", "Contratos", "Faturamento", "Colheita", "Recebimentos", "Fretes", "Pendencias"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/preview_${sheetName.replace(/\s+/g, "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(`saved:${outputPath}`);
