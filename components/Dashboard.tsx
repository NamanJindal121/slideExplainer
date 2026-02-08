import React, { useEffect, useState } from 'react';
import { Plus, Clock, FileText, ChevronRight, Trash2, LogOut, Search, Lock,
  Folder as FolderIcon,
  FolderPlus,
  ArrowBigLeft,
  Move
} from 'lucide-react';
import { Presentation, User, Folder } from '../types';
import { getPresentations, deletePresentation, createFolder, getFolders, deleteFolder, updatePresentationFolder } from '../services/storageService';

interface DashboardProps {
  user: User;
  onNew: (folderId?: string) => void;
  onOpen: (presentation: Presentation) => void;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNew, onOpen, onLogout }) => {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [isMovingItem, setIsMovingItem] = useState<string | null>(null); // Presentation ID to move

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pData, fData] = await Promise.all([
        getPresentations(),
        getFolders()
      ]);
      setPresentations(pData);
      setFolders(fData);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this presentation?')) {
      await deletePresentation(id);
      await loadData();
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName);
      setNewFolderName('');
      setIsCreatingFolder(false);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this folder? Items inside will be moved to Main Dashboard.')) {
      await deleteFolder(id);
      await loadData();
    }
  };

  const handleMove = async (folderId: string | null) => {
    if (!isMovingItem) return;
    await updatePresentationFolder(isMovingItem, folderId);
    setIsMovingItem(null);
    await loadData();
  };

  // Filter Logic
  // 1. Search works comfortably across EVERYTHING if searching
  // 2. If not searching, strictly respect folders
  const filteredPresentations = presentations.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    if (searchTerm) return matchesSearch;
    
    // Strict folder match logic
    if (currentFolderId) {
        return p.folderId === currentFolderId;
    } else {
        // Root: Show items with no folder OR explicitly null folder
        return !p.folderId;
    }
  });

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentFolder = folders.find(f => f.id === currentFolderId);

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

      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-full flex flex-col">
          <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              {currentFolderId ? (
                <div className="flex items-center gap-2 mb-1 text-slate-500 text-sm">
                  <button onClick={() => setCurrentFolderId(null)} className="hover:text-brand-600">Home</button>
                  <ChevronRight className="w-4 h-4" />
                  <span className="font-bold text-slate-800">{currentFolder?.name}</span>
                </div>
              ) : (
                <div className="text-2xl font-bold text-slate-900">Your Library</div>
              )}
              <p className="text-slate-500">Manage your analyzed documents and folders</p>
            </div>
            
            <div className="flex gap-2">
                {!currentFolderId && (
                  <button 
                  onClick={() => setIsCreatingFolder(true)}
                  className="flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-4 py-3 rounded-xl font-medium transition-colors"
                >
                  <FolderPlus className="w-5 h-5" />
                  New Folder
                </button>
                )}
                <button 
                  onClick={() => onNew(currentFolderId || undefined)}
                  className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-brand-600/20 transition-all hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  New Analysis
                </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search folders and presentations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-shadow shadow-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-8">
                {/* Folders Section */}
                {(!currentFolderId || searchTerm) && filteredFolders.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filteredFolders.map(folder => (
                             <div 
                                key={folder.id}
                                onClick={() => setCurrentFolderId(folder.id)}
                                className="group bg-blue-50/50 border border-blue-100 p-4 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all flex flex-col justify-between h-32 relative"
                             >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => handleDeleteFolder(e, folder.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <FolderIcon className="w-8 h-8 text-brand-500 mb-2" />
                                <div>
                                    <h4 className="font-semibold text-slate-700 text-sm truncate" title={folder.name}>{folder.name}</h4>
                                    <p className="text-xs text-slate-400">{presentations.filter(p => p.folderId === folder.id).length} items</p>
                                </div>
                             </div>
                        ))}
                    </div>
                )}
                
                {/* Presentations Grid */}
                {filteredPresentations.length === 0 && filteredFolders.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-1">No items found</h3>
                        <p className="text-slate-500 mb-6">Upload a PDF or create a folder to get started.</p>
                        </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPresentations.map((item) => {
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
                                
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    {isOwner && (
                                        <>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setIsMovingItem(item.id); }}
                                                className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                                title="Move to Folder"
                                            >
                                                <Move className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(e, item.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            </div>
                        </div>
                        );
                    })}
                    </div>
                )}
            </div>
          )}
        </div>
        <div className="mt-auto pt-6 border-t border-gray-100 text-center">
            <p className="text-slate-400 text-sm font-medium flex items-center justify-center gap-1">
              Made with <span className="text-red-400">❤️</span> by Naman Jindal
            </p>
        </div>
        </div>
      </main>

      {/* Create Folder Modal */}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsCreatingFolder(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Folder</h3>
                <input 
                    autoFocus
                    type="text" 
                    placeholder="Folder Name"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-4 focus:ring-2 focus:ring-brand-500 outline-none"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsCreatingFolder(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                    <button onClick={handleCreateFolder} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Create</button>
                </div>
            </div>
        </div>
      )}

      {/* Move Item Modal */}
      {isMovingItem && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsMovingItem(null)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Move to Folder</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    <button 
                        onClick={() => handleMove(null)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left"
                    >
                        <div className="bg-slate-100 p-2 rounded-lg"><ArrowBigLeft className="w-5 h-5 text-slate-500" /></div>
                        <span className="font-medium text-slate-700">Main Dashboard</span>
                    </button>
                    {folders.map(f => (
                         <button 
                            key={f.id}
                            onClick={() => handleMove(f.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all text-left"
                        >
                             <div className="bg-blue-100 p-2 rounded-lg"><FolderIcon className="w-5 h-5 text-brand-600" /></div>
                             <span className="font-medium text-slate-700">{f.name}</span>
                         </button>
                    ))}
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button onClick={() => setIsMovingItem(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};