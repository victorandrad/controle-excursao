import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Excursao, Inscricao, Parcela, Participante } from '../models';

export type FiltroParticipantes = 'todos' | 'sem-telefone' | 'sem-rg' | 'sem-ambos';

@Injectable({ providedIn: 'root' })
export class ListaPdfService {
  /**
   * Gera e baixa um PDF com a lista de passageiros (pessoas + assentos),
   * ordenada por número de assento (sem assento por último).
   */
  gerarListaPassageiros(excursao: Excursao, inscricoes: Inscricao[]): void {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;

    const ordenadas = [...inscricoes]
      .filter((i) => i.status !== 'cancelada')
      .sort((a, b) => {
        const sa = a.numeroAssento;
        const sb = b.numeroAssento;
        if (sa != null && sb != null) return sa - sb;
        if (sa != null) return -1;
        if (sb != null) return 1;
        return (a.participante?.nome ?? '').localeCompare(
          b.participante?.nome ?? '',
          'pt-BR',
        );
      });

    // ── Cabeçalho ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Lista de Passageiros', margin, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(excursao.nome, margin, 68);

    const veiculo = excursao.tipoVeiculo === 'van' ? 'Van' : 'Ônibus';
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text(
      `${excursao.destino}   ·   Ida: ${this.formatarData(excursao.dataIda)}` +
        `   ·   ${veiculo} (${excursao.totalAssentos} assentos)`,
      margin,
      84,
    );
    doc.setTextColor(0);

    // ── Tabela ──
    const body = ordenadas.map((i) => [
      i.numeroAssento != null ? String(i.numeroAssento) : '—',
      i.participante?.nome ?? '—',
      i.participante?.cpf || '—',
      i.participante?.rg || '—',
      i.participante?.telefone || '—',
      this.formatarParcelas(i.parcelas),
    ]);

    let finalY = 100;
    autoTable(doc, {
      startY: 100,
      margin: { left: margin, right: margin },
      head: [['Assento', 'Nome', 'CPF', 'RG', 'Telefone', 'Parcelas']],
      body,
      styles: { fontSize: 8.5, cellPadding: 4, valign: 'middle' },
      headStyles: { fillColor: [24, 144, 255], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 50 },
        2: { cellWidth: 65 },
        3: { cellWidth: 65 },
        4: { cellWidth: 78 },
        5: { halign: 'center', cellWidth: 82 },
      },
      didDrawPage: (d) => {
        if (d.cursor) finalY = d.cursor.y;
      },
    });

    // ── Rodapé / totais ──
    const comAssento = ordenadas.filter((i) => i.numeroAssento != null).length;
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text(
      `Inscritos: ${ordenadas.length}   ·   Com assento: ${comAssento}` +
        `   ·   Sem assento: ${ordenadas.length - comAssento}`,
      margin,
      finalY + 22,
    );
    doc.text(`Gerado em ${this.formatarDataHora(new Date())}`, margin, finalY + 36);

