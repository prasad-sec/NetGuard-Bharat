import html2pdf from 'html2pdf.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';

try {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.text('Test', 10, 10);
  fs.writeFileSync('test2.pdf', Buffer.from(doc.output('arraybuffer')));
  console.log('PDF 2 generated');
} catch(e) {
  console.error('Error generating PDF:', e);
}
