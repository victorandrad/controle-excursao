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