    doc.save(`passageiros-${this.slug(excursao.nome)}.pdf`);
  }

  /**
   * Gera e baixa um PDF com o mapa de assentos do veículo, mostrando o nome
   * do ocupante em cada assento.
   */
  gerarMapaAssentos(excursao: Excursao, inscricoes: Inscricao[]): void {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 40;

    // ── Cabeçalho ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Mapa de Assentos', margin, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(excursao.nome, margin, 68);

    const veiculo = excursao.tipoVeiculo === 'van' ? 'Van' : 'Ônibus';
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text(
      `${excursao.destino}   ·   Ida: ${this.formatarData(excursao.dataIda)}` +
        `   ·   ${veiculo} (${excursao.totalAssentos} assentos)`,
      margin,
      84,
    );
    doc.setTextColor(0);

    // Layout do veículo
    const porFileira = excursao.tipoVeiculo === 'van' ? 3 : 4;
    const esqCount = excursao.tipoVeiculo === 'van' ? 1 : 2;
    const dirCount = porFileira - esqCount;

    // Monta fileiras (mesma lógica do frontend)
    const fileiras: { esquerda: number[]; direita: number[] }[] = [];
    let n = 1;
    while (n <= excursao.totalAssentos) {
      const f = { esquerda: [] as number[], direita: [] as number[] };
      for (let i = 0; i < porFileira && n <= excursao.totalAssentos; i++) {
        if (i < esqCount) f.esquerda.push(n);
        else f.direita.push(n);
        n++;
      }
      fileiras.push(f);
    }

    // Mapa assento → nome do ocupante
    const ocupados = new Map<number, string>();
    for (const i of inscricoes.filter((x) => x.status !== 'cancelada')) {
      if (i.numeroAssento != null) {
        ocupados.set(i.numeroAssento, i.participante?.nome ?? '');
      }
    }

    // Dimensões do desenho
    const seatW = 60;
    const seatH = 32;
    const seatGap = 6;
    const corredor = 24;
    const rowGap = 6;
    const groupW = (count: number) =>
      count * seatW + Math.max(0, count - 1) * seatGap;
    const linhaW = groupW(esqCount) + corredor + groupW(dirCount);
    const xStart = (pageWidth - linhaW) / 2;

    // Indicador "FRENTE"
    const yMapaStart = 108;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('FRENTE', pageWidth / 2, yMapaStart - 2, { align: 'center' });
    doc.setTextColor(0);

    // Desenhar fileiras
    let y = yMapaStart + 4;
    for (const f of fileiras) {
      // Quebra de página se a fileira não couber
      if (y + seatH > pageHeight - 70) {
        doc.addPage();
        y = 50;
      }
      let x = xStart;
      for (const num of f.esquerda) {
        this.desenharAssento(doc, x, y, seatW, seatH, num, ocupados.get(num) ?? null);
        x += seatW + seatGap;
      }
      x += corredor - seatGap; // ajusta corredor (loop deixou +seatGap a mais)
      for (const num of f.direita) {
        this.desenharAssento(doc, x, y, seatW, seatH, num, ocupados.get(num) ?? null);
        x += seatW + seatGap;
      }
      y += seatH + rowGap;
    }

    // Rodapé
    const preenchidos = ocupados.size;
    doc.setFontSize(9);
    doc.setTextColor(130);
    const yRodape = Math.min(y + 16, pageHeight - 40);
    doc.text(
      `Ocupados: ${preenchidos} / ${excursao.totalAssentos}` +
        `   ·   Gerado em ${this.formatarDataHora(new Date())}`,
      margin,
      yRodape,
    );
    doc.setTextColor(0);

    doc.save(`mapa-${this.slug(excursao.nome)}.pdf`);
  }

  /** Desenha um assento (caixa) com número e nome do ocupante (se houver). */
  private desenharAssento(
    doc: jsPDF,
    x: number,
    y: number,
    w: number,
    h: number,
    num: number,
    nome: string | null,
  ) {
    if (nome) {
      doc.setFillColor(230, 247, 255);
      doc.setDrawColor(24, 144, 255);
    } else {
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(210);
    }
    doc.setLineWidth(0.5);
    doc.rect(x, y, w, h, 'FD');

    // Número (canto sup. esquerdo)
    doc.setFontSize(7);
    doc.setTextColor(nome ? 80 : 160);
    doc.text(String(num), x + 4, y + 9);

    if (nome) {
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      const lines = (doc.splitTextToSize(nome, w - 6) as string[]).slice(0, 2);
      const lineH = 9;
      const totalH = lines.length * lineH;
      const startY = y + (h - totalH) / 2 + lineH * 0.75;
      for (let i = 0; i < lines.length; i++) {
        doc.text(lines[i], x + w / 2, startY + i * lineH, { align: 'center' });
      }
    }

    doc.setTextColor(0);
    doc.setDrawColor(0);
    doc.setFillColor(255, 255, 255);
  }

  /**
   * Gera e baixa um PDF com a lista de participantes (cadastros),
   * respeitando um filtro opcional (todos / sem telefone / sem RG / sem ambos).
   */
  gerarListaParticipantes(
    participantes: Participante[],
    filtro: FiltroParticipantes = 'todos',
  ): void {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;

    const ordenados = [...participantes].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    );

    // ── Cabeçalho ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Lista de Participantes', margin, 48);

    const descricao = this.descricaoFiltroParticipantes(filtro);
    let startY = 80;
    if (descricao) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(130);
      doc.text(descricao, margin, 68);
      doc.setTextColor(0);
    } else {
      startY = 64;
    }

    // ── Tabela ──
    const body = ordenados.map((p) => [
      p.nome,
      p.cpf || '—',
      p.rg || '—',
      p.telefone || '—',
    ]);

    let finalY = startY;
    autoTable(doc, {
      startY,
      margin: { left: margin, right: margin },
      head: [['Nome', 'CPF', 'RG', 'Telefone']],
      body,
      styles: { fontSize: 9, cellPadding: 5, valign: 'middle' },
      headStyles: { fillColor: [24, 144, 255], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        1: { cellWidth: 95 },
        2: { cellWidth: 85 },
        3: { cellWidth: 105 },
      },
      didDrawPage: (d) => {
        if (d.cursor) finalY = d.cursor.y;
      },
    });

    // ── Rodapé ──
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text(`Total: ${ordenados.length}`, margin, finalY + 22);
    doc.text(`Gerado em ${this.formatarDataHora(new Date())}`, margin, finalY + 36);

    const sufixo = filtro === 'todos' ? '' : `-${filtro}`;
    doc.save(`participantes${sufixo}.pdf`);
  }

  private descricaoFiltroParticipantes(filtro: FiltroParticipantes): string {
    switch (filtro) {
      case 'sem-telefone':
        return 'Filtro: cadastros sem telefone';
      case 'sem-rg':
        return 'Filtro: cadastros sem RG';
      case 'sem-ambos':
        return 'Filtro: cadastros sem telefone e sem RG';
      default:
        return '';
    }
  }

  /**
   * Formata o estado das parcelas:
   *  - todas pagas → "Quitado"
   *  - nenhuma paga → "— (0/N)"
   *  - algumas pagas → "1, 3 (2/N)" (lista os números pagos)
   */
  private formatarParcelas(parcelas: Parcela[] | undefined): string {
    const lista = (parcelas ?? []).slice().sort((a, b) => a.numero - b.numero);
    const total = lista.length;
    if (total === 0) return '—';
    const pagas = lista.filter((p) => p.status === 'paga').map((p) => p.numero);
    if (pagas.length === total) return 'Quitado';
    if (pagas.length === 0) return `— (0/${total})`;
    return `${pagas.join(', ')} (${pagas.length}/${total})`;
  }

  /** ISO (yyyy-mm-dd...) -> dd/mm/yyyy, sem deslocamento de fuso. */
  private formatarData(iso: string): string {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  private formatarDataHora(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return (
      `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ` +
      `${p(d.getHours())}:${p(d.getMinutes())}`
    );
  }

  private slug(s: string): string {
    return s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
