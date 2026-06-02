import { jsPDF } from 'jspdf';
import fs from 'fs';

try {
  const doc = new jsPDF();
  const t = 'Time 10:30\u202fAM';
  doc.text(t, 10, 10);
  fs.writeFileSync('test3.pdf', Buffer.from(doc.output('arraybuffer')));
  console.log('PDF 3 generated');
} catch(e) {
  console.error('Error generating PDF:', e);
}
