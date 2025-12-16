import { FilterState, Entity, DocType } from '../types';

export const parseSearchQueryLocal = (query: string): FilterState => {
  const lowerQuery = query.toLowerCase();
  const filters: FilterState = {
    vendor: null,
    entity: null,
    year: null,
    month: null,
    document_type: null,
    startDate: null,
    endDate: null
  };

  // 1. Parse Entity
  // Check specific ones first to avoid partial matches
  if (lowerQuery.includes('andal')) filters.entity = Entity.ANDALUSIA;
  else if (lowerQuery.includes('porto') || lowerQuery.includes('petro')) {
      if (lowerQuery.includes('holdco')) filters.entity = Entity.PORTO_PETRO_HOLDCO;
      else filters.entity = Entity.PORTO_PETRO;
  }
  else if (lowerQuery.includes('marbel')) {
       if (lowerQuery.includes('holdco')) filters.entity = Entity.MARBELLA_HOLDCO;
       else filters.entity = Entity.MARBELLA;
  }
  else if (lowerQuery.includes('shm') || lowerQuery.includes('spanish') || lowerQuery.includes('management')) filters.entity = Entity.SHM;

  // 2. Parse Year (2000-2099)
  const yearMatch = query.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1]);
    if (y >= 2000 && y <= 2100) {
        filters.year = y;
    }
  }

  // 3. Parse Month
  const months = [
    { name: 'january', short: 'jan', val: 1 },
    { name: 'february', short: 'feb', val: 2 },
    { name: 'march', short: 'mar', val: 3 },
    { name: 'april', short: 'apr', val: 4 },
    { name: 'may', short: 'may', val: 5 },
    { name: 'june', short: 'jun', val: 6 },
    { name: 'july', short: 'jul', val: 7 },
    { name: 'august', short: 'aug', val: 8 },
    { name: 'september', short: 'sep', val: 9 },
    { name: 'october', short: 'oct', val: 10 },
    { name: 'november', short: 'nov', val: 11 },
    { name: 'december', short: 'dec', val: 12 }
  ];

  for (const m of months) {
    // Match full name or short name with word boundaries
    const regex = new RegExp(`\\b(${m.name}|${m.short})\\b`, 'i');
    if (regex.test(query)) {
        filters.month = m.val;
        break; // Assume one month per query
    }
  }

  // 4. Parse Document Type
  const docTypes = Object.values(DocType);
  for (const t of docTypes) {
      if (lowerQuery.includes(t.toLowerCase())) {
          filters.document_type = t;
          break;
      }
  }
  // Heuristics for doc types
  if (!filters.document_type) {
      if (lowerQuery.includes('statement')) filters.document_type = DocType.STATEMENT;
      if (lowerQuery.includes('invoice')) filters.document_type = DocType.INVOICE;
      if (lowerQuery.includes('credit')) filters.document_type = DocType.CREDIT_NOTE;
      if (lowerQuery.includes('payment')) filters.document_type = DocType.PAYMENT_PROOF;
      if (lowerQuery.includes('email')) filters.document_type = DocType.EMAIL;
  }

  // 5. Vendor Extraction
  // Strategy: Remove matched entities, years, months, types, and stopwords.
  // The remainder is likely the vendor.
  let remaining = query;

  // Remove Year
  if (filters.year) remaining = remaining.replace(filters.year.toString(), '');

  // Remove Entity keywords
  const entityKeywords = ['andalusia', 'andal', 'porto', 'petro', 'marbella', 'marbel', 'shm', 'spanish', 'holdco', 'management', 'ikos'];
  entityKeywords.forEach(k => {
      remaining = remaining.replace(new RegExp(`\\b${k}\\b`, 'gi'), '');
  });

  // Remove Month
  if (filters.month) {
      const m = months[filters.month - 1];
      remaining = remaining.replace(new RegExp(`\\b${m.name}\\b`, 'gi'), '');
      remaining = remaining.replace(new RegExp(`\\b${m.short}\\b`, 'gi'), '');
  }

  // Remove Doc Type strings
  if (filters.document_type) {
       remaining = remaining.replace(new RegExp(`\\b${filters.document_type}\\b`, 'gi'), '');
  }
  // Generic doc type words and plurals
  ['statement', 'statements', 'invoice', 'invoices', 'credit note', 'payment', 'proof', 'email', 'emails', 'spreadsheet', 'spreadsheets'].forEach(w => {
      remaining = remaining.replace(new RegExp(`\\b${w}\\b`, 'gi'), '');
  });

  // Remove stopwords
  ['per', 'for', 'in', 'dated', 'from', 'to', 'of', 'and', 'with'].forEach(w => {
       remaining = remaining.replace(new RegExp(`\\b${w}\\b`, 'gi'), '');
  });

  // Clean up
  const cleanVendor = remaining.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  
  if (cleanVendor.length > 1) {
      filters.vendor = cleanVendor;
  }

  return filters;
};