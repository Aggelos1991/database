import React, { useState } from 'react';
import { DocType, Entity } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, meta: { vendor: string; entity: Entity; year: number; month: number; type: DocType; fileData: string }) => void;
  autofill: (filename: string) => { vendor: string; entity: Entity; year: number; month: number };
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload, autofill }) => {
  const [file, setFile] = useState<File | null>(null);
  const [vendor, setVendor] = useState('');
  const [entity, setEntity] = useState<Entity>(Entity.UNKNOWN);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(1);
  const [type, setType] = useState<DocType>(DocType.STATEMENT);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const auto = autofill(selectedFile.name);
      setVendor(auto.vendor);
      setEntity(auto.entity);
      setYear(auto.year);
      setMonth(auto.month);
    }
  };

  const handleSubmit = () => {
    if (file && vendor) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = e.target?.result as string;
        onUpload(file, { vendor, entity, year, month, type, fileData });
        onClose();
        setFile(null);
        setVendor('');
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg p-8 rounded-2xl border-t border-cyan-500/30 shadow-2xl shadow-cyan-900/20">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <span className="material-icons text-cyan-400 mr-2">cloud_upload</span>
          Upload Document
        </h2>

        <div className="space-y-4">
          <div className="relative border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-cyan-500/50 transition-colors group">
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
            {file ? (
               <div className="text-cyan-400 font-mono text-sm">{file.name}</div>
            ) : (
              <>
                <span className="material-icons text-4xl text-slate-500 mb-2 group-hover:text-cyan-400 transition-colors">description</span>
                <p className="text-slate-400 text-sm">Drag file here or click to browse</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Vendor</label>
              <input 
                type="text" 
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                placeholder="Vendor Name"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Entity</label>
              <select 
                value={entity}
                onChange={(e) => setEntity(e.target.value as Entity)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none appearance-none"
              >
                {Object.values(Entity).map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Year</label>
              <input 
                type="number" 
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Month</label>
              <select 
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(0, m-1).toLocaleString('default', { month: 'short' })}</option>
                ))}
              </select>
            </div>
             <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Type</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value as DocType)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                {Object.values(DocType).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button 
              onClick={handleSubmit}
              disabled={!file}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload Sequence
            </button>
        </div>
      </div>
    </div>
  );
};