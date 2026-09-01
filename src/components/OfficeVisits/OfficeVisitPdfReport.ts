import { OfficeVisit, FinancialYear, AppSettings } from '../../types';

export function generateOfficeVisitPDF(
  visits: OfficeVisit[],
  selectedFY?: FinancialYear,
  selectedMonth?: string,
  settings?: AppSettings,
  filterDescription?: string
) {
  const firmName = settings?.company_name || 'GST MANAGEMENT & TAX CONSULTANCY';
  const firmAdminEmail = settings?.admin_email || 'admin@gstportal.in';

  const totalVisits = visits.length;
  const inOfficeCount = visits.filter((v) => v.status === 'IN').length;
  const outCount = visits.filter((v) => v.status === 'OUT').length;
  const registeredCount = visits.filter((v) => v.visitor_type === 'registered').length;
  const newVisitorsCount = visits.filter((v) => v.visitor_type === 'new').length;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate and print PDF reports.');
    return;
  }

  const rowsHtml = visits
    .map((v, idx) => {
      const isRegistered = v.visitor_type === 'registered';
      const statusBadge =
        v.status === 'IN'
          ? '<span style="background-color: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;">IN OFFICE</span>'
          : '<span style="background-color: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 11px;">OUT</span>';

      const typeBadge = isRegistered
        ? '<span style="background-color: #eff6ff; color: #1e40af; padding: 2px 5px; border-radius: 4px; font-size: 10px; font-weight: bold;">REGISTERED</span>'
        : '<span style="background-color: #fef3c7; color: #92400e; padding: 2px 5px; border-radius: 4px; font-size: 10px; font-weight: bold;">NEW VISITOR</span>';

      return `
      <tr>
        <td style="text-align: center; font-size: 11px;">${idx + 1}</td>
        <td>
          <div style="font-weight: 600; color: #0f172a; font-size: 12px;">${v.firm_name || v.client_name}</div>
          <div style="font-size: 11px; color: #64748b;">Contact: ${v.client_name} &bull; Mob: ${v.mobile || 'N/A'}</div>
          ${v.gst_number && v.gst_number !== 'N/A' ? `<div style="font-size: 10px; color: #0284c7; font-family: monospace;">GSTIN: ${v.gst_number}</div>` : ''}
          ${v.file_number ? `<div style="font-size: 10px; color: #64748b;">File No: <strong>${v.file_number}</strong></div>` : ''}
        </td>
        <td style="font-size: 11px; text-align: center;">
          ${typeBadge}
          <div style="font-size: 10px; color: #475569; margin-top: 3px;">${v.client_type || 'General'}</div>
        </td>
        <td>
          <div style="font-weight: 600; font-size: 11px; color: #1e293b;">${v.purpose}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px; font-style: italic;">"${v.current_remark || 'No remark'}"</div>
        </td>
        <td style="font-size: 11px; white-space: nowrap;">
          <div style="font-weight: 600;">${v.visit_date}</div>
          <div style="color: #059669; font-size: 10px;">IN: ${v.in_time}</div>
          <div style="color: #64748b; font-size: 10px;">OUT: ${v.out_time || 'Still IN'}</div>
        </td>
        <td style="text-align: center;">
          ${statusBadge}
        </td>
        <td style="font-size: 11px; color: #334155;">
          <div><strong>Entry:</strong> ${v.entry_by_name}</div>
          ${v.out_marked_by_name ? `<div style="font-size: 10px; color: #64748b;"><strong>Exit:</strong> ${v.out_marked_by_name}</div>` : ''}
        </td>
      </tr>
    `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Office Client Visit Register - ${selectedMonth || ''} ${selectedFY?.display_name || ''}</title>
      <meta charset="utf-8" />
      <style>
        @page {
          size: A4 landscape;
          margin: 12mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 0;
          font-size: 12px;
          background: #ffffff;
        }
        .header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 14px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .firm-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
          text-transform: uppercase;
        }
        .firm-sub {
          font-size: 11px;
          color: #475569;
          margin-top: 3px;
        }
        .doc-title-block {
          text-align: right;
        }
        .doc-title {
          font-size: 16px;
          font-weight: 800;
          color: #1e3a8a;
          text-transform: uppercase;
        }
        .doc-meta {
          font-size: 11px;
          color: #475569;
          margin-top: 3px;
        }
        .summary-cards {
          display: flex;
          gap: 12px;
          margin-bottom: 14px;
        }
        .stat-card {
          flex: 1;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 12px;
          text-align: center;
        }
        .stat-val {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }
        .stat-lbl {
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        th {
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
          padding: 8px 6px;
          text-align: left;
          border: 1px solid #0f172a;
        }
        td {
          padding: 7px 6px;
          border: 1px solid #cbd5e1;
          vertical-align: top;
        }
        tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .footer {
          margin-top: 18px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
        }
        @media print {
          button.no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div style="margin-bottom: 12px; text-align: right;" class="no-print">
        <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 12px;">
          🖨️ Print / Save as PDF
        </button>
        <button onclick="window.close()" style="background: #e2e8f0; color: #0f172a; border: none; padding: 8px 14px; font-weight: bold; border-radius: 6px; cursor: pointer; margin-left: 8px; font-size: 12px;">
          Close
        </button>
      </div>

      <div class="header">
        <div>
          <div class="firm-title">${firmName}</div>
          <div class="firm-sub">Official Office & Visitor Management Register &bull; ${firmAdminEmail}</div>
        </div>
        <div class="doc-title-block">
          <div class="doc-title">Office Client Visit Register</div>
          <div class="doc-meta">
            ${selectedMonth ? `Month: <strong>${selectedMonth}</strong> &bull; ` : ''}
            ${selectedFY ? `FY: <strong>${selectedFY.display_name}</strong>` : ''}
          </div>
          ${filterDescription ? `<div style="font-size: 10px; color: #2563eb; margin-top: 2px;">Filter: ${filterDescription}</div>` : ''}
        </div>
      </div>

      <div class="summary-cards">
        <div class="stat-card">
          <div class="stat-val">${totalVisits}</div>
          <div class="stat-lbl">Total Visitors</div>
        </div>
        <div class="stat-card" style="border-left: 3px solid #10b981;">
          <div class="stat-val" style="color: #059669;">${inOfficeCount}</div>
          <div class="stat-lbl">Currently IN Office</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${outCount}</div>
          <div class="stat-lbl">Already OUT</div>
        </div>
        <div class="stat-card" style="border-left: 3px solid #3b82f6;">
          <div class="stat-val" style="color: #2563eb;">${registeredCount}</div>
          <div class="stat-lbl">Registered Clients</div>
        </div>
        <div class="stat-card" style="border-left: 3px solid #f59e0b;">
          <div class="stat-val" style="color: #d97706;">${newVisitorsCount}</div>
          <div class="stat-lbl">New Visitors</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">#</th>
            <th style="width: 25%;">Client / Firm / Contact Info</th>
            <th style="width: 12%; text-align: center;">Category / Scheme</th>
            <th style="width: 25%;">Purpose & Latest Remarks</th>
            <th style="width: 14%;">Date & Timings</th>
            <th style="width: 10%; text-align: center;">Status</th>
            <th style="width: 14%;">Staff Details</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No office visit records found for the selected criteria.</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <div>Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</div>
        <div>Office Client Visit Register &bull; Page 1 of 1</div>
        <div>Confidential Office Record</div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
