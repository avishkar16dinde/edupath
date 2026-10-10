import React from 'react';
import { 
  ArrowRight, 
  Lightbulb, 
  Layers, 
  Route, 
  UserCheck, 
  GraduationCap, 
  HeartHandshake, 
  DollarSign,
  Compass,
  CheckCircle2,
  Sparkles,
  Lock
} from 'lucide-react';
import { PathwayDiagram } from '../components/PathwayDiagram';

interface LandingPageProps {
  onStartJourney: () => void;
  onNavigate: (route: string) => void;
  isAuthenticated: boolean;
  hasCompletedProfile?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onStartJourney, 
  onNavigate,
  isAuthenticated,
  hasCompletedProfile = false,
}) => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5FAF9] text-[#376E7D] bg-edupath-pattern">
      {/* 1. Hero Section */}
      <section className="relative pt-12 pb-16 lg:pt-16 lg:pb-24 overflow-hidden border-b border-[#DCEBEA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Column */}
            <div className="lg:col-span-6 space-y-6 lg:pr-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#C9E6F8] border border-[#A7D9E6] text-[#367BA8] text-xs font-bold tracking-wide uppercase">
                <span>FOR CLASS 10 STUDENTS</span>
              </div>

              <h1 className="font-serif-heading text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-[#376E7D] tracking-tight leading-[1.12]">
                Your Future Has Many{' '}
                <span className="text-[#367BA8] underline decoration-[#CDEDE2] decoration-4 underline-offset-4">
                  Paths.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#5E8085] leading-relaxed max-w-xl">
                Explore your interests, understand your strengths and discover the possibilities beyond Class 10.
              </p>

              {/* Action Buttons & Authentication Requirement */}
              <div className="pt-1 flex flex-col items-stretch sm:items-start gap-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  {isAuthenticated ? (
                    <button
                      type="button"
                      onClick={onStartJourney}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#367BA8] hover:bg-[#2e688e] active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer group"
                    >
                      <span>
                        {hasCompletedProfile ? 'View My Future Profile' : 'Start My Journey'}
                      </span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#5E8085] bg-[#DCEBEA]/90 border border-[#DCEBEA] rounded-xl shadow-none cursor-not-allowed select-none opacity-85"
                      title="Sign in or create an account to begin your journey"
                    >
                      <span>Start My Journey</span>
                      <ArrowRight className="w-4 h-4 text-[#5E8085]/70" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => scrollToSection('how-it-works')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold text-[#367BA8] bg-white hover:bg-[#C9E6F8]/30 border border-[#DCEBEA] rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    <span>See How It Works</span>
                  </button>
                </div>

                {/* Helper message shown when NOT authenticated */}
                {!isAuthenticated && (
                  <div className="flex items-center gap-2 text-xs text-[#5E8085] bg-[#EAF4FF] px-3.5 py-2 rounded-xl border border-[#D8EAFE] max-w-md animate-in fade-in">
                    <Lock className="w-3.5 h-3.5 text-[#367BA8] shrink-0" />
                    <span>
                      Sign in or create an account to begin your journey.{' '}
                      <button
                        type="button"
                        onClick={() => onNavigate('/login')}
                        className="font-bold text-[#367BA8] hover:underline cursor-pointer inline"
                      >
                        Sign In
                      </button>
                      {' · '}
                      <button
                        type="button"
                        onClick={() => onNavigate('/register')}
                        className="font-bold text-[#367BA8] hover:underline cursor-pointer inline"
                      >
                        Register
                      </button>
                    </span>
                  </div>
                )}
              </div>

              {/* Three Small Icon-and-Text Highlights */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#DCEBEA] text-xs text-[#5E8085]">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#367BA8] shrink-0" />
                  <span>Personalised guidance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-[#278F89] shrink-0" />
                  <span>Multiple education paths</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#367BA8] shrink-0" />
                  <span>Built for your future</span>
                </div>
              </div>

              {/* Reassurance Message */}
              <div className="flex items-start gap-2 text-xs text-[#5E8085] bg-white p-3 rounded-xl border border-[#DCEBEA] shadow-2xs">
                <HeartHandshake className="w-4 h-4 text-[#278F89] shrink-0 mt-0.5" />
                <span className="leading-normal">
                  You don't need to have everything figured out yet. Start with what you know about yourself.
                </span>
              </div>
            </div>

            {/* Right Column: Minimal CSS/SVG Pathway Diagram */}
            <div className="lg:col-span-6 w-full">
              <PathwayDiagram />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Features Section (Why EduPath) */}
      <section id="features" className="py-16 lg:py-24 bg-white border-b border-[#DCEBEA] scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#367BA8]">
              WHY EDUPATH
            </span>
            <h2 className="font-serif-heading text-3xl sm:text-4xl font-bold text-[#376E7D] tracking-tight">
              A Little Clarity Can Change Your Direction.
            </h2>
            <p className="text-sm text-[#5E8085]">
              Class 10 decisions shouldn't feel rushed or high-pressure. We help you reflect calmly on what matters most.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-[#F5FAF9] border border-[#DCEBEA] hover:border-[#367BA8] transition-all space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#C9E6F8] text-[#367BA8] flex items-center justify-center">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#376E7D]">
                1. Understand Yourself
              </h3>
              <p className="text-xs text-[#5E8085] leading-relaxed">
                Discover your interests, favourite subjects and strengths.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-white border border-[#DCEBEA] hover:border-[#367BA8] transition-all space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#A7D9E6]/60 text-[#376E7D] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#376E7D]">
                2. See Beyond Stream Labels
              </h3>
              <p className="text-xs text-[#5E8085] leading-relaxed">
                Look past Science, Commerce and Arts into real career paths and possibilities.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-[#F5FAF9] border border-[#DCEBEA] hover:border-[#367BA8] transition-all space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#CDEDE2] text-[#278F89] flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#376E7D]">
                3. Practical Considerations
              </h3>
              <p className="text-xs text-[#5E8085] leading-relaxed">
                Think about budget, scholarships and location preferences early.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-white border border-[#DCEBEA] hover:border-[#367BA8] transition-all space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#C9E6F8] text-[#367BA8] flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#376E7D]">
                4. Your Personal Roadmap
              </h3>
              <p className="text-xs text-[#5E8085] leading-relaxed">
                Get a structured view of where you are and where you could go.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section id="how-it-works" className="py-16 lg:py-24 bg-[#F5FAF9] border-b border-[#DCEBEA] scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#367BA8]">
              HOW IT WORKS
            </span>
            <h2 className="font-serif-heading text-3xl sm:text-4xl font-bold text-[#376E7D] tracking-tight">
              Three Simple Steps to Clarity.
            </h2>
            <p className="text-sm text-[#5E8085]">
              Designed specifically for Class 10 students and their parents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-3xl p-8 border border-[#DCEBEA] space-y-4 shadow-2xs relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#C9E6F8] text-[#367BA8] text-xs font-bold flex items-center justify-center">
                1
              </div>
              <h3 className="font-serif-heading text-xl font-bold text-[#376E7D]">
                Tell Us About Yourself
              </h3>
              <p className="text-xs text-[#5E8085] leading-relaxed">
                Share your current subjects, the ones you enjoy most, your hobbies, and what you naturally find interesting. No pressure, no tests.
              </p>
              <div className="pt-2 text-[11px] font-medium text-[#367BA8] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#278F89]" />
                <span>Takes ~5 minutes</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-3xl p-8 border border-[#DCEBEA] space-y-4 shadow-2xs relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#CDEDE2] text-[#278F89] text-xs font-bold flex items-center justify-center">
                2
              </div>
              <h3 className="font-serif-heading text-xl font-bold text-[#376E7D]">
                Review Your Profile
              </h3>
              <p className="text-xs text-[#5E8085] leading-relaxed">
                Check your answers, see how your interests connect, and make sure everything feels accurate before moving forward.
              </p>
              <div className="pt-2 text-[11px] font-medium text-[#278F89] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#278F89]" />
                <span>Always editable</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-3xl p-8 border border-[#DCEBEA] space-y-4 shadow-2xs relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#A7D9E6]/60 text-[#376E7D] text-xs font-bold flex items-center justify-center">
                3
              </div>
              <h3 className="font-serif-heading text-xl font-bold text-[#376E7D]">
                Explore Your Future Profile
              </h3>
              <p className="text-xs text-[#5E8085] leading-relaxed">
                See a clear summary of your educational profile, ready for future pathway recommendations and informed conversations.
              </p>
              <div className="pt-2 text-[11px] font-medium text-[#376E7D] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#278F89]" />
                <span>Your personal summary</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. About EduPath Section */}
      <section id="about" className="py-16 lg:py-24 bg-white border-b border-[#DCEBEA] scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#367BA8]">
                ABOUT EDUPATH
              </span>
              <h2 className="font-serif-heading text-3xl sm:text-4xl font-bold text-[#376E7D] tracking-tight">
                Our Philosophy: Your Future is Bigger Than Any Single Exam.
              </h2>
              <p className="text-sm text-[#5E8085] leading-relaxed">
                EduPath was founded on a simple insight: you don&apos;t have to lock yourself into a single permanent label today. Instead, by reflecting honestly on what you enjoy, your academic comfort levels, and your family&apos;s real budget preferences, you can see the rich spectrum of educational possibilities ahead.
              </p>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2.5 text-xs text-[#376E7D]">
                  <CheckCircle2 className="w-4 h-4 text-[#278F89] shrink-0" />
                  <span>No automated career pigeonholing or forced predictions</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#376E7D]">
                  <CheckCircle2 className="w-4 h-4 text-[#278F89] shrink-0" />
                  <span>Missing marks are never penalized or scored as zero</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#376E7D]">
                  <CheckCircle2 className="w-4 h-4 text-[#278F89] shrink-0" />
                  <span>Complete confidentiality with no identity numbers required</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-[#F5FAF9] border border-[#DCEBEA] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#C9E6F8] text-[#367BA8] flex items-center justify-center shadow-2xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#376E7D]">
                      The EduPath Promise
                    </h4>
                    <span className="text-[11px] text-[#5E8085]">
                      Empowering every Class 10 learner
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-[#5E8085] leading-relaxed">
                  <div className="p-3.5 bg-white rounded-xl border border-[#DCEBEA]">
                    <strong className="text-[#376E7D] block mb-0.5">Every Stream Has Merit:</strong>
                    Whether you are drawn to Pure Sciences, Commerce, Humanities, Applied Arts, or Polytechnic Diplomas, every path has high-impact modern opportunities.
                  </div>
                  <div className="p-3.5 bg-white rounded-xl border border-[#DCEBEA]">
                    <strong className="text-[#376E7D] block mb-0.5">Practical &amp; Affordable:</strong>
                    Education choices must fit family financial comfort. We make budget and scholarship exploration transparent from day one.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Final Call to Action */}
      <section className="py-16 lg:py-24 bg-[#C9E6F8]/30 border-b border-[#DCEBEA] text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <h2 className="font-serif-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-[#376E7D] tracking-tight">
            Take the First Step Towards Your Future.
          </h2>

          <p className="text-base text-[#5E8085] max-w-xl mx-auto">
            You don&apos;t need to have everything figured out yet. Start with what you know about yourself.
          </p>

          <div className="pt-2 flex flex-col items-center justify-center gap-3">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={onStartJourney}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-semibold text-white bg-[#367BA8] hover:bg-[#2e688e] active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <span>
                    {hasCompletedProfile ? 'View My Future Profile' : 'Start My Journey'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-semibold text-[#5E8085] bg-[#DCEBEA]/90 border border-[#DCEBEA] rounded-xl shadow-none cursor-not-allowed select-none opacity-85"
                  title="Sign in or create an account to begin your journey"
                >
                  <span>Start My Journey</span>
                  <ArrowRight className="w-4 h-4 text-[#5E8085]/70" />
                </button>
              )}

              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => onNavigate('/register')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#367BA8] bg-white hover:bg-[#F5FAF9] border border-[#DCEBEA] rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <span>Create an Account</span>
                </button>
              )}
            </div>

            {!isAuthenticated && (
              <div className="flex items-center gap-2 text-xs text-[#5E8085] bg-white/80 px-3.5 py-1.5 rounded-lg border border-[#DCEBEA]">
                <Lock className="w-3.5 h-3.5 text-[#367BA8]" />
                <span>Sign in or create an account to begin your journey.</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-[#5E8085] pt-1">
            Free discovery for Class 10 students &middot; Takes ~5 minutes &middot; Saved securely to your account
          </div>
        </div>
      </section>
    </div>
  );
};
