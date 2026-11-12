import React from 'react';
import { History, X } from 'lucide-react';

interface LoginHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: { username: string; timestamp: number }[];
}

export const LoginHistoryModal: React.FC<LoginHistoryModalProps> = ({ isOpen, onClose, history }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#16221F] w-full max-w-lg rounded-2xl shadow-2xl border border-[#D5E2DC] dark:border-[#2A3B37] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-[#D5E2DC] dark:border-[#2A3B37]">
          <h2 className="text-lg font-serif font-bold text-[#0F4C3A] dark:text-[#E7EFEC] flex items-center gap-2">
            <History className="w-5 h-5" />
            Login History Log
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5 text-[#5B6B70]" />
          </button>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs uppercase text-[#5B6B70] border-b border-[#D5E2DC] dark:border-[#2A3B37]">
                <th className="pb-2">Username</th>
                <th className="pb-2 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3ECE7] dark:divide-[#273B35]">
              {history.map((log, i) => (
                <tr key={i}>
                  <td className="py-3 font-semibold text-[#162521] dark:text-[#E7EFEC]">{log.username}</td>
                  <td className="py-3 text-right text-[#5B6B70] dark:text-[#9DB0AA] font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
