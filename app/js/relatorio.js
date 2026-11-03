import { GRUPO, dataBR, nomeMes, moeda, carregarScript, compartilharArquivo, lerArquivo } from "./ui.js";

const JSPDF = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const AUTOTABLE = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
const VERMELHO = [193, 39, 45];

async function logoDataURL() {
  try { return await lerArquivo(await (await fetch("assets/logo.jpg")).blob()); } catch { return null; }
}

export async function gerarRelatorio({ db, mes, lancamentos, resumos, anexar, autor }) {
  await carregarScript(JSPDF);
  await carregarScript(AUTOTABLE);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const L = pdf.internal.pageSize.getWidth(), A = pdf.internal.pageSize.getHeight(), M = 14;

  // Totais
  const ent = lancamentos.filter((l) => l.tipo === "entrada");
  const sai = lancamentos.filter((l) => l.tipo === "saida");
  const soma = (arr) => arr.reduce((s, l) => s + l.valor, 0);
  const totEnt = soma(ent), totSai = soma(sai);
  const anterior = Object.entries(resumos).reduce((s, [id, r]) => (id < mes ? s + (r.entradas || 0) - (r.saidas || 0) : s), 0);
  const final = anterior + totEnt - totSai;

  // Cabeçalho
  const logo = await logoDataURL();
  if (logo) pdf.addImage(logo, "JPEG", M, 10, 24, 24);
  pdf.setFont("helvetica", "bold").setFontSize(16).setTextColor(20);
  pdf.text(GRUPO, M + 30, 19);
  pdf.setFont("helvetica", "normal").setFontSize(12).setTextColor(90);
  pdf.text(`Relatório financeiro - ${nomeMes(mes)}`, M + 30, 26);
  pdf.setFontSize(9);
  pdf.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} por ${autor}`, M + 30, 31);
  pdf.setDrawColor(...VERMELHO).setLineWidth(0.8).line(M, 38, L - M, 38);

  // Resumo
  pdf.autoTable({
    startY: 44, theme: "plain", margin: { left: M, right: M },
    styles: { fontSize: 11, cellPadding: 2.2 },
    columnStyles: { 0: { cellWidth: 70 }, 1: { halign: "right", fontStyle: "bold" } },
    body: [
      ["Saldo anterior", moeda(anterior)],
      ["(+) Entradas do mês", moeda(totEnt)],
      ["(-) Saídas do mês", moeda(totSai)],
      ["Saldo do mês", moeda(totEnt - totSai)],
      ["Saldo em caixa", moeda(final)]
    ],
    didParseCell: (d) => {
      if (d.row.index === 4) { d.cell.styles.fillColor = [251, 234, 234]; d.cell.styles.textColor = VERMELHO; d.cell.styles.fontStyle = "bold"; }
    }
  });

  const tabela = (titulo, itens, cor) => {
    let y = pdf.lastAutoTable.finalY + 10;
    if (y > A - 40) { pdf.addPage(); y = 20; }
    pdf.setFont("helvetica", "bold").setFontSize(12).setTextColor(20).text(titulo, M, y);
    pdf.autoTable({
      startY: y + 3, margin: { left: M, right: M },
      head: [["Data", "Descrição", "Categoria", "Comp.", "Valor"]],
      body: itens.length
        ? itens.slice().sort((a, b) => a.data.localeCompare(b.data)).map((l) => [dataBR(l.data), l.descricao || "-", l.categoria, l.temComprovante ? "Sim" : "-", moeda(l.valor)])
        : [["", "Nenhum lançamento", "", "", ""]],
      foot: [["", "", "", "Total", moeda(soma(itens))]],
      headStyles: { fillColor: cor }, footStyles: { fillColor: [240, 240, 240], textColor: 20 },
      styles: { fontSize: 9.5 },
      columnStyles: { 0: { cellWidth: 22 }, 3: { cellWidth: 16, halign: "center" }, 4: { cellWidth: 30, halign: "right" } }
    });
  };
  tabela("Entradas", ent, [46, 125, 79]);
  tabela("Saídas", sai, VERMELHO);

  // Anexos: fotos dos comprovantes
  if (anexar) {
    const comFoto = lancamentos.filter((l) => l.temComprovante && l.comprovanteNome?.endsWith(".jpg")).sort((a, b) => a.data.localeCompare(b.data));
    for (const l of comFoto) {
      if (!l.comprovantePath) continue;
      let img;
      try { img = await lerArquivo(await db.baixarComprovante(l.comprovantePath)); } catch { continue; }
      const dim = await new Promise((ok) => { const i = new Image(); i.onload = () => ok([i.width, i.height]); i.onerror = () => ok(null); i.src = img; });
      if (!dim) continue;
      pdf.addPage();
      pdf.setFont("helvetica", "bold").setFontSize(11).setTextColor(20);
      pdf.text(`Comprovante - ${dataBR(l.data)} - ${l.descricao || l.categoria} - ${moeda(l.valor)}`, M, 16, { maxWidth: L - 2 * M });
      const maxL = L - 2 * M, maxA = A - 40, esc = Math.min(maxL / dim[0], maxA / dim[1]);
      pdf.addImage(img, "JPEG", M, 24, dim[0] * esc, dim[1] * esc);
    }
  }

  // Rodapé com paginação
  const n = pdf.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(130);
    pdf.text(`${GRUPO} - Página ${p} de ${n}`, L / 2, A - 8, { align: "center" });
  }

  const nome = `Relatorio-${mes}.pdf`;
  await compartilharArquivo(pdf.output("blob"), nome,
    `Relatório financeiro de ${nomeMes(mes)} – ${GRUPO}\nEntradas: ${moeda(totEnt)} | Saídas: ${moeda(totSai)} | Saldo em caixa: ${moeda(final)}`);
}

/* ================= Relatório de estudos =================
   grupos: [{ livro, registros (ordem cronológica) }]  de/ate: "AAAA-MM-DD" ou "" */
export async function gerarRelatorioEstudos({ grupos, de, ate, presentes, autor }) {
  await carregarScript(JSPDF);
  await carregarScript(AUTOTABLE);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const L = pdf.internal.pageSize.getWidth(), A = pdf.internal.pageSize.getHeight(), M = 14;
  const total = grupos.reduce((s, g) => s + g.registros.length, 0);
  const datas = grupos.flatMap((g) => g.registros.map((r) => r.data)).sort();
  const periodo = `${dataBR(de || datas[0])} a ${dataBR(ate && ate < datas[datas.length - 1] ? ate : datas[datas.length - 1])}`;
  const umLivro = grupos.length === 1 ? grupos[0].livro : null;

  // Cabeçalho
  const logo = await logoDataURL();
  if (logo) pdf.addImage(logo, "JPEG", M, 10, 24, 24);
  pdf.setFont("helvetica", "bold").setFontSize(16).setTextColor(20);
  pdf.text(GRUPO, M + 30, 18);
  pdf.setFont("helvetica", "normal").setFontSize(12).setTextColor(90);
  pdf.text(umLivro ? "Relatório de estudo" : "Relatório de estudos", M + 30, 25);
  pdf.setFontSize(9);
  pdf.text(`Período: ${periodo}  ·  ${total} encontro(s)${umLivro ? "" : ` · ${grupos.length} livro(s)`}`, M + 30, 30);
  pdf.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} por ${autor}`, M + 30, 34.5);
  pdf.setDrawColor(...VERMELHO).setLineWidth(0.8).line(M, 39, L - M, 39);

  let y = 47;
  for (const { livro, registros } of grupos) {
    if (y > A - 50) { pdf.addPage(); y = 20; }
    pdf.setFont("helvetica", "bold").setFontSize(13).setTextColor(...VERMELHO);
    const titulo = pdf.splitTextToSize(livro.titulo, L - 2 * M);
    pdf.text(titulo, M, y);
    y += titulo.length * 5.5;
    pdf.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(90);
    const sub = [livro.autor, `${registros.length} encontro(s)`, livro.concluido ? "Estudo concluído" : "Em estudo"].filter(Boolean).join("  ·  ");
    pdf.text(sub, M, y);
    y += 3;

    const cab = ["Data", "Capítulos", "Resumo"];
    if (presentes) cab.push("Presentes");
    pdf.autoTable({
      startY: y, margin: { left: M, right: M },
      head: [cab],
      body: registros.map((r) => {
        const linha = [dataBR(r.data), r.capitulos || "-", r.resumo];
        if (presentes) linha.push((r.presentesNomes || []).join(", ") || "-");
        return linha;
      }),
      headStyles: { fillColor: [40, 40, 40] },
      styles: { fontSize: 9, cellPadding: 2.2, valign: "top", overflow: "linebreak" },
      columnStyles: { 0: { cellWidth: 21 }, 1: { cellWidth: 28 }, ...(presentes ? { 3: { cellWidth: 34, fontSize: 8, textColor: 90 } } : {}) },
      alternateRowStyles: { fillColor: [250, 246, 246] }
    });
    y = pdf.lastAutoTable.finalY + 12;
  }

  // Rodapé com paginação
  const n = pdf.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(130);
    pdf.text(`${GRUPO} - Página ${p} de ${n}`, L / 2, A - 8, { align: "center" });
  }

  const slug = (umLivro ? umLivro.titulo : "geral").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  await compartilharArquivo(pdf.output("blob"), `Estudos-${slug}.pdf`,
    `📚 Relatório de estudos${umLivro ? ` – ${umLivro.titulo}` : ""}\nPeríodo: ${periodo} · ${total} encontro(s)\n${GRUPO}`);
}
