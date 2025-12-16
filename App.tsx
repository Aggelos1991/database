import React, { useState, useEffect, useMemo } from 'react';
import { Entity, DocType, DocumentRecord, MONTH_MAP, FilterState } from './types';
import { StatsCard } from './components/StatsCard';
import { UploadModal } from './components/UploadModal';
import { EditModal } from './components/EditModal';
import { PreviewModal } from './components/PreviewModal';
import { Toast } from './components/Toast';
import { parseSearchQueryLocal } from './services/searchParser';

// --- Helper Functions ---

const generateMockData = (): DocumentRecord[] => {
  const vendors = ["TESLA ENERGY", "SPACEX LOGISTICS", "NEURALINK SUPPLIES", "BORING CO", "STARLINK SERVICES"];
  const entities = Object.values(Entity);
  const types = Object.values(DocType);
  
  return Array.from({ length: 45 }).map((_, i) => {
    // Spread dates over the last 60 days
    const daysAgo = Math.floor(Math.random() * 60); 
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    return {
      id: `doc-${i}`,
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      entity: entities[Math.floor(Math.random() * entities.length)],
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      type: types[Math.floor(Math.random() * types.length)],
      filename: `INV_${Math.floor(Math.random()*10000)}.pdf`,
      uploadedAt: date.toISOString(),
      size: `${(Math.random() * 5 + 1).toFixed(1)} MB`
    };
  });
};

