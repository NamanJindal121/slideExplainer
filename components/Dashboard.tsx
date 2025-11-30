import React, { useEffect, useState } from 'react';
import { Plus, Clock, FileText, ChevronRight, Trash2, LogOut, Search, Lock } from 'lucide-react';
import { Presentation, User } from '../types';
import { getPresentations, deletePresentation } from '../services/storageService';

interface DashboardProps {
  user: User;
  onNew: () => void;
  onOpen: (presentation: Presentation) => void;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNew, onOpen, onLogout }) => {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPresentations();
  }, []);

  const loadPresentations = async () => {
    try {
      const data = await getPresentations();
      setPresentations(data);
    } catch (error) {
      console.error("Failed to load presentations", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this presentation?')) {
      await deletePresentation(id);
      await loadPresentations();
    }
  };

  const filtered = presentations.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    // CHANGE 1: 'h-screen' locks height, 'overflow-hidden' prevents window scrollbars
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      
      {/* Header - We removed 'sticky' because the header is now physically separated from the scrolling area */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-600 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">SlideLens AI</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-100 rounded-full">
              <div className="w-8 h-8 rounded-full bg-brand-200 flex items-center justify-center text-brand-700 font-bold border-2 border-white">
                {user.name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-slate-700 pr-2">{user.name}</span>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* CHANGE 2: 'overflow-y-auto' makes ONLY this section scrollable */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Your Presentations</h2>
              <p className="text-slate-500">Manage your analyzed documents</p>
            </div>
            <button 
              onClick={onNew}
              className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-brand-600/20 transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              New Analysis
            </button>
          </div>

          {/* Search */}
          <div className="mb-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search presentations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-shadow shadow-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">No presentations yet</h3>
              <p className="text-slate-500 mb-6">Upload a PDF to get started with AI analysis.</p>
              <button 
                onClick={onNew}
                className="text-brand-600 font-medium hover:underline"
              >
                Start new analysis
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item) => {
                const isOwner = item.authorId === user.id;

                return (
                  <div 
                    key={item.id}
                    onClick={() => onOpen(item)}
                    className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-brand-200 transition-all duration-300 cursor-pointer flex flex-col h-full"
                  >
                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                      <img 
                        src={item.thumbnailUrl} 
                        alt={item.title}
                        className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                      />
                      {!isOwner && (
                         <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full font-medium border border-white/20">
                           Community
                         </div>
                      )}
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-brand-600 transition-colors">
                        {item.title}
                      </h3>
                      
                      {/* Author Info */}
                      <div className="flex items-center gap-2 mb-4">
                         {item.authorPhoto ? (
                           <img src={item.authorPhoto} alt="Author" className="w-5 h-5 rounded-full border border-gray-200" />
                         ) : (
                           <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-[10px] font-bold">
                             {(item.authorName || '?').charAt(0)}
                           </div>
                         )}
                         <span className="text-xs text-slate-500 font-medium">
                           {isOwner ? 'You' : item.authorName}
                         </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-auto">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(item.lastModified).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          {item.slideCount} slides
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-brand-500" 
                               style={{ width: `${(item.slides.filter(s => s.status === 'SUCCESS').length / item.slides.length) * 100}%` }}
                             />
                           </div>
                           <span className="text-[10px] text-slate-400 font-medium">
                             {Math.round((item.slides.filter(s => s.status === 'SUCCESS').length / item.slides.length) * 100)}%
                           </span>
                        </div>
                        
                        {isOwner ? (
                          <button 
                            onClick={(e) => handleDelete(e, item.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="p-2 text-slate-300" title="You can view and analyze, but cannot delete">
                            <Lock className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};