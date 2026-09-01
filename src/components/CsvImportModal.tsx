import React, { useState } from 'react';
import { Client } from '../types';
import { validateGSTIN } from '../utils/gstValidation';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, ArrowRight } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingClients: Client[];
  onImportConfirmed: (newClients: Omit<Client, 'id' | 'created_at' | 'updated_at'>[]) => void;
}

interface ParsedRow {
  rowNum: number;
  file_no?: string;
  gstin: string;
  firm_name: string;
  client_name: string;
  mobile: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  gst_type: 'regular' | 'composition';
  isValid: boolean;
  error?: string;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  existingClients,
  onImportConfirmed,
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const downloadSampleCSV = () => {
    const csvContent =
      'File No,GSTIN,Firm Name,Client Name,Mobile,Email,Address,City,State,PIN,GST Type\n' +
      'F-101,27AAAAA0000A1Z5,Apex Infotech Solutions,Rajesh Nair,9820123456,rajesh@apex.in,Shop 12 M.G Road,Pune,Maharashtra,411001,regular\n' +
      'F-102,24BBBBB1111B2Z8,Omkar General Traders,Ketan Patel,9898123456,omkar@gmail.com,G-4 Ring Road,Surat,Gujarat,395002,composition\n' +
      'F-103,07CCCCC2222C3Z1,Delhi Dynamics Pvt Ltd,Amit Sharma,9811122233,amit@delhidynamics.com,Connaught Place,New Delhi,Delhi,110001,regular\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_gst_clients_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCSVText(text);
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const parseCSVText = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setParsedRows([]);
      return;
    }

    const headerCols = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const fileNoIndex = headerCols.findIndex((h) => h.includes('file'));
    const gstinIndex = headerCols.findIndex((h) => h.includes('gstin'));
    const firmIndex = headerCols.findIndex((h) => h.includes('firm'));
    const nameIndex = headerCols.findIndex((h) => h.includes('client') || h.includes('name'));
    const mobileIndex = headerCols.findIndex((h) => h.includes('mobile') || h.includes('phone'));
    const emailIndex = headerCols.findIndex((h) => h.includes('email'));
    const addressIndex = headerCols.findIndex((h) => h.includes('address'));
    const cityIndex = headerCols.findIndex((h) => h.includes('city'));
    const stateIndex = headerCols.findIndex((h) => h.includes('state'));
    const pinIndex = headerCols.findIndex((h) => h.includes('pin'));
    const schemeIndex = headerCols.findIndex((h) => h.includes('type') || h.includes('scheme'));

    const hasNamedHeader = gstinIndex !== -1;

