import React from 'react';
import { DocumentRecord } from '../types';

interface PreviewModalProps {
  isOpen: boolean;
  doc: DocumentRecord | null;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, doc, onClose }) => {
  if (!isOpen || !doc) return null;

  const isImage = doc.filename.match(/\.(jpeg|jpg|png|gif)$/i);
  const isPdf = doc.filename.match(/\.pdf$/i);
  const hasData = !!doc.fileData;

  const handleDownload = () => {
    if (!doc.fileData) return;
    const link = document.createElement('a');
    link.href = doc.fileData;
    link.download = doc.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="glass-panel w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-900/30 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-cyan-400">
               <span className="material-icons">{isImage ? 'image' : isPdf ? 'picture_as_pdf' : 'description'}</span>
            </div>
            <div>
              <h3 className="text-white font-medium">{doc.filename}</h3>
              <p className="text-xs text-slate-500">{doc.vendor} • {doc.size}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {hasData && (
                <button 
                  onClick={handleDownload}
                  className="p-2 hover:bg-cyan-500/20 rounded-full text-cyan-400 transition-colors"
                  title="Download"
                >
                  <span className="material-icons">download</span>
                </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#050505] relative overflow-hidden flex items-center justify-center">
            {hasData ? (
                <>
                    {isImage && (
                        <img src={doc.fileData} alt="Preview" className="max-w-full max-h-full object-contain" />
                    )}
                    {isPdf && (
                        <iframe src={doc.fileData} className="w-full h-full border-none" title="PDF Preview" />
                    )}
                    {!isImage && !isPdf && (
                        <div className="text-center">
                            <span className="material-icons text-6xl text-slate-700 mb-4">do_not_disturb</span>
                            <p className="text-slate-500">Preview not available for this file type.</p>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center p-8">
                    <span className="material-icons text-6xl text-slate-800 mb-4">cloud_off</span>
                    <p className="text-slate-400 font-mono">MOCK DATA RECORD</p>
                    <p className="text-xs text-slate-600 mt-2">No actual file data associated with this generated record.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};