const smartAutofill = (filename: string) => {
  const cleanName = filename.toLowerCase().replace(/-/g, ' ').replace(/_/g, ' ');
  
  let entity = Entity.UNKNOWN;
  if (cleanName.includes('andal')) entity = Entity.ANDALUSIA;
  else if (cleanName.includes('porto')) entity = Entity.PORTO_PETRO;
  else if (cleanName.includes('marbel')) entity = Entity.MARBELLA;

  // Extract year (assume 20xx)
  const yearMatch = cleanName.match(/20\d{2}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

  // Extract vendor (simple heuristic: first word)
  const vendor = filename.split(/[-_]/)[0].toUpperCase();

  return { vendor, entity, year, month: 1 };
};

const getInitials = (filename: string): string => {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  // Split by common delimiters: space, underscore, dash
  const parts = nameWithoutExt.split(/[\s_\-]+/).filter(Boolean);
  
  if (parts.length === 0) return "DOC";
  
  if (parts.length >= 2) {
    // First letter of first two parts (e.g. Angelos Keramaris -> AK)
    const first = parts[0][0] || "";
    const second = parts[1][0] || "";
    return (first + second).toUpperCase();
  } else {
    // First two letters of the single part (e.g. Invoice -> IN)
    return parts[0].substring(0, 2).toUpperCase();
  }
};

type ViewType = 'dashboard' | 'documents';

// --- Main Component ---

const App: React.FC = () => {
  // State
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [isInitialized, setIsInitialized] = useState(false); // New flag to prevent overwriting storage on init
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterState | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modals & UI State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [isDangerZone, setIsDangerZone] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  // --- Persistence ---
  useEffect(() => {
    const saved = localStorage.getItem('x_ap_docs');
    if (saved) {
      try {
        setDocs(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved docs", e);
        setDocs(generateMockData());
      }
    } else {
      setDocs(generateMockData());
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    // Only save if we have initialized (loaded from storage or generated mock)
    // This prevents saving the initial empty state [] and overwriting data on reload race conditions
    if (isInitialized) {
      try {
        localStorage.setItem('x_ap_docs', JSON.stringify(docs));
      } catch (e) {
        showToast("Storage quota exceeded. Some data may not persist.", "error");
      }
    }
  }, [docs, isInitialized]);

  // --- Derived Data for Filters ---
  const availableYears = useMemo(() => {
    const years = new Set(docs.map(d => d.year));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [docs]);

  // --- Handlers ---

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchQuery.trim()) {
        const filters = parseSearchQueryLocal(searchQuery);
        
        // Clean empty filters
        const cleanFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v != null)
        ) as unknown as FilterState;

        const hasFilters = Object.keys(cleanFilters).length > 0;
        
        if (hasFilters) {
            setActiveFilter(cleanFilters);
            showToast("Smart Filters Applied", "info");
        } else {
            setActiveFilter(null);
            showToast("Searching text only...", "info");
        }
      } else {
          setActiveFilter(null);
      }
      setCurrentPage(1);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setActiveFilter(prev => {
        const base = prev || { 
            vendor: null, entity: null, year: null, month: null, 
            document_type: null, startDate: null, endDate: null 
        };
        const next = { ...base, [key]: value };
        
        // Check if all values are null/empty to potentially reset to null (or keep empty object)
        // Usually keeping the object is fine as filteredDocs handles nulls
        const hasValues = Object.values(next).some(v => v !== null && v !== '');
        return hasValues ? next : null;
    });
    setCurrentPage(1);
  };

  const handleRemoveFilter = (key: keyof FilterState) => {
    if (!activeFilter) return;
    const newFilter = { ...activeFilter };
    delete newFilter[key];
    
    // If removing one date part, remove the other to avoid broken range
    if (key === 'startDate') delete newFilter['endDate'];
    if (key === 'endDate') delete newFilter['startDate'];

    if (Object.keys(newFilter).length === 0) {
        setActiveFilter(null);
    } else {
        setActiveFilter(newFilter);
    }
  };

  const handleDelete = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
    showToast("Document deleted permanently", "error");
  };

  const handleClearAll = () => {
    if (window.confirm("WARNING: This will wipe all data. Confirm protocol override?")) {
      setDocs([]);
      setIsDangerZone(false);
      // We rely on the useEffect to update localStorage to []
      // This ensures that on reload, it reads [] instead of null (which would trigger mock data)
      showToast("System Purged", "error");
    }
  };

  const handleUpload = (file: File, meta: any) => {
    const newDoc: DocumentRecord = {
      id: `doc-${Date.now()}`,
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      ...meta
    };
    setDocs(prev => [newDoc, ...prev]);
    showToast(`Uploaded ${file.name}`, "success");
  };

  const openEdit = (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setIsEditOpen(true);
  };

  const openPreview = (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setIsPreviewOpen(true);
  };

  const downloadDoc = (doc: DocumentRecord) => {
    if (doc.fileData) {
        const link = document.createElement('a');
        link.href = doc.fileData;
        link.download = doc.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Downloading ${doc.filename}`, 'success');
    } else {
        showToast("Mock data cannot be downloaded.", "error");
    }
  };

  const handleUpdate = (id: string, updates: Partial<DocumentRecord>) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    showToast("Record updated successfully", "success");
  };

  // --- Filtering Logic ---

  const filteredDocs = useMemo(() => {
    let result = docs;

    // AI/Structured Filter
    if (activeFilter) {
      if (activeFilter.vendor) {
        result = result.filter(d => d.vendor.toLowerCase().includes(activeFilter.vendor!.toLowerCase()));
      }
      if (activeFilter.entity) {
        result = result.filter(d => d.entity.toLowerCase().includes(activeFilter.entity!.toLowerCase()));
      }
      if (activeFilter.year) {
        result = result.filter(d => d.year === activeFilter.year);
      }
      if (activeFilter.month) {
        result = result.filter(d => d.month === activeFilter.month);
      }
      if (activeFilter.document_type) {
        result = result.filter(d => d.type.toLowerCase() === activeFilter.document_type!.toLowerCase());
      }
      // Date Range Filtering (Inclusive)
      if (activeFilter.startDate) {
        const start = new Date(activeFilter.startDate);
        start.setHours(0,0,0,0);
        result = result.filter(d => {
            const docDate = new Date(d.uploadedAt);
            return docDate >= start;
        });
      }
      if (activeFilter.endDate) {
        const end = new Date(activeFilter.endDate);
        end.setHours(23,59,59,999);
        result = result.filter(d => {
            const docDate = new Date(d.uploadedAt);
            return docDate <= end;
        });
      }
    } 
    // Fallback manual text search if activeFilter is null but text exists
    else if (searchQuery) {
       result = result.filter(d => 
         d.vendor.toLowerCase().includes(searchQuery.toLowerCase()) || 
         d.filename.toLowerCase().includes(searchQuery.toLowerCase())
       );
    }

    return result;
  }, [docs, activeFilter, searchQuery]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  const currentDocs = useMemo(() => {
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    return filteredDocs.slice(indexOfFirst, indexOfLast);
  }, [filteredDocs, currentPage]);

  // Helper to render filter value neatly
  const renderFilterValue = (key: string, value: any) => {
    if (key === 'month') return MONTH_MAP[value];
    if (key === 'startDate' || key === 'endDate') return value; // ISO string
    return value;
  };

  return (
    <div className="min-h-screen flex bg-[#050505] text-slate-200 selection:bg-cyan-500/30">
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* --- Sidebar --- */}
      <aside className="w-64 fixed h-full border-r border-white/5 bg-[#050505] flex flex-col z-20 transition-all duration-300">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
            <span className="text-cyan-400">X</span>-AP
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">V 2.3.0</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'dashboard' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <span className="material-icons text-sm">dashboard</span>
            <span className="text-sm font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => setCurrentView('documents')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'documents' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <span className="material-icons text-sm">folder</span>
            <span className="text-sm font-medium">Documents</span>
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={() => setIsDangerZone(!isDangerZone)}
            className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${isDangerZone ? 'bg-red-500/10 text-red-400' : 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10'}`}
          >
            <span className="material-icons text-sm">warning</span>
            <span className="text-sm font-medium">Danger Zone</span>
          </button>
          
          {isDangerZone && (
             <div className="mt-2 p-3 bg-red-950/30 border border-red-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] text-red-300 mb-2 font-mono uppercase">Irreversible Protocol</p>
                <button 
                  onClick={handleClearAll}
                  className="w-full text-xs font-bold bg-red-600 hover:bg-red-500 text-white py-2 rounded shadow-lg shadow-red-900/40 transition-all hover:scale-[1.02]"
                >
                  WIPE DATABASE
                </button>
             </div>
          )}
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 ml-64 p-8 relative overflow-hidden flex flex-col h-screen">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

        {/* Top Bar */}
        <header className="flex justify-between items-center mb-6 relative z-10 shrink-0">
          <div className="relative w-96">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Try: 'IKOS Andalusia 2024' or 'Tesla June'..."
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-full py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-xl"
            />
            <span className="material-icons absolute left-4 top-3 text-lg text-slate-500 transition-colors">
              filter_alt
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsUploadOpen(true)}
                className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:bg-cyan-50 transition-colors shadow-lg shadow-white/5"
            >
              <span className="material-icons text-sm">add</span>
              UPLOAD
            </button>
          </div>
        </header>

        {/* --- DASHBOARD VIEW COMPONENTS --- */}
        {currentView === 'dashboard' && (
            <div className="grid grid-cols-2 gap-6 mb-8 shrink-0 animate-in fade-in slide-in-from-top-4">
                <StatsCard title="Total Documents" value={docs.length} icon="description" trend="+12% this week" />
                <StatsCard title="Storage Used" value="1.2 GB" icon="cloud_queue" trend="Optimal" />
            </div>
        )}

        {/* Active AI Filters Section */}
        {activeFilter && (
            <div className="flex flex-wrap items-center gap-2 mb-6 animate-in fade-in slide-in-from-top-4 shrink-0">
                <span className="text-sm text-slate-500 mr-2 flex items-center gap-1 font-mono">
                    <span className="material-icons text-sm">filter_list</span>
                    FILTERS:
                </span>
                
                {Object.entries(activeFilter).map(([key, value]) => {
                    // Combine Start/End Date into one chip for cleaner UI
                    if (key === 'endDate') return null; 
                    if (key === 'startDate' && activeFilter.endDate) {
                        return (
                            <div key="date-range" className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 text-sm shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                                <span className="uppercase text-[10px] font-bold opacity-60 tracking-wider text-cyan-200">DATE:</span>
                                <span className="font-medium text-white">{value} → {activeFilter.endDate}</span>
                                <button 
                                    onClick={() => handleRemoveFilter('startDate')} 
                                    className="ml-1 flex items-center justify-center w-4 h-4 rounded-full hover:bg-cyan-500/20 text-cyan-500/70 hover:text-cyan-200 transition-colors"
                                >
                                    <span className="material-icons text-[12px]">close</span>
                                </button>
                            </div>
                        );
                    }
                    if (key === 'startDate' && !activeFilter.endDate) {
                         return (
                            <div key={key} className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 text-sm shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                                <span className="uppercase text-[10px] font-bold opacity-60 tracking-wider text-cyan-200">AFTER:</span>
                                <span className="font-medium text-white">{value}</span>
                                <button 
                                    onClick={() => handleRemoveFilter(key as keyof FilterState)}
                                    className="ml-1 flex items-center justify-center w-4 h-4 rounded-full hover:bg-cyan-500/20 text-cyan-500/70 hover:text-cyan-200 transition-colors"
                                >
                                    <span className="material-icons text-[12px]">close</span>
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div key={key} className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 text-sm shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                            <span className="uppercase text-[10px] font-bold opacity-60 tracking-wider text-cyan-200">{key.replace('_', ' ')}:</span>
                            <span className="font-medium text-white">{renderFilterValue(key, value)}</span>
                            <button 
                                onClick={() => handleRemoveFilter(key as keyof FilterState)}
                                className="ml-1 flex items-center justify-center w-4 h-4 rounded-full hover:bg-cyan-500/20 text-cyan-500/70 hover:text-cyan-200 transition-colors"
                            >
                                <span className="material-icons text-[12px]">close</span>
                            </button>
                        </div>
                    );
                })}

                <div className="w-px h-6 bg-white/10 mx-2"></div>
                <button 
                    onClick={() => { setActiveFilter(null); setSearchQuery(''); }}
                    className="text-xs text-slate-500 hover:text-red-400 font-medium transition-colors flex items-center gap-1"
                >
                    <span className="material-icons text-[14px]">delete_sweep</span>
                    CLEAR ALL
                </button>
            </div>
        )}

        {/* Content Area */}
        <div className="flex gap-6 flex-1 min-h-0">
            {/* DOCUMENTS LIST */}
            <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
                    <div className="flex justify-between items-end mb-4 shrink-0">
                    <div>
                        <h2 className="text-xl font-semibold text-white">
                            {currentView === 'dashboard' ? 'Recent Activity' : 'Document Library'}
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Showing {currentDocs.length} of {filteredDocs.length} items</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* Filters */}
                        <div className="flex items-center gap-2">
                             <select 
                                value={activeFilter?.entity || ''}
                                onChange={(e) => handleFilterChange('entity', e.target.value || null)}
                                className="bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer max-w-[200px]"
                             >
                                <option value="">Entity: All</option>
                                {Object.values(Entity).map(e => (
                                    <option key={e} value={e}>{e}</option>
                                ))}
                             </select>

                             <select 
                                value={activeFilter?.year || ''}
                                onChange={(e) => handleFilterChange('year', e.target.value ? parseInt(e.target.value) : null)}
                                className="bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                             >
                                <option value="">Year: All</option>
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                             </select>

                             <select 
                                value={activeFilter?.month || ''}
                                onChange={(e) => handleFilterChange('month', e.target.value ? parseInt(e.target.value) : null)}
                                className="bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                             >
                                <option value="">Month: All</option>
                                {Object.entries(MONTH_MAP).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                             </select>

                             <select 
                                value={activeFilter?.document_type || ''}
                                onChange={(e) => handleFilterChange('document_type', e.target.value || null)}
                                className="bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                             >
                                <option value="">Type: All</option>
                                {Object.values(DocType).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                             </select>
                        </div>

                        <div className="h-6 w-px bg-white/10"></div>

                        {/* View Mode Toggles */}
                        <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-white/10">
                            <button 
                                onClick={() => setViewMode('table')}
                                className={`px-3 py-1.5 rounded-md flex items-center transition-all ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                <span className="material-icons text-sm">table_rows</span>
                            </button>
                            <button 
                                onClick={() => setViewMode('card')}
                                className={`px-3 py-1.5 rounded-md flex items-center transition-all ${viewMode === 'card' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                <span className="material-icons text-sm">grid_view</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredDocs.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl">
                            <span className="material-icons text-4xl text-slate-700 mb-2">search_off</span>
                            <p className="text-slate-500">No signals found matching parameters.</p>
                        </div>
                    ) : viewMode === 'table' ? (
                        <div className="glass-panel rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-white/5 text-slate-200 uppercase text-xs font-medium tracking-wider sticky top-0 bg-[#0f172a] z-10 shadow-md">
                                    <tr>
                                        <th className="px-6 py-4">Vendor</th>
                                        <th className="px-6 py-4">Entity</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {currentDocs.map(doc => (
                                        <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-white">{doc.vendor}</td>
                                            <td className="px-6 py-4">{doc.entity}</td>
                                            <td className="px-6 py-4">{MONTH_MAP[doc.month]} {doc.year}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded text-xs bg-slate-800 border border-slate-700 text-slate-300">
                                                    {doc.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button onClick={() => openPreview(doc)} className="text-slate-600 hover:text-cyan-400 transition-colors" title="Preview">
                                                    <span className="material-icons text-sm">visibility</span>
                                                </button>
                                                <button onClick={() => downloadDoc(doc)} className="text-slate-600 hover:text-emerald-400 transition-colors" title="Download">
                                                    <span className="material-icons text-sm">download</span>
                                                </button>
                                                <button onClick={() => openEdit(doc)} className="text-slate-600 hover:text-white transition-colors" title="Edit">
                                                    <span className="material-icons text-sm">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(doc.id)} className="text-slate-600 hover:text-red-400 transition-colors" title="Delete">
                                                    <span className="material-icons text-sm">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {currentDocs.map(doc => (
                                <div key={doc.id} className="glass-panel p-5 rounded-xl border border-white/5 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all group relative">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-8 h-8 rounded bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-xs font-bold text-cyan-400 border border-white/10">
                                            {getInitials(doc.filename)}
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-mono">{doc.size}</span>
                                    </div>
                                    <h3 className="text-white font-medium truncate mb-1" title={doc.vendor}>{doc.vendor}</h3>
                                    <p className="text-xs text-slate-500 mb-4 truncate">{doc.filename}</p>
                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                                        <span className="text-xs text-slate-400">{MONTH_MAP[doc.month]} {doc.year}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => openPreview(doc)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-cyan-500/20 text-slate-600 hover:text-cyan-400 transition-colors">
                                                <span className="material-icons text-[14px]">visibility</span>
                                            </button>
                                            <button onClick={() => downloadDoc(doc)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-emerald-500/20 text-slate-600 hover:text-emerald-400 transition-colors">
                                                <span className="material-icons text-[14px]">download</span>
                                            </button>
                                            <button onClick={() => openEdit(doc)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-600 hover:text-white transition-colors">
                                                <span className="material-icons text-[14px]">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(doc.id)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors">
                                                <span className="material-icons text-[14px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                    {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-6 shrink-0">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <span className="material-icons text-sm">chevron_left</span>
                        </button>
                        <span className="text-xs text-slate-500 font-mono">Page {currentPage} / {totalPages}</span>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <span className="material-icons text-sm">chevron_right</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
      </main>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onUpload={handleUpload}
        autofill={smartAutofill}
      />

      <EditModal 
        isOpen={isEditOpen}
        doc={selectedDoc}
        onClose={() => setIsEditOpen(false)}
        onSave={handleUpdate}
      />

      <PreviewModal
        isOpen={isPreviewOpen}
        doc={selectedDoc}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

export default App;