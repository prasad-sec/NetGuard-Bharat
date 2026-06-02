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

doc.setFontSize(18);
doc.text('NETGUARD BHARAT', 14, 14);

const rows = [
  ['2023-01-01 12:00:00', 'THREAT', 'BadApp.exe', '1.1.1.1', 'RU']
];

autoTable(doc, {
  startY: 39,
  head: [['Timestamp', 'Status', 'Source Process', 'Destination IP', 'Country']],
  body: rows,
});

fs.writeFileSync('test.pdf', Buffer.from(doc.output('arraybuffer')));
console.log('PDF generated');
