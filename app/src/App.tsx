import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeroSection } from '@/sections/HeroSection';
import { ChatSection } from '@/sections/ChatSection';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { BanScreen } from '@/components/BanScreen';
import './App.css';

gsap.registerPlugin(ScrollTrigger);

function App() {
  const [showChat, setShowChat] = useState(false);
  const [heroKey, setHeroKey] = useState(0);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('spectre_theme') !== 'light';
  });

  const mainRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const {
    user,
    token,
    loading: authLoading,
    logout,
    refreshUser,
    purchaseUnban,
  } = useAuth();

  const {
    connected,
    chatState,
    findMatch,
    sendMessage,
    sendTyping,
    sendReaction,
    stopChat,
    newChat,
    sendReport,
    sendGameMessage,
    setGameHandler
  } = useWebSocket(token);

  // Apply theme to html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('spectre_theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('spectre_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark(d => !d), []);

  // Handle Stripe callback URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const hash = window.location.hash;

    if (sessionId) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const authToken = localStorage.getItem('spectre_auth_token');
      fetch(`${API_URL}/api/payment/verify?session_id=${sessionId}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })
        .then(res => res.json())
        .then(data => {
          window.history.replaceState(null, '', window.location.pathname);
          if (data.success) {
            refreshUser();
            alert(`Payment success! ${data.type === 'premium' ? 'Premium activated!' : 'Account unbanned!'}`);
          } else {
            alert(`Payment verification failed: ${data.error}`);
          }
        })
        .catch(() => {
          window.history.replaceState(null, '', window.location.pathname);
          alert('Could not verify payment with server.');
        });
    } else if (hash.includes('payment-cancelled')) {
      window.history.replaceState(null, '', window.location.pathname);
      alert('Payment cancelled.');
    }
  }, [refreshUser]);

  // Handle start chat from hero
  const handleStartChat = useCallback((interests: string[] = []) => {
    setShowChat(true);
    window.history.pushState({ chat: true }, '', '#chat');
    setTimeout(() => {
      findMatch(interests);
    }, 500);
  }, [findMatch]);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    // When requesting a new chat within the chat layout, let's keep search parameters
    newChat();
  }, [newChat]);

  // Handle going back to hero
  const handleGoHome = useCallback(() => {
    stopChat();
    setShowChat(false);
    // Force HeroSection to remount (resets ghost animations)
    setHeroKey(k => k + 1);
    // Clean up the URL hash
    if (window.location.hash === '#chat') {
      window.history.back();
    }
  }, [stopChat]);

  // Browser back button → go to hero
  useEffect(() => {
    const handlePopState = () => {
      if (showChat) {
        stopChat();
        setShowChat(false);
        setHeroKey(k => k + 1);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showChat, stopChat]);

  // Scroll animation setup
  useEffect(() => {
    if (!showChat) return;

    const ctx = gsap.context(() => {
      // Hero is already faded by ghost pick animation, just ensure it's gone
      gsap.to(heroRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out',
      });

      // Chat entrance — smooth fade + gentle scale in (no slide)
      gsap.fromTo(chatRef.current,
        { opacity: 0, scale: 0.97 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out', delay: 0.1 }
      );
    }, mainRef);

    return () => ctx.revert();
  }, [showChat]);

  // Report user callback
  const handleReportUser = useCallback((reason: string, description: string) => {
    sendReport(reason, description);
  }, [sendReport]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-neon-cyan" style={{ background: '#070707' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-neon-cyan/20 border-t-neon-cyan rounded-full loading-spinner" />
          <span>Securing connection...</span>
        </div>
      </div>
    );
  }

  // 1. Auth Gate (Hidden/Disabled for now)
  /*
  if (!isLoggedIn) {
    return <AuthPage onRegister={register} onLogin={login} />;
  }
  */

  // 2. Ban Screen Gate
  if (user?.isBanned) {
    return (
      <BanScreen
        banReason={user.banReason}
        onUnban={purchaseUnban}
        onLogout={logout}
      />
    );
  }

  return (
    <div ref={mainRef} className="relative min-h-screen" style={{ background: 'var(--dark-bg)' }}>
      {/* Grain Overlay */}
      <div className="grain-overlay" />

      {/* Vignette */}
      <div className="vignette" />

      {/* Hero Section - has theme toggle built in */}
      <div
        key={heroKey}
        ref={heroRef}
        className={`${showChat ? 'absolute inset-0 z-10' : 'relative z-20'}`}
      >
        <HeroSection
          onStartChat={handleStartChat}
          onlineCount={chatState.onlineCount}
          isDark={isDark}
          toggleTheme={toggleTheme}
          interestStats={chatState.interestStats}
        />
      </div>

      {/* Chat Section */}
      {showChat && (
        <div
          ref={chatRef}
          className="fixed inset-0 z-30"
        >
          <ChatSection
            chatState={chatState}
            onSendMessage={sendMessage}
            onSendTyping={sendTyping}
            onSendReaction={sendReaction}
            onStopChat={stopChat}
            onNewChat={handleNewChat}
            onGoHome={handleGoHome}
            onReportUser={handleReportUser}
            isDark={isDark}
            toggleTheme={toggleTheme}
            connected={connected}
            sendGameMessage={sendGameMessage}
            setGameHandler={setGameHandler}
          />
        </div>
      )}



      {/* Connection Status Toast */}
      {!connected && showChat && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-dark-bubble border border-red-500/30 text-red-400 px-4 py-2 rounded-md flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-sm">Reconnecting to server...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