    const existingGSTINs = new Set(existingClients.map((c) => c.gstin.toUpperCase()));
    const seenInFile = new Set<string>();

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 2 || !cols.some(c => c.length > 0)) continue;

      let file_no = '';
      let gstin = '';
      let firm_name = '';
      let client_name = '';
      let mobile = '';
      let email = '';
      let address = '';
      let city = '';
      let state = '';
      let pin_code = '';
      let gst_type: 'regular' | 'composition' = 'regular';

      if (hasNamedHeader) {
        file_no = fileNoIndex !== -1 ? cols[fileNoIndex] || '' : '';
        gstin = gstinIndex !== -1 ? (cols[gstinIndex] || '').toUpperCase().trim() : '';
        firm_name = firmIndex !== -1 ? cols[firmIndex] || '' : '';
        client_name = nameIndex !== -1 ? cols[nameIndex] || '' : '';
        mobile = mobileIndex !== -1 ? cols[mobileIndex] || '' : '';
        email = emailIndex !== -1 ? cols[emailIndex] || '' : '';
        address = addressIndex !== -1 ? cols[addressIndex] || '' : '';
        city = cityIndex !== -1 ? cols[cityIndex] || '' : '';
        state = stateIndex !== -1 ? cols[stateIndex] || '' : '';
        pin_code = pinIndex !== -1 ? cols[pinIndex] || '' : '';
        if (schemeIndex !== -1 && cols[schemeIndex]?.toLowerCase() === 'composition') {
          gst_type = 'composition';
        }
      } else {
        // Fallback positional
        if (cols[0]?.length <= 10 && !/^[0-9]{2}[A-Z]{5}/.test(cols[0])) {
          file_no = cols[0] || '';
          gstin = (cols[1] || '').toUpperCase().trim();
          firm_name = cols[2] || '';
          client_name = cols[3] || '';
          mobile = cols[4] || '';
          email = cols[5] || '';
          address = cols[6] || '';
          city = cols[7] || '';
          state = cols[8] || '';
          pin_code = cols[9] || '';
          gst_type = cols[10]?.toLowerCase() === 'composition' ? 'composition' : 'regular';
        } else {
          gstin = (cols[0] || '').toUpperCase().trim();
          firm_name = cols[1] || '';
          client_name = cols[2] || '';
          mobile = cols[3] || '';
          email = cols[4] || '';
          address = cols[5] || '';
          city = cols[6] || '';
          state = cols[7] || '';
          pin_code = cols[8] || '';
          gst_type = cols[9]?.toLowerCase() === 'composition' ? 'composition' : 'regular';
        }
      }

      if (!gstin && !firm_name) continue;

      let isValid = true;
      let error = '';

      const val = validateGSTIN(gstin);
      if (!val.isValid) {
        isValid = false;
        error = val.error || 'Invalid GSTIN format';
      } else if (existingGSTINs.has(gstin)) {
        isValid = false;
        error = 'Already exists in Master Database';
      } else if (seenInFile.has(gstin)) {
        isValid = false;
        error = 'Duplicate GSTIN within this CSV';
      } else if (!firm_name || !client_name || !mobile) {
        isValid = false;
        error = 'Missing Firm Name, Client Name, or Mobile';
      }

      if (!state && val.stateName) {
        state = val.stateName;
      }

      if (isValid) {
        seenInFile.add(gstin);
      }

      rows.push({
        rowNum: i + 1,
        file_no,
        gstin,
        firm_name,
        client_name,
        mobile,
        email,
        address,
        city,
        state,
        pin_code,
        gst_type,
        isValid,
        error,
      });
    }

    setParsedRows(rows);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleConfirmImport = () => {
    if (validRows.length === 0) return;

    const toImport = validRows.map((r) => ({
      file_no: r.file_no || undefined,
      gstin: r.gstin,
      firm_name: r.firm_name,
      client_name: r.client_name,
      mobile: r.mobile,
      email: r.email,
      address: r.address,
      city: r.city,
      state: r.state,
      pin_code: r.pin_code,
      gst_type: r.gst_type,
      status: 'active' as const,
    }));

    onImportConfirmed(toImport);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Bulk Import Clients (CSV)</h3>
              <p className="text-xs text-slate-500">
                Upload CSV file with automatic GSTIN checksum and duplicate validation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Top bar with sample download */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-slate-600">
              Need sample formatting? Download the official CSV template.
            </div>
            <button
              onClick={downloadSampleCSV}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-100"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl p-6 text-center bg-slate-50/50 transition-colors">
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <div className="font-bold text-slate-800 text-sm mb-1">
              Select or Drop your Client CSV File
            </div>
            <p className="text-slate-500 text-xs mb-3">
              Supports .csv files up to 10,000 records
            </p>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="csv-file-input"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl cursor-pointer shadow-xs"
            >
              Choose File
            </label>
            {fileName && (
              <div className="mt-2 text-xs font-mono font-bold text-blue-700">
                Selected: {fileName}
              </div>
            )}
          </div>

          {/* Validation Results */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 font-bold">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{validRows.length} Valid Records</span>
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="text-rose-700 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{invalidRows.length} Errors / Duplicates</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Errors list if any */}
              {invalidRows.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 max-h-32 overflow-y-auto">
                  <strong className="block text-rose-900 mb-1">
                    Skipped Rows (will not be imported):
                  </strong>
                  <ul className="space-y-1 text-rose-800">
                    {invalidRows.map((r, idx) => (
                      <li key={idx}>
                        Row {r.rowNum}: <strong>{r.gstin || 'Empty'}</strong> ({r.firm_name}) —{' '}
                        {r.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Valid preview table */}
              {validRows.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-2">GSTIN</th>
                        <th className="px-3 py-2">Firm Name</th>
                        <th className="px-3 py-2">Contact</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Scheme</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validRows.slice(0, 10).map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-3 py-1.5 font-mono font-bold text-slate-900">{r.gstin}</td>
                          <td className="px-3 py-1.5 font-semibold text-slate-800">{r.firm_name}</td>
                          <td className="px-3 py-1.5 text-slate-600">{r.client_name}</td>
                          <td className="px-3 py-1.5 text-slate-600">{r.mobile}</td>
                          <td className="px-3 py-1.5 uppercase font-bold text-[10px] text-blue-700">
                            {r.gst_type}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validRows.length > 10 && (
                    <div className="p-2 text-center text-slate-400 bg-slate-50 text-[11px]">
                      ...and {validRows.length - 10} more valid records.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
          >
            Cancel
          </button>
          <button
            id="csv-confirm-import-btn"
            type="button"
            disabled={validRows.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold shadow-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Import {validRows.length} Valid Clients</span>
          </button>
        </div>
      </div>
    </div>
  );
};
