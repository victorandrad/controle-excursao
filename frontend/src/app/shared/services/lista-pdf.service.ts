import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Excursao, Inscricao } from '../models';

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
      i.participante?.telefone || i.participante?.cpf || '—',
      i.quitado ? 'Quitado' : 'Pendente',
    ]);

    let finalY = 100;
    autoTable(doc, {
      startY: 100,
      margin: { left: margin, right: margin },
      head: [['Assento', 'Nome', 'Contato', 'Pagamento']],
      body,
      styles: { fontSize: 9, cellPadding: 5, valign: 'middle' },
      headStyles: { fillColor: [24, 144, 255], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 60 },
        3: { halign: 'center', cellWidth: 80 },
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
