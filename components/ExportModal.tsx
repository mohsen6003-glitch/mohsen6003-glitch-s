import React, { useState, useEffect } from 'react';
import { X, Check, Download, FileDown, FileText, CheckSquare, Square } from 'lucide-react';

interface Column {
    id: string;
    label: string;
}

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (selectedIds: string[]) => void;
    columns: Column[];
    title: string;
    type: 'csv' | 'pdf';
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, columns, title, type }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(columns.map(c => c.id));
        }
    }, [isOpen, columns]);

    const toggleColumn = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) 
                ? prev.filter(c => c !== id) 
                : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === columns.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(columns.map(c => c.id));
        }
    };

    const handleConfirm = () => {
        onExport(selectedIds);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {type === 'csv' ? <Download className="text-emerald-600 dark:text-emerald-400" size={20}/> : <FileDown className="text-red-600 dark:text-red-400" size={20}/>}
                        <h3 className="font-bold text-slate-800 dark:text-white">تنظیمات خروجی {type === 'csv' ? 'اکسل' : 'PDF'}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors bg-slate-100 dark:bg-slate-800 p-1 rounded-full">
                        <X size={20}/>
                    </button>
                </div>
                
                <div className="p-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">لطفاً ستون‌هایی که می‌خواهید در فایل خروجی نمایش داده شوند را انتخاب کنید:</p>
                    
                    <button 
                        onClick={handleSelectAll}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-1 hover:underline"
                    >
                        {selectedIds.length === columns.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                    </button>

                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {columns.map(col => (
                            <div 
                                key={col.id} 
                                onClick={() => toggleColumn(col.id)}
                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedIds.includes(col.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                            >
                                <span className="text-sm font-medium">{col.label}</span>
                                {selectedIds.includes(col.id) 
                                    ? <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" /> 
                                    : <Square size={18} className="text-slate-300 dark:text-slate-600" />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors"
                    >
                        انصراف
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={selectedIds.length === 0}
                        className={`px-8 py-2.5 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 ${type === 'csv' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'} disabled:opacity-50`}
                    >
                        <FileText size={18}/>
                        دریافت فایل
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;