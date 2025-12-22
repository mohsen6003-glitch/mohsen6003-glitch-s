
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
            // Select all by default when opening
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
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {type === 'csv' ? <Download className="text-emerald-600" size={20}/> : <FileDown className="text-red-600" size={20}/>}
                        <h3 className="font-bold text-slate-800">تنظیمات خروجی {type === 'csv' ? 'اکسل' : 'PDF'}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X size={20}/>
                    </button>
                </div>
                
                <div className="p-4">
                    <p className="text-sm text-slate-600 mb-4">لطفاً ستون‌هایی که می‌خواهید در فایل خروجی نمایش داده شوند را انتخاب کنید:</p>
                    
                    <button 
                        onClick={handleSelectAll}
                        className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-1 hover:underline"
                    >
                        {selectedIds.length === columns.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                    </button>

                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {columns.map(col => (
                            <div 
                                key={col.id} 
                                onClick={() => toggleColumn(col.id)}
                                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${selectedIds.includes(col.id) ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                {selectedIds.includes(col.id) 
                                    ? <CheckSquare size={16} className="text-blue-600 flex-shrink-0" /> 
                                    : <Square size={16} className="text-slate-300 flex-shrink-0" />}
                                <span className="text-sm font-medium truncate">{col.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        انصراف
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={selectedIds.length === 0}
                        className={`px-6 py-2 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${type === 'csv' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}
                    >
                        {type === 'csv' ? <FileText size={16}/> : <FileDown size={16}/>}
                        دریافت فایل
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
