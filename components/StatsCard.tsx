import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon: string;
  color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, trend, icon, color = "text-cyan-400" }) => {
  return (
    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
      <div className={`absolute top-0 right-0 p-4 opacity-20 ${color} transform group-hover:scale-110 transition-transform`}>
        <span className="material-icons text-6xl">{icon}</span>
      </div>
      <div className="relative z-10">
        <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">{title}</h3>
        <div className="text-3xl font-bold text-white font-mono">{value}</div>
        {trend && (
          <div className="mt-2 text-xs text-emerald-400 flex items-center">
            <span className="material-icons text-[14px] mr-1">trending_up</span>
            {trend}
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
};