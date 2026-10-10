/**
 * EduPath — Your Future, Taking Shape
 * Class 10 Educational Discovery & Dynamic AI Pathway Platform
 * Powered by Supabase Authentication, FastAPI Profile CRUD & Groq Graph Engine
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import type { StudentProfileCreate, StudentProfileOut } from './types/studentProfile';
import type { GenerationIntent, PathwayGraph } from './types/pathwayGraph';
import { storageService } from './services/storageService';
import { apiService } from './services/apiService';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { StudentProfileWizard } from './pages/StudentProfileWizard';
import { FutureProfilePage } from './pages/FutureProfilePage';
import { GraphExplorer } from './GraphExplorer';

type AppRoute = '/' | '/login' | '/register' | '/wizard' | '/profile' | '/graph';

export default function App() {
  const { user, loading, isAuthenticated, signOut } = useAuth();

  const [draftProfile, setDraftProfile] = useState<StudentProfileCreate>(() => {
    return storageService.getDraftProfile();
  });

  const [confirmedProfile, setConfirmedProfile] = useState<StudentProfileOut | null>(() => {
    return storageService.getConfirmedProfile();
  });

  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);

  // Dynamic Graph state (Phase 4 / Phase 6D)
  const [graph, setGraph] = useState<PathwayGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState<boolean>(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [isExpanding, setIsExpanding] = useState<boolean>(false);

  // Sync route from URL hash
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const rawHash = window.location.hash.replace(/^#/, '');
    if (rawHash === '/login' || rawHash === 'login') return '/login';
    if (rawHash === '/register' || rawHash === 'register') return '/register';
    if (rawHash === '/wizard' || rawHash === 'wizard') return '/wizard';
    if (rawHash === '/profile' || rawHash === 'profile') return '/profile';
    if (rawHash === '/graph' || rawHash === 'graph') return '/graph';
    return '/';
  });

  const handleNavigate = useCallback(
    (route: string, notice?: string) => {
      const normalized = route.startsWith('/') ? route : `/${route}`;
      if (notice) {
        setRedirectNotice(notice);
      } else {
        setRedirectNotice(null);
      }

      // Check protected routes
      if (
        (normalized === '/wizard' || normalized === '/profile' || normalized === '/graph') &&
        !isAuthenticated &&
        !loading
      ) {
        setRedirectNotice('Sign in or create an account to begin your journey.');
        setCurrentRoute('/login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (
        normalized === '/' ||
        normalized === '/login' ||
        normalized === '/register' ||
        normalized === '/wizard' ||
        normalized === '/profile' ||
        normalized === '/graph'
      ) {
        setCurrentRoute(normalized as AppRoute);
      } else {
        setCurrentRoute('/');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isAuthenticated, loading]
  );

  // Sync route changes to window hash
  useEffect(() => {
    window.location.hash = currentRoute;
  }, [currentRoute]);

  // Listen to browser hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (
        hash === '/wizard' ||
        hash === 'wizard' ||
        hash === '/profile' ||
        hash === 'profile' ||
        hash === '/graph' ||
        hash === 'graph'
      ) {
        if (!isAuthenticated && !loading) {
          handleNavigate('/login', 'Sign in or create an account to begin your journey.');
          return;
        }
        setCurrentRoute(hash.startsWith('/') ? (hash as AppRoute) : (`/${hash}` as AppRoute));
      } else if (hash === '/login' || hash === 'login') {
        setCurrentRoute('/login');
      } else if (hash === '/register' || hash === 'register') {
        setCurrentRoute('/register');
      } else {
        setCurrentRoute('/');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, loading, handleNavigate]);

  // Load confirmed profile from backend database upon login
  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      // Retain locally cached confirmed profile if present for offline exploration
      return () => {
        cancelled = true;
      };
    }

    apiService
      .listProfiles(0, 1)
      .then((profiles) => {
        if (cancelled) return;
        const latestProfile = profiles[0] ?? null;
        if (latestProfile) {
          setConfirmedProfile(latestProfile);
          storageService.saveConfirmedProfile(latestProfile);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn('Could not load saved profiles from backend:', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  // Update preferred name in draft profile when user profile is loaded
  useEffect(() => {
    if (user?.user_metadata?.preferred_name && !draftProfile.preferred_name) {
      setDraftProfile((prev) => ({
        ...prev,
        preferred_name: user.user_metadata.preferred_name || null,
      }));
    }
  }, [user, draftProfile.preferred_name]);

  // Auto-generate initial graph when entering /graph route if not yet generated
  useEffect(() => {
    if (currentRoute === '/graph' && confirmedProfile && !graph && !graphLoading && !graphError) {
      handleGenerateInitialGraph('explore_alternatives', 3);
    }
  }, [currentRoute, confirmedProfile, graph, graphLoading, graphError]);

  const handleLoginSuccess = (_hasExistingProfile: boolean) => {
    setRedirectNotice(null);
    handleNavigate(confirmedProfile ? '/profile' : '/wizard');
  };

  const handleRegisterSuccess = (needsEmailConfirmation: boolean) => {
    setRedirectNotice(null);
    if (!needsEmailConfirmation) {
      handleNavigate('/wizard');
    }
  };

  const handleLogout = async () => {
    await signOut();
    setRedirectNotice(null);
    handleNavigate('/');
  };

  const handleWizardComplete = (finalizedProfile: StudentProfileOut) => {
    setConfirmedProfile(finalizedProfile);
    // Reset graph so new recommendations are generated for updated profile
    setGraph(null);
    setGraphError(null);
    setDraftProfile({
      education_stage: 'class10',
      preferred_name: finalizedProfile.preferred_name,
      country: finalizedProfile.country,
      region: finalizedProfile.region,
      curriculum: finalizedProfile.curriculum,
      academic_status: finalizedProfile.academic_status,
      preferred_language: finalizedProfile.preferred_language,
      subjects: finalizedProfile.subjects,
      overall_percentage: finalizedProfile.overall_percentage,
      overall_result_status: finalizedProfile.overall_result_status,
      interests: finalizedProfile.interests,
      strengths: finalizedProfile.strengths,
      interest_description: finalizedProfile.interest_description,
      annual_budget: finalizedProfile.annual_budget,
      funding_preferences: finalizedProfile.funding_preferences,
      preferred_destination: finalizedProfile.preferred_destination,
      priorities: finalizedProfile.priorities,
      career_certainty: finalizedProfile.career_certainty,
    });
    handleNavigate('/profile');
  };

  const handleStartJourney = () => {
    if (!isAuthenticated) {
      handleNavigate('/login', 'Sign in or create an account to begin your journey.');
      return;
    }
    if (confirmedProfile) {
      handleNavigate('/profile');
    } else {
      handleNavigate('/wizard');
    }
  };

  const handleScrollToSection = (sectionId: string) => {
    if (currentRoute !== '/') {
      handleNavigate('/');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // ============================================================
  // GRAPH HANDLERS
  // ============================================================

  async function handleGenerateInitialGraph(
    intent: GenerationIntent = 'explore_alternatives',
    count = 3
  ) {
    if (!confirmedProfile) return;
    setGraphLoading(true);
    setGraphError(null);
    try {
      const generated = await apiService.generatePathwayGraph({
        student_profile_snapshot: confirmedProfile,
        current_graph: null,
        current_node_ids_to_expand: [],
        candidate_node_count: count,
        generation_intent: intent,
      });
      setGraph(generated);
    } catch (err: any) {
      console.error('Initial pathway graph generation error:', err);
      setGraphError(err.message || 'Failed to generate initial pathway graph from your profile.');
    } finally {
      setGraphLoading(false);
    }
  }

  async function handleExpandGraph(
    selectedNodeIds: string[],
    intent: GenerationIntent,
    count: number
  ) {
    if (!graph || selectedNodeIds.length === 0 || isExpanding || !confirmedProfile) return;
    setIsExpanding(true);
    setGraphError(null);
    try {
      const updatedGraph = await apiService.generatePathwayGraph({
        student_profile_snapshot: confirmedProfile,
        current_graph: graph,
        current_node_ids_to_expand: selectedNodeIds,
        candidate_node_count: count,
        generation_intent: intent,
      });
      setGraph(updatedGraph);
    } catch (err: any) {
      console.error('Pathway graph expansion error:', err);
      setGraphError(err.message || 'Failed to expand pathway graph.');
    } finally {
      setIsExpanding(false);
    }
  }

  // Initial loading state while Supabase checks stored session
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5FAF9] text-[#376E7D]">
        <div className="w-12 h-12 rounded-2xl bg-[#C9E6F8] text-[#367BA8] flex items-center justify-center shadow-2xs mb-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#367BA8]" />
        </div>
        <h2 className="font-serif-heading text-lg font-bold text-[#376E7D]">EduPath</h2>
        <p className="text-xs text-[#5E8085] mt-1">Loading student session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5FAF9] text-[#376E7D] selection:bg-[#C9E6F8] selection:text-[#376E7D]">
      {/* Global Header */}
      <Header
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onScrollToSection={handleScrollToSection}
        onLogout={handleLogout}
        hasProfile={Boolean(confirmedProfile)}
      />

      {/* Main Content View */}
      <main className="flex-1">
        {currentRoute === '/' && (
          <LandingPage
            onStartJourney={handleStartJourney}
            onNavigate={handleNavigate}
            isAuthenticated={isAuthenticated}
            hasCompletedProfile={Boolean(confirmedProfile)}
          />
        )}

        {currentRoute === '/login' && (
          <LoginPage
            onNavigate={handleNavigate}
            onLoginSuccess={handleLoginSuccess}
            redirectNotice={redirectNotice}
          />
        )}

        {currentRoute === '/register' && (
          <RegisterPage onNavigate={handleNavigate} onRegisterSuccess={handleRegisterSuccess} />
        )}

        {/* Protected Route: Student Profile Wizard */}
        {currentRoute === '/wizard' && (
          <ProtectedRoute onRedirectToLogin={(notice) => handleNavigate('/login', notice)}>
            <StudentProfileWizard
              initialProfile={draftProfile}
              onComplete={handleWizardComplete}
              onExit={() => handleNavigate('/')}
              existingProfileId={confirmedProfile?.id || null}
            />
          </ProtectedRoute>
        )}

        {/* Protected Route: Future Profile Summary */}
        {currentRoute === '/profile' && (
          <ProtectedRoute onRedirectToLogin={(notice) => handleNavigate('/login', notice)}>
            {confirmedProfile ? (
              <FutureProfilePage
                profile={confirmedProfile}
                onEdit={() => handleNavigate('/wizard')}
                onBackToHome={() => handleNavigate('/')}
                onExploreGraph={() => handleNavigate('/graph')}
              />
            ) : (
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
                <h2 className="font-serif-heading text-2xl font-bold text-[#376E7D]">
                  No Future Profile Generated Yet
                </h2>
                <p className="text-sm text-[#5E8085] max-w-md">
                  Complete the 5-step Class 10 profile wizard to generate and view your personalized
                  Future Profile summary.
                </p>
                <button
                  onClick={() => handleNavigate('/wizard')}
                  className="px-6 py-3 text-xs font-semibold text-white bg-[#367BA8] hover:bg-[#2e688e] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Start Class 10 Profile Wizard
                </button>
              </div>
            )}
          </ProtectedRoute>
        )}

        {/* Protected Route: Interactive AI Pathway Graph */}
        {currentRoute === '/graph' && (
          <ProtectedRoute onRedirectToLogin={(notice) => handleNavigate('/login', notice)}>
            {confirmedProfile ? (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Navigation Breadcrumb / Top Bar */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#DCEBEA]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                      <span className="text-xs font-bold text-[#2563eb] uppercase tracking-wider">
                        Interactive AI Engine
                      </span>
                    </div>
                    <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#376E7D] mt-1">
                      Post-Class 10 Exploration Graph
                    </h1>
                    <p className="text-xs text-[#5E8085] mt-0.5">
                      Personalized pathway stages synthesized directly from {confirmedProfile.preferred_name || 'your'} Class 10 profile.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleNavigate('/profile')}
                      className="px-4 py-2 text-xs font-semibold text-[#367BA8] bg-[#C9E6F8]/60 hover:bg-[#C9E6F8] border border-[#A7D9E6] rounded-xl transition-colors cursor-pointer"
                    >
                      ← Return to Profile
                    </button>
                  </div>
                </div>

                {/* Loading Skeleton */}
                {graphLoading && !graph && (
                  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-[#DCEBEA] shadow-xs space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center shadow-2xs">
                      <Loader2 className="w-6 h-6 animate-spin text-[#2563eb]" />
                    </div>
                    <h3 className="font-serif-heading text-lg font-bold text-[#1e293b]">
                      Synthesizing Pathway Graph...
                    </h3>
                    <p className="text-xs text-[#64748b] max-w-md">
                      Analyzing academic strengths, 13 interest categories, and budget constraints to generate multi-stage education and career routes.
                    </p>
                  </div>
                )}

                {/* Error Banner with Retry */}
                {graphError && !graph && !graphLoading && (
                  <div className="min-h-[40vh] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-red-200 shadow-xs space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-xl">
                      ⚠
                    </div>
                    <h3 className="font-serif-heading text-lg font-bold text-red-700">
                      Could Not Generate Pathway Graph
                    </h3>
                    <p className="text-xs text-red-600 max-w-md">{graphError}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleGenerateInitialGraph('explore_alternatives', 3)}
                        className="px-5 py-2 text-xs font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl transition-colors cursor-pointer"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => handleNavigate('/profile')}
                        className="px-4 py-2 text-xs font-semibold text-[#376E7D] bg-[#F5FAF9] border border-[#DCEBEA] rounded-xl transition-colors cursor-pointer"
                      >
                        Back to Profile
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Graph Explorer */}
                {(graph || (!graphLoading && !graphError)) && (
                  <section className="bg-white rounded-3xl border border-[#DCEBEA] p-4 sm:p-6 shadow-xs">
                    <GraphExplorer
                      graph={graph}
                      loading={graphLoading}
                      error={graphError}
                      onGenerateInitial={handleGenerateInitialGraph}
                      onExpandGraph={handleExpandGraph}
                      isExpanding={isExpanding}
                      onReturnToProfile={() => handleNavigate('/profile')}
                    />
                  </section>
                )}
              </div>
            ) : (
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
                <h2 className="font-serif-heading text-2xl font-bold text-[#376E7D]">
                  No Profile Available for Graph Generation
                </h2>
                <p className="text-sm text-[#5E8085] max-w-md">
                  Complete the 5-step Class 10 profile wizard first to generate a personalized AI pathway graph.
                </p>
                <button
                  onClick={() => handleNavigate('/wizard')}
                  className="px-6 py-3 text-xs font-semibold text-white bg-[#367BA8] hover:bg-[#2e688e] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Start Class 10 Profile Wizard
                </button>
              </div>
            )}
          </ProtectedRoute>
        )}
      </main>

      {/* Footer rendered on Landing, Profile and Graph pages */}
      {(currentRoute === '/' || currentRoute === '/profile' || currentRoute === '/graph') && (
        <Footer onNavigate={handleNavigate} />
      )}
    </div>
  );
}