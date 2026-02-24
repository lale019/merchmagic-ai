import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Wand2, 
  History as HistoryIcon, 
  Info, 
  RefreshCw, 
  Home, 
  Plus, 
  Settings,
  Download,
  Share2,
  ChevronLeft,
  User,
  LogOut,
  Crown,
  Lock,
  CreditCard,
  Moon,
  Sun
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LogoUpload } from './components/LogoUpload';
import { MockupSelector } from './components/MockupSelector';
import { MockupDisplay } from './components/MockupDisplay';
import { ProductType, GeneratedMockup } from './types';
import { generateMockup, editMockup } from './services/gemini';

type Tab = 'home' | 'create' | 'history' | 'profile';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  generationsUsed: number;
  isPro: boolean;
  freeLimit: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [logo, setLogo] = useState<string | null>(null);
  const [productType, setProductType] = useState<ProductType>('t-shirt');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMockup, setCurrentMockup] = useState<GeneratedMockup | null>(null);
  const [history, setHistory] = useState<GeneratedMockup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    fetchProfile();
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchProfile();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      window.open(url, 'google_auth', 'width=500,height=600');
    } catch (err) {
      setError("Failed to start login");
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setActiveTab('home');
  };

  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/create-checkout-session', { method: 'POST' });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      setError("Failed to start checkout");
    }
  };

  const handleGenerate = async () => {
    if (!logo) return;
    if (!user) {
      setError("Please login to generate mockups");
      setActiveTab('profile');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Check limits first
      const limitRes = await fetch('/api/user/generate', { method: 'POST' });
      if (!limitRes.ok) {
        const errData = await limitRes.json();
        throw new Error(errData.message || "Limit reached");
      }

      const imageUrl = await generateMockup({
        logoBase64: logo,
        productType,
      });

      const newMockup: GeneratedMockup = {
        id: Math.random().toString(36).substr(2, 9),
        imageUrl,
        productType,
        timestamp: Date.now(),
      };

      setCurrentMockup(newMockup);
      setHistory(prev => [newMockup, ...prev].slice(0, 10));
      setActiveTab('create');
      fetchProfile(); // Update generation count
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6750A4', '#10b981', '#f59e0b']
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate mockup. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = async (instruction: string) => {
    if (!currentMockup || !logo) return;

    setIsEditing(true);
    setError(null);

    try {
      const imageUrl = await editMockup(currentMockup.imageUrl, logo, instruction);
      
      const updatedMockup: GeneratedMockup = {
        ...currentMockup,
        imageUrl,
        timestamp: Date.now(),
        prompt: instruction,
      };

      setCurrentMockup(updatedMockup);
      setHistory(prev => [updatedMockup, ...prev.filter(m => m.id !== currentMockup.id)].slice(0, 10));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to edit mockup. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-m3-primary flex flex-col items-center justify-center z-[100]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-2xl"
        >
          <Sparkles className="text-m3-primary w-12 h-12" />
        </motion.div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-6 text-white font-display font-bold text-3xl tracking-tight"
        >
          MerchMagic
        </motion.h1>
        <div className="absolute bottom-12">
          <RefreshCw className="text-white/50 animate-spin w-6 h-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-m3-surface text-m3-on-surface">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-m3-surface/80 backdrop-blur-md safe-top">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeTab !== 'home' && (
              <button 
                onClick={() => setActiveTab('home')}
                className="p-2 -ml-2 hover:bg-m3-surface-variant rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <h1 className="font-display font-bold text-xl tracking-tight">
              {activeTab === 'home' ? 'MerchMagic' : activeTab === 'create' ? 'Create Mockup' : activeTab === 'history' ? 'History' : 'Profile'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-m3-surface-variant rounded-full transition-colors text-m3-on-surface-variant"
            >
              {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>
            <button className="p-2 hover:bg-m3-surface-variant rounded-full transition-colors text-m3-on-surface-variant">
              <Info size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-32 safe-bottom">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-6 py-4 space-y-10"
            >
              <section className="relative h-64 rounded-[40px] overflow-hidden bg-m3-primary p-8 flex flex-col justify-end group cursor-pointer shadow-xl shadow-m3-primary/20">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <Sparkles size={180} className="text-white" />
                </div>
                <div className="relative z-20">
                  <span className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2 block">AI Powered Design</span>
                  <h2 className="text-white font-display font-bold text-3xl leading-tight tracking-tight">
                    Transform your logo <br /> into professional merch
                  </h2>
                  <div className="mt-4 flex items-center gap-2 text-white/80 text-sm font-medium">
                    <span>Try Gemini 2.5 Magic</span>
                    <Wand2 size={14} />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-display font-bold text-xl tracking-tight">Quick Start</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setActiveTab('create')}
                    className="flex flex-col items-start p-6 rounded-[32px] bg-m3-surface-variant/50 border border-m3-outline/10 hover:bg-m3-primary/5 hover:border-m3-primary/20 transition-all group ripple"
                  >
                    <div className="w-12 h-12 bg-m3-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                      <Plus className="text-white" />
                    </div>
                    <span className="text-base font-bold tracking-tight">New Project</span>
                    <span className="text-xs text-m3-on-surface-variant mt-1">Create a mockup</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className="flex flex-col items-start p-6 rounded-[32px] bg-m3-surface-variant/50 border border-m3-outline/10 hover:bg-m3-secondary/5 hover:border-m3-secondary/20 transition-all group ripple"
                  >
                    <div className="w-12 h-12 bg-m3-secondary rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                      <HistoryIcon className="text-white" />
                    </div>
                    <span className="text-base font-bold tracking-tight">History</span>
                    <span className="text-xs text-m3-on-surface-variant mt-1">View past work</span>
                  </button>
                </div>
              </section>

              {history.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-display font-semibold text-lg">Recent</h3>
                    <button onClick={() => setActiveTab('history')} className="text-m3-primary text-sm font-medium">See all</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    {history.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentMockup(item);
                          setActiveTab('create');
                        }}
                        className="flex-shrink-0 w-32 h-32 rounded-2xl overflow-hidden border border-m3-outline/10 shadow-sm"
                      >
                        <img src={item.imageUrl} alt="Recent" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {activeTab === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-6 py-4 space-y-6"
            >
              {!currentMockup ? (
                <div className="space-y-6 pb-24">
                  <section className="space-y-3">
                    <h2 className="font-display font-bold text-lg tracking-tight">1. Logo</h2>
                    <LogoUpload 
                      onUpload={setLogo} 
                      onClear={() => setLogo(null)} 
                      currentLogo={logo} 
                    />
                  </section>

                  <section className="space-y-3">
                    <h2 className="font-display font-bold text-lg tracking-tight">2. Product</h2>
                    <MockupSelector selected={productType} onSelect={setProductType} />
                  </section>

                  <div className="fixed bottom-24 left-6 right-6 z-30">
                    <button
                      onClick={handleGenerate}
                      disabled={!logo || isGenerating}
                      className="w-full h-14 m3-button-primary flex items-center justify-center gap-3 disabled:bg-m3-surface-variant disabled:text-m3-on-surface-variant/50 shadow-2xl ripple"
                    >
                      {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : <Wand2 size={20} />}
                      <span className="font-bold">{isGenerating ? 'Creating...' : 'Generate Mockup'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <MockupDisplay 
                    mockup={currentMockup} 
                    isGenerating={isGenerating} 
                    onEdit={handleEdit}
                    isEditing={isEditing}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setCurrentMockup(null)}
                      className="h-12 m3-button-tonal flex items-center justify-center gap-2 ripple text-sm"
                    >
                      <Plus size={18} /> New
                    </button>
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = currentMockup.imageUrl;
                        link.download = `mockup.png`;
                        link.click();
                      }}
                      className="h-12 m3-button-primary flex items-center justify-center gap-2 ripple text-sm"
                    >
                      <Download size={18} /> Save
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-6 py-4"
            >
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-m3-on-surface-variant/50">
                  <HistoryIcon size={64} strokeWidth={1} />
                  <p className="mt-4 font-medium">No history yet</p>
                  <button 
                    onClick={() => setActiveTab('create')}
                    className="mt-6 text-m3-primary font-semibold"
                  >
                    Start creating
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentMockup(item);
                        setActiveTab('create');
                      }}
                      className="flex flex-col m3-card overflow-hidden ripple"
                    >
                      <img src={item.imageUrl} alt="History" className="aspect-square w-full object-cover" />
                      <div className="p-3 text-left">
                        <p className="text-xs font-bold uppercase tracking-wider text-m3-primary">{item.productType}</p>
                        <p className="text-[10px] text-m3-on-surface-variant mt-1">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="px-6 py-4 space-y-6"
            >
              {isLoadingProfile ? (
                <div className="space-y-8 animate-pulse">
                  <div className="flex items-center gap-4 p-4 m3-card">
                    <div className="w-16 h-16 rounded-full bg-m3-surface-variant" />
                    <div className="space-y-2 flex-1">
                      <div className="h-5 bg-m3-surface-variant rounded w-1/2" />
                      <div className="h-4 bg-m3-surface-variant rounded w-3/4" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-6 bg-m3-surface-variant rounded w-1/4 ml-2" />
                    <div className="p-6 m3-card space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="h-4 bg-m3-surface-variant rounded w-1/4" />
                        <div className="h-6 bg-m3-surface-variant rounded w-1/6" />
                      </div>
                      <div className="w-full h-3 bg-m3-surface-variant rounded-full" />
                    </div>
                  </div>
                  <div className="h-14 bg-m3-surface-variant rounded-2xl w-full" />
                </div>
              ) : !user ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 bg-m3-surface-variant rounded-full flex items-center justify-center mb-6">
                    <User size={40} className="text-m3-on-surface-variant/50" />
                  </div>
                  <h2 className="text-2xl font-display font-bold">Join MerchMagic</h2>
                  <p className="text-m3-on-surface-variant mt-2 max-w-[240px]">
                    Sign in to save your mockups and unlock AI generation.
                  </p>
                  <button 
                    onClick={handleLogin}
                    className="mt-8 w-full h-14 m3-button-primary flex items-center justify-center gap-3 ripple"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                    Continue with Google
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 p-4 m3-card">
                    <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full border-2 border-m3-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">{user.name}</h2>
                        {user.isPro && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                            <Crown size={10} /> Pro
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-m3-on-surface-variant">{user.email}</p>
                    </div>
                  </div>

                  <section className="space-y-4">
                    <h3 className="font-display font-semibold text-lg px-2">Daily Usage</h3>
                    <div className="p-6 m3-card space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-medium text-m3-on-surface-variant">Remaining</span>
                        <span className="text-lg font-bold">
                          {user.isPro ? 'Unlimited' : `${Math.max(0, user.freeLimit - user.generationsUsed)} / ${user.freeLimit}`}
                        </span>
                      </div>
                      {!user.isPro && (
                        <div className="w-full h-3 bg-m3-surface-variant rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(Math.max(0, user.freeLimit - user.generationsUsed) / user.freeLimit) * 100}%` }}
                            className="h-full bg-m3-primary"
                          />
                        </div>
                      )}
                      <p className="text-[10px] text-m3-on-surface-variant text-center">
                        Resets daily at midnight
                      </p>
                    </div>
                  </section>

                  {!user.isPro && (
                    <section className="p-6 bg-m3-primary-container rounded-[32px] space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Crown className="text-m3-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-m3-on-primary-container">Upgrade to Pro</h3>
                          <p className="text-xs text-m3-on-primary-container/70">Unlimited generations & high-res exports</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleUpgrade}
                        className="w-full h-12 bg-m3-primary text-white rounded-full font-bold text-sm shadow-lg ripple"
                      >
                        Get Pro for $9.99
                      </button>
                    </section>
                  )}

                  <button 
                    onClick={handleLogout}
                    className="w-full h-14 flex items-center justify-center gap-2 text-m3-on-surface font-semibold hover:bg-m3-surface-variant rounded-2xl transition-colors"
                  >
                    <LogOut size={20} /> Sign Out
                  </button>

                  <div className="pt-4 border-t border-m3-outline/10 space-y-4">
                    <h3 className="font-display font-semibold text-sm px-2 text-m3-on-surface-variant uppercase tracking-wider">Legal & Privacy</h3>
                    <div className="space-y-1">
                      <button className="w-full p-4 flex items-center justify-between hover:bg-m3-surface-variant rounded-xl transition-colors">
                        <span className="text-sm font-medium">Privacy Policy</span>
                        <Info size={16} className="text-m3-on-surface-variant" />
                      </button>
                      <button className="w-full p-4 flex items-center justify-between hover:bg-m3-surface-variant rounded-xl transition-colors">
                        <span className="text-sm font-medium">Terms of Service</span>
                        <Info size={16} className="text-m3-on-surface-variant" />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete your account? This will permanently remove all your mockups and generation history. This action cannot be undone.")) {
                          fetch('/api/user/delete-account', { method: 'POST' })
                            .then(() => {
                              setUser(null);
                              setActiveTab('home');
                            });
                        }
                      }}
                      className="w-full p-4 text-left text-red-600 text-xs font-medium hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Delete Account & Data
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-m3-surface-variant/20 backdrop-blur-xl border-t border-m3-outline/10 safe-bottom z-50">
        <div className="max-w-md mx-auto px-6 h-20 flex items-center justify-between">
          <NavButton 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
            icon={<Home size={24} />} 
            label="Home" 
          />
          <NavButton 
            active={activeTab === 'create'} 
            onClick={() => setActiveTab('create')} 
            icon={<Plus size={24} />} 
            label="Create" 
          />
          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<HistoryIcon size={24} />} 
            label="History" 
          />
          <NavButton 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            icon={<User size={24} />} 
            label="Profile" 
          />
        </div>
      </nav>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-6 right-6 bg-red-600 text-white p-4 rounded-2xl shadow-xl z-[60] flex items-center justify-between"
          >
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="p-1">
              <Plus className="rotate-45" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 min-w-[64px] relative group"
    >
      <div className={`
        w-14 h-8 rounded-full flex items-center justify-center transition-all duration-500 ease-out
        ${active ? 'bg-m3-primary text-white shadow-lg shadow-m3-primary/20' : 'text-m3-on-surface-variant hover:bg-m3-surface-variant/50'}
      `}>
        {React.cloneElement(icon as React.ReactElement, { 
          size: 20,
          strokeWidth: active ? 2.5 : 2
        } as any)}
      </div>
      <span className={`text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${active ? 'text-m3-primary opacity-100' : 'text-m3-on-surface-variant opacity-50'}`}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="nav-dot"
          className="absolute -bottom-1 w-1 h-1 bg-m3-primary rounded-full"
        />
      )}
    </button>
  );
}
