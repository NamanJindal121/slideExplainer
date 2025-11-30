import React, { useState, useEffect } from 'react';
import { Upload, FileText, Loader2, AlertCircle, ArrowLeft, LogIn } from 'lucide-react';
import { SlideViewer } from './components/SlideViewer';
import { Dashboard } from './components/Dashboard';
import { processPdf } from './services/pdfService';
import { savePresentation } from './services/storageService';
import { authService, GoogleUser } from './services/authService'; // Import Service
import { AppState, Presentation } from './types';
import 'katex/dist/katex.min.css';


export default function App() {
  const [appState, setAppState] = useState<AppState>('LANDING');
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [currentPresentation, setCurrentPresentation] = useState<Presentation | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This subscription automatically handles page refreshes and session persistence
    const unsubscribe = authService.onUserChanged((user) => {
      setUser(user);
      if (user && appState === 'LANDING') {
        setAppState('DASHBOARD');
      } else if (!user && appState !== 'LANDING') {
        setAppState('LANDING'); // Kick back to landing if logged out
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [appState]);

  // 2. CHANGED: Simple Async Login Handler
  const handleLoginClick = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.loginWithGoogle();
      // No need to setUser here; the useEffect listener above will catch the change
    } catch (e) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setAppState('LANDING');
  };

  // Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Safety Check: Ensure user is logged in before allowing upload
    if (!user) {
      setError('You must be logged in to upload a presentation.');
      return;
    }

    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const extractedSlides = await processPdf(file);
      
      // 2. Add Author Details here
      const newPresentation: Presentation = {
        id: crypto.randomUUID(),
        title: file.name.replace('.pdf', ''),
        thumbnailUrl: extractedSlides[0]?.imageUrl || '',
        lastModified: Date.now(),
        slideCount: extractedSlides.length,
        slides: extractedSlides,
        
        // NEW FIELDS
        authorId: user.uid,
        authorName: user.name || 'Anonymous',
        authorPhoto: user.photoURL || undefined
      };

      await savePresentation(newPresentation);
      setCurrentPresentation(newPresentation);
      setAppState('VIEWER');
    } catch (err: any) {
      console.error(err);
      setError('Failed to process PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation Handlers
  const openPresentation = (p: Presentation) => {
    setCurrentPresentation(p);
    setAppState('VIEWER');
  };

  // Render Logic
  if (appState === 'VIEWER' && currentPresentation) {
    // Create mapped user object
    const currentUser = user ? {
      id: user.uid,
      name: user.name || 'Anonymous',
      email: user.email || '',
      avatarUrl: user.photoURL || ''
    } : null;

    if (!currentUser) return null;

    return (
      <SlideViewer 
        initialPresentation={currentPresentation} 
        onBack={() => setAppState('DASHBOARD')}
        currentUser={currentUser} // <--- Passing the user here
      />
    );
  }
  
  if (appState === 'DASHBOARD' && user) {
    // Map the new Firebase fields to your Dashboard
    const mappedUser = {
      id: user.uid,             
      name: user.name || 'User',
      email: user.email || '',
      avatarUrl: user.photoURL || undefined
    };

    return (
      <Dashboard 
        user={mappedUser}
        onNew={() => setAppState('UPLOAD')}
        onOpen={openPresentation}
        onLogout={() => authService.logout()} // Ensure this is async
      />
    );
  }

  // Common Layout for Landing & Upload
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-blue-50 relative overflow-hidden">
      
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="w-full max-w-xl z-10">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white rounded-2xl border border-blue-100 shadow-xl shadow-blue-900/5">
              <FileText className="w-12 h-12 text-brand-600" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 text-slate-900 tracking-tight">
            SlideLens AI
          </h1>
          <p className="text-slate-600 text-lg">
            Upload your PDF presentation and let Gemini 3 Pro explain every detail.
          </p>
        </div>

        <div className="bg-white/80 border border-white rounded-3xl p-8 backdrop-blur-xl shadow-2xl shadow-blue-900/10 relative group hover:border-blue-200 transition-all duration-300">
          
          {appState === 'LANDING' ? (
            <div className="flex flex-col items-center py-8">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Welcome Back</h3>
              <p className="text-slate-500 text-center mb-8 max-w-xs">
                Sign in to access your presentation history and analyze new documents.
              </p>
              
              {/* 3. CHANGED: Custom Button instead of GoogleLogin Component */}
              <div className="w-full flex justify-center">
                {isLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                ) : (
                  <button
                    onClick={handleLoginClick}
                    className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:shadow-md transition-all text-slate-700 font-medium"
                  >
                    <img 
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                      alt="Google" 
                      className="w-5 h-5"
                    />
                    Sign in with Google
                  </button>
                )}
              </div>

              <div className="mt-6 text-center text-xs text-slate-400">
                <p>Stores data locally on this device for privacy.</p>
                <p>Google Account required for cross-device sync features.</p>
              </div>
            </div>
          ) : (
            // UPLOAD STATE
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-2xl p-12 transition-colors group-hover:border-brand-400 group-hover:bg-blue-50/50 relative">
               <button 
                  onClick={() => setAppState('DASHBOARD')}
                  className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
               </button>

              {isLoading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                  <p className="text-slate-700 font-medium">Processing PDF Pages...</p>
                  <p className="text-slate-500 text-sm mt-2">This may take a moment for large files.</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300 border border-blue-100">
                    <Upload className="w-8 h-8 text-brand-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Upload Presentation</h3>
                  <p className="text-slate-500 text-center mb-6 max-w-xs">
                    Drag & drop your PDF here, or click to browse files.
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <span className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-brand-600/20">
                      Select PDF
                    </span>
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}