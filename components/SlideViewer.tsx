
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Edit2, 
  X, 
  Send, 
  Menu,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  ListPlus,
  Trash2,
  Layers,
  GripVertical,
  Save
} from 'lucide-react';
import { Slide, Presentation, User } from '../types';
import { analyzeSlideImage } from '../services/geminiService';
import { savePresentation, trackAnalysisUsage } from '../services/storageService';

interface SlideViewerProps {
  initialPresentation: Presentation;
  onBack: () => void;
  currentUser: User;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({ initialPresentation, onBack, currentUser }) => {
  const [presentation, setPresentation] = useState<Presentation>(initialPresentation);
  const slides = presentation.slides;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [customPromptInput, setCustomPromptInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Queue & Priority State
  const [queue, setQueue] = useState<string[]>([]);
  const [showQueueModal, setShowQueueModal] = useState(false);

  // Layout State
  const [panelWidth, setPanelWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  
  // Track auto-fetching to prevent double calls
  const processingRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentSlide = slides[currentIndex];

  // --- Auto Save Logic ---
  const handleSave = async (updatedSlides: Slide[]) => {
    // Update local state first
    const updatedPresentation = {
      ...presentation,
      slides: updatedSlides,
      lastModified: Date.now()
    };
    setPresentation(updatedPresentation);

    // Debounced Save to DB
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsSaving(true);
    timerRef.current = setTimeout(async () => {
      try {
        await savePresentation(updatedPresentation);
      } catch (err) {
        console.error("Failed to auto-save", err);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  };

  // --- Resizing Logic ---
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < window.innerWidth * 0.8) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing]);

  // --- Queue Processing Logic ---
  useEffect(() => {
    const processQueue = async () => {
      // 1. Check if the engine is already busy
      const isAnyLoading = slides.some(s => s.status === 'LOADING');
      if (isAnyLoading) return;

      // 2. STRICT MODE: Only process items explicitly in the queue
      if (queue.length > 0) {
        const id = queue[0];
        const s = slides.find(s => s.id === id);

        // If the slide exists and hasn't been analyzed yet
        if (s && s.status !== 'SUCCESS') {
          // Prevent double-triggering
          if (!processingRef.current.has(id)) {
            // Small delay to keep API happy, but faster than auto-mode
            await new Promise(resolve => setTimeout(resolve, 1000));
            await triggerAnalysis(id);
          }
        } else {
          // If slide is done or invalid, remove from queue to unblock next item
          setQueue(prev => prev.slice(1));
        }
      }
    };
    processQueue();
  }, [slides, queue]);

  const triggerAnalysis = async (slideId: string, customPrompt?: string) => {
    const slideIndex = slides.findIndex(s => s.id === slideId);
    if (slideIndex === -1) return;

    if (processingRef.current.has(slideId)) return;
    processingRef.current.add(slideId);

    // Optimistic Update: Loading
    const slidesCopyLoading = [...slides];
    slidesCopyLoading[slideIndex] = { ...slidesCopyLoading[slideIndex], status: 'LOADING' };
    handleSave(slidesCopyLoading); // Save loading state (optional, but good for UI consistency)

    try {
      const slide = slidesCopyLoading[slideIndex];
      const promptToUse = customPrompt || slide.customPrompt || "Explain this slide in detail. Use bullet points and clear formatting.";
      
      const { text, usage } = await analyzeSlideImage(slide.imageUrl, promptToUse);

      // Update Success
      const slidesCopySuccess = [...slidesCopyLoading];
      slidesCopySuccess[slideIndex] = { 
        ...slidesCopySuccess[slideIndex], 
        explanation: text, 
        status: 'SUCCESS',
        customPrompt: promptToUse,

        analyzedBy: {
          userId: currentUser.id,
          userName: currentUser.name,
          timestamp: Date.now()
        }
      };
      handleSave(slidesCopySuccess);
      trackAnalysisUsage(currentUser.id, currentUser.name, usage.totalTokenCount);
      
    } catch (error) {
      console.error(error);
      const slidesCopyError = [...slidesCopyLoading];
      slidesCopyError[slideIndex] = { ...slidesCopyError[slideIndex], status: 'ERROR' };
      handleSave(slidesCopyError);
    } finally {
      processingRef.current.delete(slideId);
    }
  };

  const handleRegenerate = () => {
    processingRef.current.delete(currentSlide.id);
    triggerAnalysis(currentSlide.id, customPromptInput || currentSlide.customPrompt);
    setIsEditingPrompt(false);
  };

  const openPromptEditor = () => {
    setCustomPromptInput(currentSlide.customPrompt || "");
    setIsEditingPrompt(true);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) setCurrentIndex(i => i + 1);
  };

  const addToQueue = (e: React.MouseEvent, slideId: string) => {
    e.stopPropagation();
    if (!queue.includes(slideId)) {
      setQueue(prev => [...prev, slideId]);
    }
  };

  const removeFromQueue = (slideId: string) => {
    setQueue(prev => prev.filter(id => id !== slideId));
  };

  return (
    <div className="h-screen w-screen flex bg-gray-50 overflow-hidden text-slate-900 font-sans">
      
      {/* Sidebar (Thumbnails) */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${showSidebar ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col shadow-lg md:shadow-none`}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div 
            onClick={onBack}
            className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-sm">Dashboard</span>
          </div>
          <button onClick={() => setShowSidebar(false)} className="md:hidden text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
          {slides.map((slide, index) => {
            const isInQueue = queue.includes(slide.id);
            const isAnalyzed = slide.status === 'SUCCESS';
            
            return (
              <div 
                key={slide.id}
                onClick={() => setCurrentIndex(index)}
                className={`p-3 rounded-xl cursor-pointer border transition-all duration-200 group flex gap-3 items-center relative ${
                  index === currentIndex 
                    ? 'border-brand-500 bg-white ring-1 ring-brand-500 shadow-sm' 
                    : 'border-transparent hover:bg-white hover:shadow-sm hover:border-gray-200'
                }`}
              >
                <div className="w-20 h-14 bg-gray-200 rounded-md overflow-hidden flex-shrink-0 border border-gray-300 relative">
                  <img src={slide.imageUrl} alt={`Page ${slide.pageNumber}`} className="w-full h-full object-cover" />
                  {isAnalyzed && (
                    <div className="absolute bottom-0 right-0 bg-green-500 p-0.5 rounded-tl-md">
                      <Sparkles className="w-2 h-2 text-white" />
                    </div>
                  )}
                  {isInQueue && !isAnalyzed && (
                    <div className="absolute inset-0 bg-brand-900/10 flex items-center justify-center">
                       <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                         #{queue.indexOf(slide.id) + 1}
                       </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-semibold ${index === currentIndex ? 'text-brand-700' : 'text-slate-700'}`}>
                      Slide {slide.pageNumber}
                    </span>
                    {slide.status === 'LOADING' && <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />}
                    {slide.status === 'ERROR' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {isAnalyzed ? 'Analysis complete' : slide.status === 'LOADING' ? 'Analyzing...' : isInQueue ? 'Queued' : 'Pending'}
                  </p>
                </div>
                
                {/* Hover Action: Add to Queue */}
                {!isAnalyzed && slide.status !== 'LOADING' && !isInQueue && (
                  <button
                    onClick={(e) => addToQueue(e, slide.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white border border-gray-200 rounded-full text-slate-400 hover:text-brand-600 hover:border-brand-300 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="Add to priority queue"
                  >
                    <ListPlus className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative bg-gray-50">
        
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg text-slate-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h2 className="font-bold text-sm text-slate-800 line-clamp-1 max-w-[200px] md:max-w-md">
                {presentation.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                 <span>Slide {currentIndex + 1} of {slides.length}</span>
                 {isSaving && <span className="text-brand-600 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin"/> Saving...</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Queue Button */}
            <div className="relative">
              <button 
                onClick={() => setShowQueueModal(!showQueueModal)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border ${
                  showQueueModal ? 'bg-brand-50 text-brand-700 border-brand-200' : 'text-slate-600 hover:bg-gray-50 border-gray-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Queue</span>
                {queue.length > 0 && (
                  <span className="bg-brand-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {queue.length}
                  </span>
                )}
              </button>

              {/* Queue Popup Modal */}
              {showQueueModal && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowQueueModal(false)} />
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-semibold text-sm text-slate-700">Analysis Queue</h3>
                      <button onClick={() => setShowQueueModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2">
                      {queue.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">
                          <ListPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>Queue is empty</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {queue.map((id, idx) => {
                            const s = slides.find(s => s.id === id);
                            if (!s) return null;
                            return (
                              <div key={id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group">
                                <span className="text-xs font-mono text-slate-400 w-4">{idx + 1}</span>
                                <div className="w-8 h-8 bg-gray-200 rounded border border-gray-200 overflow-hidden shrink-0">
                                  <img src={s.imageUrl} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-700">Slide {s.pageNumber}</p>
                                </div>
                                <button 
                                  onClick={() => removeFromQueue(id)}
                                  className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {queue.length > 0 && (
                       <div className="p-2 border-t border-gray-100 bg-gray-50">
                         <button 
                           onClick={() => setQueue([])}
                           className="w-full py-1.5 text-xs text-red-600 hover:bg-red-50 rounded font-medium transition-colors"
                         >
                           Clear Queue
                         </button>
                       </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            <button 
              onClick={handlePrev} 
              disabled={currentIndex === 0}
              className="p-2 rounded-lg text-slate-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors border border-gray-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={handleNext} 
              disabled={currentIndex === slides.length - 1}
              className="p-2 rounded-lg text-slate-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors border border-gray-200"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Split View */}
        <div className="flex-1 flex flex-row overflow-hidden relative">
          
          {/* Left: Image Viewer */}
          <div className="flex-1 bg-gray-100 relative flex items-center justify-center p-8 overflow-auto min-w-[300px]">
            <div className="relative shadow-xl rounded-lg overflow-hidden max-w-full max-h-full bg-white ring-1 ring-gray-900/5">
              <img 
                src={currentSlide.imageUrl} 
                alt="Current Slide" 
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          </div>

          {/* Resize Handle */}
          <div 
            className="w-4 bg-gray-50 border-l border-r border-gray-200 flex items-center justify-center cursor-col-resize hover:bg-blue-50 transition-colors z-20 shrink-0"
            onMouseDown={startResizing}
          >
            <GripVertical className="w-4 h-4 text-slate-300" />
          </div>

          {/* Right: AI Analysis */}
          <div 
            style={{ width: panelWidth }}
            className="bg-white flex flex-col relative z-10 shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)] shrink-0 max-w-[80vw]"
          >
            
            {/* Analysis Header */}
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-white h-14 shrink-0">
              <div className="flex items-center gap-2 text-brand-700 font-semibold">
                <Sparkles className="w-5 h-5" />
                <span>Explanation</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={openPromptEditor}
                  title="Edit Prompt"
                  className="p-2 hover:bg-blue-50 text-slate-500 hover:text-brand-600 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleRegenerate}
                  title="Regenerate"
                  className="p-2 hover:bg-blue-50 text-slate-500 hover:text-brand-600 rounded-lg transition-colors"
                  disabled={currentSlide.status === 'LOADING'}
                >
                  <RefreshCw className={`w-4 h-4 ${currentSlide.status === 'LOADING' ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-white">
              {currentSlide.status === 'LOADING' ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-medium animate-pulse">Analyzing slide content...</p>
                </div>
              ) : currentSlide.status === 'ERROR' ? (
                <div className="flex flex-col items-center justify-center h-full text-red-500 space-y-3">
                  <AlertCircle className="w-10 h-10" />
                  <p className="font-medium">Failed to analyze slide.</p>
                  <button 
                    onClick={() => triggerAnalysis(currentSlide.id)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="markdown-content text-slate-800">
                  {currentSlide.explanation ? (
                     <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentSlide.explanation}</ReactMarkdown>
                  ) : (
                    <div className="text-center text-slate-400 mt-20">
                      <p>Waiting for analysis...</p>
                      <p className="text-xs mt-2 opacity-75">Analysis is queued to respect rate limits.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Prompt Editor Overlay */}
            {isEditingPrompt && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col p-6 animate-in fade-in duration-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Customize Prompt</h3>
                  <button 
                    onClick={() => setIsEditingPrompt(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <p className="text-sm text-slate-500 mb-2">Instructions for Gemini</p>
                  <textarea
                    value={customPromptInput}
                    onChange={(e) => setCustomPromptInput(e.target.value)}
                    className="flex-1 w-full bg-white border border-gray-200 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:outline-none resize-none mb-4 shadow-inner text-base"
                    placeholder="Ask Gemini something specific about this slide..."
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => setIsEditingPrompt(false)}
                    className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-gray-100 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRegenerate}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-brand-600/20 transition-all hover:scale-105"
                  >
                    <Send className="w-4 h-4" />
                    Analyze Slide
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
};
