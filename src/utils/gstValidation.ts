// Indian GSTIN regex: 2 digits (State Code) + 5 letters (PAN) + 4 digits + 1 letter + 1 entity code + 'Z' + 1 checksum
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

export function validateGSTIN(gstin: string): { isValid: boolean; stateName?: string; error?: string } {
  if (!gstin) {
    return { isValid: false, error: 'GSTIN is required' };
  }
  const cleanGSTIN = gstin.trim().toUpperCase();
  if (cleanGSTIN.length !== 15) {
    return { isValid: false, error: 'GSTIN must be exactly 15 characters long' };
  }
  if (!GSTIN_REGEX.test(cleanGSTIN)) {
    return {
      isValid: false,
      error: 'Invalid GSTIN format. Expected pattern: 2 State Digits + 10 PAN Digits/Letters + 1 Entity + Z + 1 Checksum (e.g. 27AAAAA0000A1Z5)',
    };
  }
  const stateCode = cleanGSTIN.substring(0, 2);
  const stateName = STATE_CODES[stateCode] || 'Unknown State';
  return { isValid: true, stateName };
}

export function getStateFromGSTIN(gstin: string): string {
  if (!gstin || gstin.length < 2) return '';
  const code = gstin.trim().substring(0, 2);
  return STATE_CODES[code] || '';
}

export const COMMON_REMARKS = [
  'Bill अभी प्राप्त नहीं हुआ।',
  'Client ने tax payment नहीं किया है।',
  'Documents अभी pending हैं।',
  'Client से confirmation बाकी है।',
  'Bank statement pending from client.',
  'Sales invoices incomplete for this month.',
  'Challan generated, awaiting client payment confirmation.',
  'GSTR-3B filed successfully. ARN generated.',
  'GSTR-1 filed on time.',
  'Data verified, ready for return filing.',
];
