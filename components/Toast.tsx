import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'border-cyan-500 bg-cyan-950/90 text-cyan-400',
    error: 'border-red-500 bg-red-950/90 text-red-400',
    info: 'border-slate-500 bg-slate-950/90 text-slate-300'
  };

  const icons = {
    success: 'check_circle',
    error: 'warning',
    info: 'info'
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-lg border ${colors[type]} backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-in slide-in-from-right fade-in duration-300`}>
      <span className="material-icons text-lg">
        {icons[type]}
      </span>
      <span className="font-mono text-sm">{message}</span>
    </div>
  );
};