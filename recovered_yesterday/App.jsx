        { align: 'center' }
      );
      // Bottom tricolour bar
      const bh = doc.internal.pageSize.getHeight();
      doc.setFillColor(255, 153, 51);  doc.rect(0, bh - 2, pageW / 3, 2, 'F');
      doc.setFillColor(245, 245, 245); doc.rect(pageW / 3, bh - 2, pageW / 3, 2, 'F');
      doc.setFillColor(19, 136, 8);    doc.rect((pageW / 3) * 2, bh - 2, pageW / 3, 2, 'F');
    }

    doc.save('NetGuard_Historical_Report.pdf');
  };

  // ── AI Chat Intelligence Report Exporter ──
  const exportChatToPDF = (aiMessageText) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - margin * 2;
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Tricolour top bar
    doc.setFillColor(255, 153, 51);  doc.rect(0, 0, pageW / 3, 3, 'F');
    doc.setFillColor(245, 245, 245); doc.rect(pageW / 3, 0, pageW / 3, 3, 'F');
    doc.setFillColor(19, 136, 8);    doc.rect((pageW / 3) * 2, 0, pageW / 3, 3, 'F');

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('NETGUARD AI INTELLIGENCE REPORT', margin, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('AI COPILOT ANALYSIS  —  CONFIDENTIAL', margin, 20);
    doc.text(`Generated: ${dateStr}  ${timeStr}`, margin, 26);

    // Divider
    doc.setDrawColor(168, 85, 247);
    doc.setLineWidth(0.4);
    doc.line(margin, 30, pageW - margin, 30);

    // AI Analysis Body — strip markdown syntax for clean PDF text
    const cleanText = aiMessageText
      .replace(/#{1,6}\s*/g, '')        // strip headings
      .replace(/\*\*(.*?)\*\*/g, '$1')  // strip bold
      .replace(/\*(.*?)\*/g, '$1')      // strip italic
      .replace(/`{1,3}(.*?)`{1,3}/gs, '$1') // strip code
      .replace(/^[-*+]\s+/gm, '• ')    // bullets
      .replace(/\|/g, ' | ')            // table pipes to spaces
      .replace(/^-+$/gm, '')            // horizontal rules
      .trim();

    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(cleanText, contentW);
    doc.text(lines, margin, 38);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`NetGuard Bharat  |  AI Intelligence Report  |  ${dateStr}`, pageW / 2, pageH - 6, { align: 'center' });

    // Tricolour bottom bar
    doc.setFillColor(255, 153, 51);  doc.rect(0, pageH - 2, pageW / 3, 2, 'F');
    doc.setFillColor(245, 245, 245); doc.rect(pageW / 3, pageH - 2, pageW / 3, 2, 'F');
    doc.setFillColor(19, 136, 8);    doc.rect((pageW / 3) * 2, pageH - 2, pageW / 3, 2, 'F');
