import { ClientGstTurnover, FY_MONTHS } from '../types';

export const initialGstTurnover: ClientGstTurnover[] = [
  // Client 101 - Apex Infotech Solutions (FY 2026-27 - FY ID 3 or matched by FY ID)
  // We'll generate realistic patterns for standard clients
  ...FY_MONTHS.map((month, index) => {
    const taxableMultipliers = [450000, 520000, 480000, 610000, 590000, 640000, 720000, 680000, 850000, 540000, 580000, 920000];
    const exemptMultipliers = [50000, 60000, 40000, 75000, 80000, 60000, 90000, 70000, 110000, 60000, 50000, 120000];
    const taxable = taxableMultipliers[index];
    const exempt = exemptMultipliers[index];
    return {
      id: 2000 + index + 1,
      client_id: 101,
      financial_year_id: 3, // 2026-27
      month,
      taxable_turnover: taxable,
      exempt_turnover: exempt,
      total_gst_turnover: taxable + exempt,
      created_at: '2026-04-01 10:00:00',
      updated_at: '2026-04-01 10:00:00',
    };
  }),

  // Client 101 - Apex Infotech Solutions (FY 2025-26 - FY ID 2)
  ...FY_MONTHS.map((month, index) => {
    const taxableMultipliers = [380000, 410000, 450000, 510000, 490000, 530000, 600000, 580000, 720000, 490000, 510000, 780000];
    const exemptMultipliers = [40000, 45000, 35000, 50000, 60000, 50000, 70000, 60000, 80000, 45000, 40000, 90000];
    const taxable = taxableMultipliers[index];
    const exempt = exemptMultipliers[index];
    return {
      id: 2100 + index + 1,
      client_id: 101,
      financial_year_id: 2, // 2025-26
      month,
      taxable_turnover: taxable,
      exempt_turnover: exempt,
      total_gst_turnover: taxable + exempt,
      created_at: '2025-04-01 10:00:00',
      updated_at: '2025-04-01 10:00:00',
    };
  }),

  // Client 102 - Bharat Chemical & Fertilizers (FY 2026-27 - FY ID 3)
  ...FY_MONTHS.map((month, index) => {
    const taxableMultipliers = [1250000, 1420000, 1380000, 1650000, 1580000, 1720000, 1950000, 1820000, 2100000, 1490000, 1620000, 2350000];
    const exemptMultipliers = [180000, 210000, 190000, 240000, 230000, 250000, 280000, 260000, 310000, 220000, 240000, 350000];
    const taxable = taxableMultipliers[index];
    const exempt = exemptMultipliers[index];
    return {
      id: 2200 + index + 1,
      client_id: 102,
      financial_year_id: 3, // 2026-27
      month,
      taxable_turnover: taxable,
      exempt_turnover: exempt,
      total_gst_turnover: taxable + exempt,
      created_at: '2026-04-01 11:00:00',
      updated_at: '2026-04-01 11:00:00',
    };
  }),

  // Client 103 - Shree Ganesh Kirana Store (FY 2026-27 - FY ID 3)
  ...FY_MONTHS.map((month, index) => {
    const taxableMultipliers = [180000, 210000, 195000, 240000, 225000, 250000, 310000, 280000, 360000, 220000, 230000, 390000];
    const exemptMultipliers = [90000, 110000, 95000, 120000, 115000, 130000, 160000, 140000, 180000, 110000, 115000, 200000];
    const taxable = taxableMultipliers[index];
    const exempt = exemptMultipliers[index];
    return {
      id: 2300 + index + 1,
      client_id: 103,
      financial_year_id: 3, // 2026-27
      month,
      taxable_turnover: taxable,
      exempt_turnover: exempt,
      total_gst_turnover: taxable + exempt,
      created_at: '2026-04-01 11:15:00',
      updated_at: '2026-04-01 11:15:00',
    };
  }),

  // Client 104 - Zenith Logistics & Transport (FY 2026-27 - FY ID 3)
  ...FY_MONTHS.map((month, index) => {
    const taxableMultipliers = [850000, 920000, 890000, 1050000, 980000, 1120000, 1250000, 1180000, 1420000, 990000, 1050000, 1580000];
    const exemptMultipliers = [40000, 50000, 45000, 60000, 55000, 65000, 75000, 70000, 90000, 55000, 60000, 110000];
    const taxable = taxableMultipliers[index];
    const exempt = exemptMultipliers[index];
    return {
      id: 2400 + index + 1,
      client_id: 104,
      financial_year_id: 3, // 2026-27
      month,
      taxable_turnover: taxable,
      exempt_turnover: exempt,
      total_gst_turnover: taxable + exempt,
      created_at: '2026-04-01 11:30:00',
      updated_at: '2026-04-01 11:30:00',
    };
  }),
];
