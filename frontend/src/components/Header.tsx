import React, { useState, useRef, useEffect } from 'react';
import { GraduationCap, Menu, X, LogOut, FileText, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onScrollToSection?: (sectionId: string) => void;
  onLogout?: () => void;
  hasProfile?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  onScrollToSection,
  onLogout,
  hasProfile,
}) => {
  const { user, signOut, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    if (currentRoute !== '/') {
      onNavigate('/');
      setTimeout(() => {
        onScrollToSection?.(sectionId);
      }, 100);
    } else {
      onScrollToSection?.(sectionId);
    }
  };

  const handleLinkClick = (route: string) => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    onNavigate(route);
  };

  const handleSignOutClick = async () => {
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      await signOut();
      onNavigate('/');
    }
  };

  const displayName =
    user?.user_metadata?.preferred_name ||
    user?.email?.split('@')[0] ||
    'Student';

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#DCEBEA] py-3.5 transition-all shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6">
          {/* Logo & Wordmark */}
          <button
            onClick={() => handleLinkClick('/')}
            className="flex items-center gap-2.5 text-left group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#367BA8] rounded-lg cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#C9E6F8] text-[#367BA8] flex items-center justify-center shadow-2xs group-hover:bg-[#367BA8] group-hover:text-white transition-colors">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#376E7D]">
              EduPath
            </span>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5E8085]">
            <button
              onClick={() => handleLinkClick('/')}
              className={`hover:text-[#376E7D] transition-colors whitespace-nowrap cursor-pointer ${
                currentRoute === '/' ? 'text-[#367BA8] font-bold' : ''
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('how-it-works')}
              className="hover:text-[#376E7D] transition-colors whitespace-nowrap cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => handleNavClick('features')}
              className="hover:text-[#376E7D] transition-colors whitespace-nowrap cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => handleNavClick('about')}
              className="hover:text-[#376E7D] transition-colors whitespace-nowrap cursor-pointer"
            >
              About
            </button>
            {(hasProfile || currentRoute === '/graph') && (
              <button
                onClick={() => handleLinkClick('/graph')}
                className={`hover:text-[#376E7D] transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  currentRoute === '/graph' ? 'text-[#367BA8] font-bold' : ''
                }`}
              >
                <span>🕸️ Pathway Graph</span>
              </button>
            )}
          </nav>

          {/* Desktop Auth Controls / Compact Account Menu */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {isAuthenticated && user ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-[#DCEBEA] bg-[#F5FAF9] hover:bg-[#EAF4FF] hover:border-[#A7D9E6] transition-all text-left cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#367BA8]"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#367BA8] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {initial}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-[#376E7D] leading-tight max-w-[120px] truncate">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-[#5E8085] leading-none">
                      Class 10 Student
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#5E8085] transition-transform duration-150 ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Compact Account Dropdown Menu */}
                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-[#DCEBEA] shadow-lg py-2 z-50 animate-in fade-in duration-100">
                    <div className="px-3.5 py-2 border-b border-[#DCEBEA] mb-1">
                      <p className="text-xs font-bold text-[#376E7D] truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-[#5E8085] truncate font-mono">
                        {user.email}
                      </p>
                    </div>

                    <button
                      onClick={() => handleLinkClick('/profile')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#376E7D] hover:bg-[#F5FAF9] hover:text-[#367BA8] transition-colors cursor-pointer text-left"
                    >
                      <FileText className="w-4 h-4 text-[#367BA8]" />
                      <span>My Profile</span>
                    </button>

                    <button
                      onClick={() => handleLinkClick('/graph')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#376E7D] hover:bg-[#F5FAF9] hover:text-[#367BA8] transition-colors cursor-pointer text-left"
                    >
                      <Sparkles className="w-4 h-4 text-[#2563eb]" />
                      <span>Pathway Graph</span>
                    </button>

                    <button
                      onClick={handleSignOutClick}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleLinkClick('/login')}
                  className="px-3.5 py-2 text-xs font-semibold text-[#367BA8] hover:text-[#278F89] border border-transparent hover:border-[#DCEBEA] rounded-xl transition-all whitespace-nowrap cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleLinkClick('/register')}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-semibold text-white bg-[#367BA8] hover:bg-[#2e688e] active:scale-98 rounded-xl shadow-2xs transition-all whitespace-nowrap cursor-pointer"
                >
                  <span>Register</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#5E8085] hover:text-[#376E7D] rounded-lg border border-[#DCEBEA] cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-3 border-t border-[#DCEBEA] mt-3 space-y-3 animate-in fade-in duration-150">
            <nav className="flex flex-col space-y-1 text-sm font-medium text-[#5E8085]">
              <button
                onClick={() => handleLinkClick('/')}
                className="text-left px-3 py-2 rounded-lg hover:bg-[#F5FAF9] hover:text-[#376E7D]"
              >
                Home
              </button>
              <button
                onClick={() => handleNavClick('how-it-works')}
                className="text-left px-3 py-2 rounded-lg hover:bg-[#F5FAF9] hover:text-[#376E7D]"
              >
                How It Works
              </button>
              <button
                onClick={() => handleNavClick('features')}
                className="text-left px-3 py-2 rounded-lg hover:bg-[#F5FAF9] hover:text-[#376E7D]"
              >
                Features
              </button>
              <button
                onClick={() => handleNavClick('about')}
                className="text-left px-3 py-2 rounded-lg hover:bg-[#F5FAF9] hover:text-[#376E7D]"
              >
                About
              </button>
            </nav>

            <div className="pt-3 border-t border-[#DCEBEA] flex flex-col gap-2">
              {isAuthenticated && user ? (
                <div className="space-y-2 bg-[#F5FAF9] p-3 rounded-2xl border border-[#DCEBEA]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#367BA8] text-white flex items-center justify-center font-bold text-xs">
                      {initial}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#376E7D]">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-[#5E8085] truncate font-mono">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-1.5">
                    <button
                      onClick={() => handleLinkClick('/profile')}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-[#367BA8] rounded-xl hover:bg-[#2e688e]"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={handleSignOutClick}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-[#5E8085] hover:text-rose-600 rounded-xl"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleLinkClick('/login')}
                    className="w-full text-center py-2.5 px-4 text-xs font-semibold text-[#367BA8] bg-[#F5FAF9] border border-[#DCEBEA] rounded-xl"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleLinkClick('/register')}
                    className="w-full text-center py-2.5 px-4 text-xs font-semibold text-white bg-[#367BA8] rounded-xl"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
