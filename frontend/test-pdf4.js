import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';

const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
const pageW = doc.internal.pageSize.getWidth();

doc.setFillColor(255, 153, 51);
doc.rect(0, 0, pageW / 3, 3, 'F');
doc.setFillColor(245, 245, 245);
doc.rect(pageW / 3, 0, pageW / 3, 3, 'F');
doc.setFillColor(19, 136, 8);
doc.rect((pageW / 3) * 2, 0, pageW / 3, 3, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(18);
doc.setTextColor(30, 41, 59);
doc.text('NETGUARD BHARAT', 14, 14);

const rows = [
  ['2023-10-25 14:30:00', 'THREAT', 'BadApp.exe', '1.1.1.1', 'RU']
];

autoTable(doc, {
  startY: 39,
  head: [['Timestamp', 'Status', 'Source Process', 'Destination IP', 'Country']],
  body: rows,
  styles: {
    font: 'courier',
    fontSize: 7.5,
    cellPadding: 2.5,
    textColor: [30, 41, 59],
    lineColor: [203, 213, 225],
    lineWidth: 0.2,
  },
  headStyles: {
    fillColor: [15, 23, 42],
    textColor: [6, 182, 212],
    fontStyle: 'bold',
    halign: 'left',
    fontSize: 8,
  },
  alternateRowStyles: {
    fillColor: [241, 245, 249],
  },
  columnStyles: {
    0: { cellWidth: 52 },
    1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
    2: { cellWidth: 70 },
    3: { cellWidth: 52 },
    4: { cellWidth: 24, halign: 'center' },
  },
  didParseCell(data) {
    if (data.row.index >= 0 && rows[data.row.index]?.[1] === 'THREAT') {
      data.cell.styles.textColor = [220, 38, 38];
      if (data.column.index === 1) {
        data.cell.styles.fillColor  = [254, 242, 242];
        data.cell.styles.fontStyle  = 'bold';
      }
    }
  }
});

const totalPages = doc.getNumberOfPages ? doc.getNumberOfPages() : doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`NetGuard Bharat  |  Page ${i} of ${totalPages}`, pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
  const bh = doc.internal.pageSize.getHeight();
  doc.setFillColor(255, 153, 51);  doc.rect(0, bh - 2, pageW / 3, 2, 'F');
  doc.setFillColor(245, 245, 245); doc.rect(pageW / 3, bh - 2, pageW / 3, 2, 'F');
  doc.setFillColor(19, 136, 8);    doc.rect((pageW / 3) * 2, bh - 2, pageW / 3, 2, 'F');
}

fs.writeFileSync('test4.pdf', Buffer.from(doc.output('arraybuffer')));
console.log('PDF 4 generated');
