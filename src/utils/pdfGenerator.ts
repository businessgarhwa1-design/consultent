import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FinancialReportData, FinancialYear, ReportType, FY_MONTHS, Client, WorkStatus } from '../types';

// Format Indian Currency Number for PDF rendering
export const formatINRNumber = (val: number): string => {
  const num = Number(val) || 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `Rs. ${formatted}`;
};

export const sanitizeFileName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
};

/**
 * Generates a professional, multi-page client financial turnover PDF report
 */
export const generateClientReportPDF = (
  data: FinancialReportData,
  reportType: ReportType = 'combined',
  companyName: string = 'TaxPro GST Consultancy & Services'
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Color Palette
  const primaryColor: [number, number, number] = [30, 58, 138]; // Deep Navy
  const secondaryColor: [number, number, number] = [71, 85, 105]; // Slate
  const headerBg: [number, number, number] = [241, 245, 249]; // Slate 100
  const accentColor: [number, number, number] = [13, 148, 136]; // Teal

  let currentY = 14;

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(14, currentY, pageWidth - 28, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), pageWidth / 2, currentY + 8, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const reportSubtitle =
    reportType === 'gst'
      ? 'GST MONTHLY TURNOVER COMPLIANCE REPORT'
      : reportType === 'bank'
      ? 'ANNUAL BANK TURNOVER STATEMENT REPORT (5 ACCOUNTS)'
      : 'CLIENT FINANCIAL TURNOVER COMPLIANCE REPORT (GST & BANK)';
  doc.text(reportSubtitle, pageWidth / 2, currentY + 15, { align: 'center' });

  currentY += 26;

  // Client Info Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const fileNoPrefix = data.client.file_no ? `[File #${data.client.file_no}] ` : '';
  doc.text(`Client Name: ${fileNoPrefix}${data.client.firm_name}`, 18, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Proprietor / Contact: ${data.client.client_name || 'N/A'}`, 18, currentY + 13);
  doc.text(`GSTIN: ${data.client.gstin || 'Not Registered / Pending'}`, 18, currentY + 19);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Financial Year: FY ${data.financialYear.display_name}`, pageWidth - 18, currentY + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`GST Scheme: ${data.client.gst_type?.toUpperCase() || 'REGULAR'}`, pageWidth - 18, currentY + 13, { align: 'right' });
  doc.text(`Generated Date: ${today}`, pageWidth - 18, currentY + 19, { align: 'right' });

  currentY += 30;

  // Section 1: GST Monthly Turnover Table (if combined or gst)
  if (reportType === 'combined' || reportType === 'gst') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text('1. GST MONTHLY TURNOVER (TAXABLE & EXEMPT)', 14, currentY);
    currentY += 4;

    const gstBody = data.gstRows.map((row) => [
      row.month,
      formatINRNumber(row.taxable),
      formatINRNumber(row.exempt),
      formatINRNumber(row.total),
      row.remark || '—',
    ]);

    // Add Totals row
    gstBody.push([
      'TOTAL (FY ' + data.financialYear.display_name + ')',
      formatINRNumber(data.gstTotals.taxable),
      formatINRNumber(data.gstTotals.exempt),
      formatINRNumber(data.gstTotals.total),
      '—',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Month', 'Taxable Turnover', 'Exempt Turnover', 'Total GST Turnover', 'Remark']],
      body: gstBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 28 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'left', fontSize: 7 },
      },
      didParseCell: (hookData) => {
        if (hookData.row.index === gstBody.length - 1) {
          hookData.cell.styles.fillColor = [224, 242, 254];
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.textColor = [3, 105, 161];
        }
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Section 2: Bank Turnover (Up to 5 Accounts)
  if (reportType === 'combined' || reportType === 'bank') {
    // Check if space is low on first page, add new page
    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text('2. BANK TURNOVER (UP TO 5 ACCOUNTS)', 14, currentY);
    currentY += 4;

    const configuredAccounts = data.bankAccounts.filter((b) => b.account !== null);

    if (configuredAccounts.length === 0) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'FD');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('No bank accounts configured for this client. Turnover recorded as ₹ 0.00 / Not Available.', pageWidth / 2, currentY + 8, {
        align: 'center',
      });
      currentY += 20;
    } else {
      // Build combined monthly bank turnover table across all 5 slots
      const tableHead = ['Month'];
      data.bankAccounts.forEach((slot) => {
        const title = slot.account
          ? `Slot ${slot.slotNumber}: ${slot.account.bank_name}\n(..${slot.account.account_number.slice(-4)})`
          : `Slot ${slot.slotNumber}\n[Not Configured]`;
        tableHead.push(title);
      });
      tableHead.push('Monthly Total');

      const bankBody: string[][] = FY_MONTHS.map((m) => {
        const row: string[] = [m];
        let rowSum = 0;
        data.bankAccounts.forEach((slot) => {
          const amt = slot.monthlyTurnover[m] || 0;
          row.push(slot.account ? formatINRNumber(amt) : '-');
          if (slot.account) rowSum += amt;
        });
        row.push(formatINRNumber(rowSum));
        return row;
      });

      // Total Row
      const totalRow: string[] = ['TOTAL'];
      data.bankAccounts.forEach((slot) => {
        totalRow.push(slot.account ? formatINRNumber(slot.total) : '-');
      });
      totalRow.push(formatINRNumber(data.totalBankTurnover));
      bankBody.push(totalRow);

      autoTable(doc, {
        startY: currentY,
        head: [tableHead],
        body: bankBody,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7,
          halign: 'center',
        },
        styles: {
          fontSize: 6.8,
          cellPadding: 1.6,
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 20 },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
        },
        didParseCell: (hookData) => {
          if (hookData.row.index === bankBody.length - 1) {
            hookData.cell.styles.fillColor = [240, 253, 244];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = [22, 101, 52];
          }
        },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Section 3: Final Financial Summary Card
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text('3. COMPLIANCE & FINANCIAL TURNOVER SUMMARY', 14, currentY);
  currentY += 4;

  // 2-Column Summary Box
  const boxWidth = (pageWidth - 32) / 2;
  const boxHeight = 44;

  // Box 1: GST Summary
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(14, currentY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(3, 105, 161);
  doc.text('GST ANNUAL REVENUE SUMMARY', 18, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Total Taxable Turnover:', 18, currentY + 16);
  doc.text(formatINRNumber(data.gstTotals.taxable), 14 + boxWidth - 4, currentY + 16, { align: 'right' });

  doc.text('Total Exempt Turnover:', 18, currentY + 24);
  doc.text(formatINRNumber(data.gstTotals.exempt), 14 + boxWidth - 4, currentY + 24, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(18, currentY + 28, 14 + boxWidth - 4, currentY + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL GST TURNOVER:', 18, currentY + 36);
  doc.setTextColor(3, 105, 161);
  doc.text(formatINRNumber(data.gstTotals.total), 14 + boxWidth - 4, currentY + 36, { align: 'right' });

  // Box 2: Bank Summary
  const box2X = 14 + boxWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(box2X, currentY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text('BANKING DEPOSITS & TURNOVER', box2X + 4, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  let subY = currentY + 14;
  data.bankAccounts.slice(0, 3).forEach((slot) => {
    if (slot.account) {
      doc.text(`Slot ${slot.slotNumber} (${slot.account.bank_name}):`, box2X + 4, subY);
      doc.text(formatINRNumber(slot.total), box2X + boxWidth - 4, subY, { align: 'right' });
      subY += 6;
    }
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(box2X + 4, currentY + 28, box2X + boxWidth - 4, currentY + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL BANK TURNOVER:', box2X + 4, currentY + 36);
  doc.setTextColor(22, 101, 52);
  doc.text(formatINRNumber(data.totalBankTurnover), box2X + boxWidth - 4, currentY + 36, { align: 'right' });

  // Footer on all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.text(`${companyName} • Confidential Client Compliance Report • Generated on ${today}`, 14, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }

  // Download PDF
  const safeName = sanitizeFileName(data.client.firm_name || 'Client');
  const fileName = `${safeName}_FY_${data.financialYear.display_name}_Turnover_Report.pdf`;
  doc.save(fileName);
};

/**
 * Generates a combined bulk PDF report for All Clients in selected FY
 */
export const generateAllClientsReportPDF = (
  allReports: FinancialReportData[],
  fy: FinancialYear,
  reportType: ReportType = 'combined',
  companyName: string = 'TaxPro GST Consultancy & Services'
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const primaryColor: [number, number, number] = [30, 58, 138];

  // Cover / Header Banner on First Page
  let currentY = 14;

  doc.setFillColor(...primaryColor);
  doc.rect(14, currentY, pageWidth - 28, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), pageWidth / 2, currentY + 8, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `ALL CLIENTS CONSOLIDATED FINANCIAL REPORT • FY ${fy.display_name}`,
    pageWidth / 2,
    currentY + 16,
    { align: 'center' }
  );

  currentY += 28;

  // Master Summary Box
  const totalClients = allReports.length;
  const grandTaxable = allReports.reduce((sum, r) => sum + r.gstTotals.taxable, 0);
  const grandExempt = allReports.reduce((sum, r) => sum + r.gstTotals.exempt, 0);
  const grandGst = allReports.reduce((sum, r) => sum + r.gstTotals.total, 0);
  const grandBank = allReports.reduce((sum, r) => sum + r.totalBankTurnover, 0);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`PORTFOLIO SUMMARY: ${totalClients} ACTIVE CLIENTS`, 18, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total GST Turnover: ${formatINRNumber(grandGst)}`, 18, currentY + 15);
  doc.text(`Total Bank Turnover: ${formatINRNumber(grandBank)}`, pageWidth / 2, currentY + 15);
  doc.text(`Generated Date: ${today}`, pageWidth - 18, currentY + 15, { align: 'right' });

  currentY += 28;

  // Table of all clients executive summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text('EXECUTIVE CLIENT-WISE FINANCIAL COMPARISON', 14, currentY);
  currentY += 4;

  const summaryHead = ['#', 'Client Name', 'GSTIN', 'GST Taxable', 'GST Exempt', 'Total GST', 'Total Bank'];
  const summaryBody = allReports.map((r, i) => [
    i + 1,
    r.client.firm_name,
    r.client.gstin,
    formatINRNumber(r.gstTotals.taxable),
    formatINRNumber(r.gstTotals.exempt),
    formatINRNumber(r.gstTotals.total),
    formatINRNumber(r.totalBankTurnover),
  ]);

  // Add Grand Totals
  summaryBody.push([
    '',
    'GRAND TOTAL',
    '',
    formatINRNumber(grandTaxable),
    formatINRNumber(grandExempt),
    formatINRNumber(grandGst),
    formatINRNumber(grandBank),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [summaryHead],
    body: summaryBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
      2: { halign: 'left', cellWidth: 28 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      if (hookData.row.index === summaryBody.length - 1) {
        hookData.cell.styles.fillColor = [224, 242, 254];
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = [3, 105, 161];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // For each client, generate their detailed section
  allReports.forEach((data, index) => {
    doc.addPage();
    let clientY = 14;

    // Mini Client Header
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, clientY, pageWidth - 28, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text(`CLIENT #${index + 1}: ${data.client.firm_name}`, 18, clientY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`GSTIN: ${data.client.gstin} | FY: ${data.financialYear.display_name}`, 18, clientY + 13);
    doc.text(
      `GST Total: ${formatINRNumber(data.gstTotals.total)} | Bank Total: ${formatINRNumber(data.totalBankTurnover)}`,
      pageWidth - 18,
      clientY + 13,
      { align: 'right' }
    );

    clientY += 23;

    // GST Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('GST Monthly Turnover (Taxable & Exempt)', 14, clientY);
    clientY += 3;

    const gstBody = data.gstRows.map((row) => [
      row.month,
      formatINRNumber(row.taxable),
      formatINRNumber(row.exempt),
      formatINRNumber(row.total),
      row.remark || '—',
    ]);

    gstBody.push([
      'TOTAL',
      formatINRNumber(data.gstTotals.taxable),
      formatINRNumber(data.gstTotals.exempt),
      formatINRNumber(data.gstTotals.total),
      '—',
    ]);

    autoTable(doc, {
      startY: clientY,
      head: [['Month', 'Taxable Turnover', 'Exempt Turnover', 'Total GST Turnover', 'Remark']],
      body: gstBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 30 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });

    clientY = (doc as any).lastAutoTable.finalY + 8;

    // Bank Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Bank Turnover (5 Accounts)', 14, clientY);
    clientY += 3;

    const tableHead = ['Month'];
    data.bankAccounts.forEach((slot) => {
      const title = slot.account
        ? `Slot ${slot.slotNumber}: ${slot.account.bank_name.slice(0, 10)}`
        : `Slot ${slot.slotNumber}`;
      tableHead.push(title);
    });
    tableHead.push('Monthly Total');

    const bankBody: string[][] = FY_MONTHS.map((m) => {
      const row: string[] = [m];
      let rowSum = 0;
      data.bankAccounts.forEach((slot) => {
        const amt = slot.monthlyTurnover[m] || 0;
        row.push(slot.account ? formatINRNumber(amt) : '-');
        if (slot.account) rowSum += amt;
      });
      row.push(formatINRNumber(rowSum));
      return row;
    });

    const totalRow: string[] = ['TOTAL'];
    data.bankAccounts.forEach((slot) => {
      totalRow.push(slot.account ? formatINRNumber(slot.total) : '-');
    });
    totalRow.push(formatINRNumber(data.totalBankTurnover));
    bankBody.push(totalRow);

    autoTable(doc, {
      startY: clientY,
      head: [tableHead],
      body: bankBody,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 6.5,
      },
      styles: {
        fontSize: 6.5,
        cellPadding: 1.4,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 18 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
      },
      margin: { left: 14, right: 14 },
    });
  });

  // Footer on all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.text(`${companyName} • Consolidated Financial Report FY ${fy.display_name}`, 14, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }

  const fileName = `All_Clients_FY_${fy.display_name}_Turnover_Report.pdf`;
  doc.save(fileName);
};

export interface MonthlyWorkExportItem {
  client: Client;
  status: WorkStatus;
  remark: string;
  staffName: string;
  updatedAt?: string;
}

export interface MonthlyWorkFilterInfo {
  statusFilter: string;
  schemeFilter: string;
  staffFilter: string;
  staffFilterName?: string;
  searchTerm?: string;
  isSelectedOnly?: boolean;
}

/**
 * Generates an executive Landscape A4 PDF report for Monthly GST Work
 * filtering exactly according to the user's active filters or custom selection.
 */
export const generateMonthlyWorkReportPDF = (
  month: string,
  financialYear: FinancialYear,
  items: MonthlyWorkExportItem[],
  filterInfo: MonthlyWorkFilterInfo,
  companyName: string = 'CA RISHABH JAISWAL & ASSOCIATES'
): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Color Palette
  const navyBg: [number, number, number] = [15, 23, 42]; // Slate 900
  const headerCardBg: [number, number, number] = [248, 250, 252]; // Slate 50

  let currentY = 10;

  // Header Banner
  doc.setFillColor(...navyBg);
  doc.rect(10, currentY, pageWidth - 20, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), 16, currentY + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(
    `MONTHLY GST WORK COMPLIANCE & STATUS REPORT • ${month.toUpperCase()} (FY ${financialYear.display_name})`,
    16,
    currentY + 13
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Generated: ${today}, ${timeStr}`, pageWidth - 16, currentY + 10, { align: 'right' });

  currentY += 22;

  // Filter & Status Summary Strip Box
  doc.setFillColor(...headerCardBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, currentY, pageWidth - 20, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('REPORT SCOPE & APPLIED FILTERS:', 14, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const statusLabel = filterInfo.statusFilter === 'all' ? 'All Statuses' : filterInfo.statusFilter;
  const schemeLabel = filterInfo.schemeFilter === 'all' ? 'All Categories' : filterInfo.schemeFilter;
  const staffLabel = filterInfo.staffFilterName || (filterInfo.staffFilter === 'all' ? 'All Staff' : filterInfo.staffFilter);
  const searchLabel = filterInfo.searchTerm?.trim() ? `"${filterInfo.searchTerm.trim()}"` : 'None';
  const modeLabel = filterInfo.isSelectedOnly ? `Selected Clients (${items.length})` : `Filtered View (${items.length} Total)`;

  const filterText1 = `• Scope: ${modeLabel}   • Status: ${statusLabel}   • Category: ${schemeLabel}`;
  const filterText2 = `• Staff: ${staffLabel}   • Search Query: ${searchLabel}`;

  doc.text(filterText1, 14, currentY + 11);
  doc.text(filterText2, 14, currentY + 15);

  // Status Breakdown counts
  let completedCount = 0;
  let billPendingCount = 0;
  let taxPendingCount = 0;
  let docsPendingCount = 0;
  let clientPendingCount = 0;
  let notStartedCount = 0;

  items.forEach((item) => {
    if (item.status === 'Completed') completedCount++;
    else if (item.status === 'Bill Pending') billPendingCount++;
    else if (item.status === 'Tax Payment Pending') taxPendingCount++;
    else if (item.status === 'Documents Pending') docsPendingCount++;
    else if (item.status === 'Client Response Pending') clientPendingCount++;
    else notStartedCount++;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`Completed: ${completedCount}`, pageWidth - 16, currentY + 6, { align: 'right' });

  doc.setTextColor(249, 115, 22); // Orange
  doc.text(`Bill Pending: ${billPendingCount}`, pageWidth - 16, currentY + 10, { align: 'right' });

  doc.setTextColor(239, 68, 68); // Red
  doc.text(`Tax/Docs/Other: ${taxPendingCount + docsPendingCount + clientPendingCount + notStartedCount}`, pageWidth - 16, currentY + 14, { align: 'right' });

  currentY += 22;

  // Table Data
  const tableHead = [
    '#',
    'File No',
    'GSTIN',
    'Firm / Trade Name',
    'Contact Person & Mobile',
    'Category',
    'Assigned Staff',
    'Compliance Status',
    'Filing Remark / Note',
    'Last Updated',
  ];

  const tableBody = items.map((item, index) => {
    const mobileStr = [item.client.mobile, item.client.alternate_mobile].filter(Boolean).join(', ');
    const contactText = item.client.client_name ? `${item.client.client_name}\n${mobileStr}` : mobileStr || '-';
    return [
      String(index + 1),
      item.client.file_no || '-',
      item.client.gstin || 'Unregistered',
      item.client.firm_name || 'N/A',
      contactText,
      item.client.gst_type || 'Normal',
      item.staffName || 'Unassigned',
      item.status,
      item.remark || '-',
      item.updatedAt || '-',
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [tableHead],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138], // Navy
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 2,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8, fontStyle: 'bold' },
      1: { cellWidth: 18, fontStyle: 'bold', textColor: [120, 53, 15] },
      2: { cellWidth: 32, fontStyle: 'bold', textColor: [15, 23, 42] },
      3: { cellWidth: 50, fontStyle: 'bold' },
      4: { cellWidth: 36 },
      5: { cellWidth: 18 },
      6: { cellWidth: 24 },
      7: { cellWidth: 32, fontStyle: 'bold' },
      8: { cellWidth: 42 },
      9: { cellWidth: 20, fontSize: 6.5, textColor: [100, 116, 139] },
    },
    margin: { left: 10, right: 10 },
    didParseCell: (data) => {
      // Highlight Status Column (Index 7)
      if (data.section === 'body' && data.column.index === 7) {
        const val = String(data.cell.raw || '');
        if (val === 'Completed') {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (val === 'Bill Pending') {
          data.cell.styles.textColor = [194, 65, 12]; // Orange
          data.cell.styles.fillColor = [255, 247, 237];
        } else if (val === 'Tax Payment Pending') {
          data.cell.styles.textColor = [190, 18, 60]; // Rose
          data.cell.styles.fillColor = [255, 241, 242];
        } else if (val === 'Documents Pending') {
          data.cell.styles.textColor = [126, 34, 206]; // Purple
          data.cell.styles.fillColor = [250, 245, 255];
        } else if (val === 'Client Response Pending') {
          data.cell.styles.textColor = [14, 116, 144]; // Cyan
          data.cell.styles.fillColor = [236, 254, 255];
        } else {
          data.cell.styles.textColor = [71, 85, 105]; // Slate
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    },
  });

  // Footer on all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.line(10, pageHeight - 10, pageWidth - 10, pageHeight - 10);
    doc.text(
      `${companyName} • GST Compliance Portal • Month: ${month.toUpperCase()} (${financialYear.display_name}) • Total Filtered: ${items.length}`,
      10,
      pageHeight - 6
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 10, pageHeight - 6, { align: 'right' });
  }

  const filterSuffix = filterInfo.isSelectedOnly
    ? `Selected_${items.length}`
    : filterInfo.statusFilter !== 'all'
    ? sanitizeFileName(filterInfo.statusFilter)
    : 'All';
  const cleanMonth = sanitizeFileName(month);
  const cleanFY = sanitizeFileName(financialYear.display_name);
  const fileName = `GST_Monthly_Work_${cleanMonth}_FY_${cleanFY}_${filterSuffix}_${new Date().toISOString().split('T')[0]}.pdf`;

  doc.save(fileName);
};

/**
 * Generates and downloads a clean CSV file matching the active filters or selection
 */
export const generateMonthlyWorkReportCSV = (
  month: string,
  financialYear: FinancialYear,
  items: MonthlyWorkExportItem[],
  filterInfo: MonthlyWorkFilterInfo
): void => {
  const header = [
    'S.No',
    'File No',
    'GSTIN',
    'Firm Name',
    'Client / Proprietor Name',
    'Mobile',
    'Alternate Mobile',
    'Email',
    'Category / Scheme',
    'Assigned Staff',
    'Financial Year',
    'Month',
    'Compliance Status',
    'Filing Remark / Note',
    'Last Updated Date',
  ];

  const rows = items.map((item, index) => {
    return [
      String(index + 1),
      `"${(item.client.file_no || '').replace(/"/g, '""')}"`,
      `"${(item.client.gstin || '').replace(/"/g, '""')}"`,
      `"${(item.client.firm_name || '').replace(/"/g, '""')}"`,
      `"${(item.client.client_name || '').replace(/"/g, '""')}"`,
      `"${(item.client.mobile || '').replace(/"/g, '""')}"`,
      `"${(item.client.alternate_mobile || '').replace(/"/g, '""')}"`,
      `"${(item.client.email || '').replace(/"/g, '""')}"`,
      `"${(item.client.gst_type || 'Normal').replace(/"/g, '""')}"`,
      `"${(item.staffName || 'Unassigned').replace(/"/g, '""')}"`,
      `"${financialYear.display_name}"`,
      `"${month}"`,
      `"${(item.status || 'Not Started').replace(/"/g, '""')}"`,
      `"${(item.remark || '').replace(/"/g, '""')}"`,
      `"${(item.updatedAt || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const filterSuffix = filterInfo.isSelectedOnly
    ? `Selected_${items.length}`
    : filterInfo.statusFilter !== 'all'
    ? sanitizeFileName(filterInfo.statusFilter)
    : 'All';
  const cleanMonth = sanitizeFileName(month);
  const cleanFY = sanitizeFileName(financialYear.display_name);
  const fileName = `GST_Monthly_Work_${cleanMonth}_FY_${cleanFY}_${filterSuffix}_${new Date().toISOString().split('T')[0]}.csv`;

  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface AllClientsGstTurnoverExportData {
  client: Client;
  fileNo: string;
  firmName: string;
  gstin: string;
  clientName: string;
  mobile: string;
  gstType: string;
  staffName: string;
  monthly: Record<string, { taxable: number; exempt: number; total: number }>;
  quarterly: { q1: number; q2: number; q3: number; q4: number };
  annualTaxable: number;
  annualExempt: number;
  annualTotal: number;
}

/**
 * Generates professional Landscape 12-Month GST Turnover PDF Report for All Clients
 */
export const generateAllClientsGstTurnoverPDF = (
  clientsData: AllClientsGstTurnoverExportData[],
  financialYear: FinancialYear,
  companyName: string = 'TaxPro GST Consultancy & Services'
): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const nowTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const primaryColor: [number, number, number] = [120, 53, 15]; // #78350F
  const headerBg: [number, number, number] = [250, 246, 240]; // #FAF6F0

  // Header Banner
  let currentY = 10;
  doc.setFillColor(...primaryColor);
  doc.rect(10, currentY, pageWidth - 20, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), pageWidth / 2, currentY + 6.5, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `ALL CLIENTS 12-MONTH GST TURNOVER REPORT (APRIL - MARCH) • FINANCIAL YEAR ${financialYear.display_name}`,
    pageWidth / 2,
    currentY + 13.5,
    { align: 'center' }
  );

  currentY += 22;

  // Portfolio KPIs Summary Bar
  const totalClients = clientsData.length;
  const clientsWithSales = clientsData.filter((c) => c.annualTotal > 0).length;
  const grandTaxable = clientsData.reduce((sum, c) => sum + c.annualTaxable, 0);
  const grandExempt = clientsData.reduce((sum, c) => sum + c.annualExempt, 0);
  const grandTotal = clientsData.reduce((sum, c) => sum + c.annualTotal, 0);

  doc.setFillColor(...headerBg);
  doc.setDrawColor(212, 195, 163);
  doc.roundedRect(10, currentY, pageWidth - 20, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(120, 53, 15);
  doc.text(`PORTFOLIO SUMMARY: ${totalClients} CLIENTS (${clientsWithSales} Active with Sales)`, 14, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Total Taxable: ${formatINRNumber(grandTaxable)}  |  Total Exempt: ${formatINRNumber(grandExempt)}  |  Grand Annual Turnover: ${formatINRNumber(grandTotal)}`,
    14,
    currentY + 10.5
  );
  doc.text(`Generated: ${today} at ${nowTime}`, pageWidth - 14, currentY + 8, { align: 'right' });

  currentY += 18;

  // 12-Month Table Columns
  const head = [
    [
      '#',
      'File',
      'Firm Name',
      'GSTIN',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
      'Taxable',
      'Exempt',
      'Grand Total',
    ],
  ];

  const body = clientsData.map((c, i) => {
    return [
      String(i + 1),
      c.fileNo || '—',
      c.firmName,
      c.gstin,
      c.monthly['April']?.total > 0 ? (c.monthly['April'].total / 1000).toFixed(1) + 'k' : '—',
      c.monthly['May']?.total > 0 ? (c.monthly['May'].total / 1000).toFixed(1) + 'k' : '—',
      c.monthly['June']?.total > 0 ? (c.monthly['June'].total / 1000).toFixed(1) + 'k' : '—',
      c.monthly['July']?.total > 0 ? (c.monthly['July'].total / 1000).toFixed(1) + 'k' : '—',
      c.monthly['August']?.total > 0 ? (c.monthly['August'].total / 1000).toFixed(1) + 'k' : '—',
      c.monthly['September']?.total > 0 ? (c.monthly['September'].total / 1000).toFixed(1) + 'k' : '—',
      c.monthly['October']?.total > 0 ? (c.monthly['October'].total / 1000).toFixed(1) + 'k' : '—',
      c.monthly['November']?.total > 0 ? (c.monthly['November'].total / 1000).toFixed(1) + 'k' : '—',
      c.monthly['December']?.total > 0 ? (c.monthly['December'].total / 1000).toFixed(1) + 'k' : '—',
      c.monthly['January']?.total > 0 ? (c.monthly['January'].total / 1000).toFixed(1) + 'k' : '—',
      c.monthly['February']?.total > 0 ? (c.monthly['February'].total / 1000).toFixed(1) + 'k' : '—',
      c.monthly['March']?.total > 0 ? (c.monthly['March'].total / 1000).toFixed(1) + 'k' : '—',
      formatINRNumber(c.annualTaxable),
      formatINRNumber(c.annualExempt),
      formatINRNumber(c.annualTotal),
    ];
  });

  // Grand Total Row
  body.push([
    '',
    '',
    'PORTFOLIO GRAND TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    formatINRNumber(grandTaxable),
    formatINRNumber(grandExempt),
    formatINRNumber(grandTotal),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [120, 53, 15],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
    },
    styles: {
      fontSize: 6,
      cellPadding: 1.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { halign: 'center', cellWidth: 10 },
      2: { halign: 'left', fontStyle: 'bold', cellWidth: 36 },
      3: { halign: 'left', cellWidth: 24 },
      4: { halign: 'right', cellWidth: 11 },
      5: { halign: 'right', cellWidth: 11 },
      6: { halign: 'right', cellWidth: 11 },
      7: { halign: 'right', cellWidth: 11 },
      8: { halign: 'right', cellWidth: 11 },
      9: { halign: 'right', cellWidth: 11 },
      10: { halign: 'right', cellWidth: 11 },
      11: { halign: 'right', cellWidth: 11 },
      12: { halign: 'right', cellWidth: 11 },
      13: { halign: 'right', cellWidth: 11 },
      14: { halign: 'right', cellWidth: 11 },
      15: { halign: 'right', cellWidth: 11 },
      16: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
      17: { halign: 'right', fontStyle: 'bold', cellWidth: 18 },
      18: { halign: 'right', fontStyle: 'bold', cellWidth: 23 },
    },
    didParseCell: (hookData) => {
      // Grand total row styling
      if (hookData.row.index === body.length - 1) {
        hookData.cell.styles.fillColor = [250, 246, 240];
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = [120, 53, 15];
      }
    },
    didDrawPage: (hookData) => {
      // Footer on every page
      const pageNumber = hookData.pageNumber;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated from GST Management System • Page ${pageNumber}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    },
  });

  const fileName = `All_Clients_12M_GST_Turnover_${sanitizeFileName(financialYear.display_name)}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export interface TopClientExportRow {
  rank: number;
  fileNo?: string;
  firmName: string;
  clientName?: string;
  gstin?: string;
  scheme: string;
  taxableTurnover: number;
  exemptTurnover: number;
  totalTurnover: number;
  bankTurnover?: number;
  percentageShare: number;
  notes?: string;
}

/**
 * Generates an executive PDF report for Top Clients by GST & Bank Turnover
 */
export const generateTopClientsTurnoverPDF = (
  items: TopClientExportRow[],
  financialYear: FinancialYear,
  reportTitle: string = 'TOP CLIENTS GST TURNOVER STATEMENT',
  summary: {
    totalTaxable: number;
    totalExempt: number;
    grandTotal: number;
    totalBankTurnover: number;
    portfolioTotal: number;
    portfolioShare: number;
  },
  companyName: string = 'TaxPro GST Consultancy & Services'
): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const accentColor: [number, number, number] = [120, 53, 15]; // Amber 900
  let currentY = 12;

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(14, currentY, pageWidth - 28, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), pageWidth / 2, currentY + 7, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(
    `${reportTitle.toUpperCase()} • FINANCIAL YEAR: FY ${financialYear.display_name} • DATE: ${today}`,
    pageWidth / 2,
    currentY + 13,
    { align: 'center' }
  );

  currentY += 23;

  // Executive KPI summary boxes
  const boxWidth = (pageWidth - 28 - 12) / 4;
  const boxHeight = 15;

  // Box 1: Clients Selected
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL CLIENTS IN RANKING', 14 + boxWidth / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${items.length} Clients`, 14 + boxWidth / 2, currentY + 11.5, { align: 'center' });

  // Box 2: Total Taxable Turnover
  const box2X = 14 + boxWidth + 4;
  doc.roundedRect(box2X, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL TAXABLE SALES (INR)', box2X + boxWidth / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(10.5);
  doc.setTextColor(37, 99, 235);
  doc.text(formatINRNumber(summary.totalTaxable), box2X + boxWidth / 2, currentY + 11.5, { align: 'center' });

  // Box 3: Total Combined GST Turnover
  const box3X = box2X + boxWidth + 4;
  doc.setFillColor(250, 246, 240);
  doc.setDrawColor(212, 195, 163);
  doc.roundedRect(box3X, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(120, 53, 15);
  doc.text('GRAND GST TURNOVER (12M)', box3X + boxWidth / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 53, 15);
  doc.text(formatINRNumber(summary.grandTotal), box3X + boxWidth / 2, currentY + 11.5, { align: 'center' });

  // Box 4: Portfolio Share %
  const box4X = box3X + boxWidth + 4;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(box4X, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.text('SHARE OF FIRM PORTFOLIO', box4X + boxWidth / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(22, 101, 52);
  doc.text(`${summary.portfolioShare.toFixed(1)}% of Portfolio`, box4X + boxWidth / 2, currentY + 11.5, { align: 'center' });

  currentY += 19;

  // Build table data
  const head = [
    [
      'Rank',
      'File #',
      'Firm Name / Business Account',
      'GSTIN',
      'Scheme',
      'Taxable Sales (Rs.)',
      'Exempt Sales (Rs.)',
      'Total GST Turnover (Rs.)',
      'Bank Turnover (Rs.)',
      '% Share',
      'Remarks / Category',
    ],
  ];

  const body: (string | number)[][] = items.map((row) => [
    `#${row.rank}`,
    row.fileNo || '—',
    row.clientName ? `${row.firmName}\n(${row.clientName})` : row.firmName,
    row.gstin || '—',
    row.scheme,
    Number(row.taxableTurnover || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    Number(row.exemptTurnover || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    Number(row.totalTurnover || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    Number(row.bankTurnover || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    `${row.percentageShare.toFixed(2)}%`,
    row.notes || '—',
  ]);

  // Add Grand Total Row
  body.push([
    'TOTAL',
    '—',
    `TOTAL OF ${items.length} SELECTED TOP CLIENTS`,
    '—',
    '—',
    Number(summary.totalTaxable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    Number(summary.totalExempt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    Number(summary.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    Number(summary.totalBankTurnover || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    `${summary.portfolioShare.toFixed(2)}%`,
    `Portfolio: ${formatINRNumber(summary.portfolioTotal)}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 12 },
      1: { halign: 'center', cellWidth: 14 },
      2: { halign: 'left', fontStyle: 'bold', cellWidth: 58 },
      3: { halign: 'center', fontStyle: 'normal', cellWidth: 32 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 26 },
      6: { halign: 'right', cellWidth: 24 },
      7: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
      8: { halign: 'right', cellWidth: 26 },
      9: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
      10: { halign: 'left', cellWidth: 17 },
    },
    didParseCell: (hookData) => {
      // Grand total row styling
      if (hookData.row.index === body.length - 1) {
        hookData.cell.styles.fillColor = [250, 246, 240];
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = [120, 53, 15];
      }
    },
    didDrawPage: (hookData) => {
      const pageNumber = hookData.pageNumber;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated from GST Master System • Page ${pageNumber}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    },
  });

  const sanitizedTitle = sanitizeFileName(reportTitle);
  const fileName = `${sanitizedTitle}_${sanitizeFileName(financialYear.display_name)}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};


