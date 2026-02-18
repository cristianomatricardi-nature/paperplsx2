import { useEffect, useRef, useState } from 'react';
import { Users, Sparkles, FlaskConical, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: Users,
    title: 'Persona-Tailored Views',
    description:
      'Read as an expert, student, reviewer, or journalist. Each persona surfaces the insights most relevant to you.',
    visual: (
      <div className="w-full h-full flex items-center justify-center">
        <div className="space-y-3 w-full max-w-[220px]">
          {['Expert Researcher', 'Student', 'Reviewer', 'Science Journalist'].map((p, i) => (
            <div
              key={p}
              className="flex items-center gap-3 rounded-lg px-4 py-2.5"
              style={{
                background: i === 0 ? 'hsl(var(--hero-teal) / 0.12)' : 'hsl(var(--muted) / 0.5)',
                border: i === 0 ? '1px solid hsl(var(--hero-teal) / 0.3)' : '1px solid transparent',
              }}
            >
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'hsl(var(--hero-teal) / 0.15)', color: 'hsl(var(--hero-teal))' }}
              >
                {p[0]}
              </div>
              <span className="text-sm font-medium text-foreground">{p}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Sparkles,
    title: 'AI-Enriched Layers',
    description:
      'From insights to actions: interactive data, tweakable parameters, reusable workflows, and real‑time comparison with your own results.',
    visual: (
      <div className="w-full h-full flex items-center justify-center">
        <div className="space-y-2 w-full max-w-[220px]">
          {[
            { label: 'Reproducibility', val: 87 },
            { label: 'Impact Score', val: 72 },
            { label: 'Data Quality', val: 94 },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground font-sans">{label}</span>
                <span className="font-semibold" style={{ color: 'hsl(var(--hero-teal))' }}>{val}%</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'hsl(var(--muted))' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${val}%`, background: 'hsl(var(--hero-teal))' }}
                />
              </div>
            </div>
          ))}
          <div
            className="mt-4 rounded-lg p-3 text-xs font-sans"
            style={{ background: 'hsl(var(--hero-teal) / 0.08)', color: 'hsl(var(--hero-teal))' }}
          >
            ✦ Parameter sensitivity detected in Figure 3
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: FlaskConical,
    title: 'Agentic Replication Assistant',
    description:
      'Find everything you need to reproduce and speed up your work through community-engaging tools, and a step-by-step replication checklist — check your resources and fill the missing ones in a timely fashion.',
    visual: (
      <div className="w-full h-full flex items-center justify-center">
        <div className="space-y-2 w-full max-w-[220px]">
          {[
            { step: 'Dataset access', done: true },
            { step: 'Equipment check', done: true },
            { step: 'Protocol validated', done: true },
            { step: 'Run experiment', done: false },
            { step: 'Compare results', done: false },
          ].map(({ step, done }) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
                style={{
                  background: done ? 'hsl(var(--hero-teal))' : 'hsl(var(--muted))',
                  color: done ? 'white' : 'hsl(var(--muted-foreground))',
                }}
              >
                {done ? '✓' : '○'}
              </div>
              <span
                className="text-sm font-sans"
                style={{
                  color: done ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                  textDecoration: done ? 'none' : 'none',
                }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

// Hook: track scroll progress of a section (0 → 1 as it scrolls through viewport)
function useScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 = top of element at bottom of viewport, 1 = bottom of element at top of viewport
      const p = 1 - rect.bottom / (vh + rect.height);
      setProgress(Math.max(0, Math.min(1, p)));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { ref, progress };
}

// Individual parallax card — image and text converge from sides
function ParallaxCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const { ref, progress } = useScrollProgress();
  // Map progress 0.1→0.5 to convergence 0→1
  const convergence = Math.max(0, Math.min(1, (progress - 0.05) / 0.35));
  // Opacity: fade in 0.1→0.3, fade out 0.7→0.95
  const opacity =
    progress < 0.05
      ? 0
      : progress < 0.25
      ? (progress - 0.05) / 0.2
      : progress > 0.72
      ? 1 - (progress - 0.72) / 0.2
      : 1;

  const textLeft = index % 2 === 0;
  const textSlide = textLeft ? -80 * (1 - convergence) : 80 * (1 - convergence);
  const visualSlide = textLeft ? 80 * (1 - convergence) : -80 * (1 - convergence);

  return (
    <div
      ref={ref}
      className="sticky top-20 h-screen flex items-center"
      style={{ opacity: Math.max(0, Math.min(1, opacity)) }}
    >
      <div className="container">
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-16 items-center ${
            textLeft ? '' : 'md:[direction:rtl]'
          }`}
        >
          {/* Text side */}
          <div
            className="md:[direction:ltr]"
            style={{ transform: `translateX(${textSlide}px)`, transition: 'transform 0.05s linear' }}
          >
            <div
              className="mb-5 flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: 'hsl(var(--primary) / 0.08)' }}
            >
              <feature.icon className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-4">{feature.title}</h3>
            <p className="text-lg leading-relaxed text-muted-foreground font-sans max-w-md">
              {feature.description}
            </p>
          </div>

          {/* Visual side */}
          <div
            className="md:[direction:ltr]"
            style={{ transform: `translateX(${visualSlide}px)`, transition: 'transform 0.05s linear' }}
          >
            <div
              className="rounded-2xl border border-border h-64 md:h-80"
              style={{ background: 'hsl(var(--card))' }}
            >
              {feature.visual}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

  // Hero parallax
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.2}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-background">
      {/* ── Sticky Header ── */}
      <header className="fixed top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex flex-col leading-tight">
            <span className="logo-brand text-lg" style={{ color: 'hsl(var(--hero-teal))' }}>
              Springer Nature – Paper<span style={{ color: 'hsl(var(--hero-teal-mid))' }}>++</span>
            </span>
            <span
              className="text-[10px] font-normal tracking-wide"
              style={{ color: 'hsl(var(--hero-teal) / 0.65)' }}
            >
              Powered by Content Innovation department
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-sans text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="font-sans text-muted-foreground"
              onClick={() => navigate('/auth')}
            >
              Log in
            </Button>
            <Button
              size="sm"
              className="font-sans rounded-full px-5"
              onClick={() => navigate('/hub')}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero — compact, teal gradient ── */}
      <section
        className="relative overflow-hidden flex items-center"
        style={{
          height: '70vh',
          minHeight: '480px',
          background:
            'linear-gradient(100deg, hsl(var(--hero-teal)) 0%, hsl(var(--hero-teal-mid)) 60%, hsl(197 55% 36%) 100%)',
        }}
      >
        {/* Noise overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'300\' height=\'300\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />

        {/* Parallax content */}
        <div ref={heroRef} className="container relative z-10 pt-14">
          <div className="max-w-2xl">
            <h1
              className="mb-3 text-6xl sm:text-7xl lg:text-8xl font-bold leading-[1.02] tracking-tight"
              style={{ color: 'hsl(var(--hero-teal-foreground))' }}
            >
              Paper<span style={{ color: 'hsl(197 55% 72%)' }}>++</span>
            </h1>

            <p
              className="mb-6 text-xl sm:text-2xl font-light"
              style={{ color: 'hsl(var(--hero-teal-foreground) / 0.85)' }}
            >
              Interactive research publication
            </p>

            <p
              className="mb-8 max-w-lg text-base leading-relaxed sm:text-lg"
              style={{ color: 'hsl(var(--hero-teal-foreground) / 0.75)' }}
            >
              Turn scientific knowledge from something you read into something you operate on.
            </p>

            <Button
              size="lg"
              className="gap-2 rounded-full border-2 px-8 text-base font-semibold transition-all duration-200"
              style={{
                background: 'transparent',
                borderColor: 'hsl(var(--hero-teal-foreground) / 0.8)',
                color: 'hsl(var(--hero-teal-foreground))',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'hsl(var(--hero-teal-foreground) / 0.12)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
              onClick={() => navigate('/hub')}
            >
              Start Discovery
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-20"
          style={{ background: 'linear-gradient(to bottom, transparent, hsl(var(--background)))' }}
        />
      </section>

      {/* ── Section header ── */}
      <div id="features" className="container pt-24 pb-8">
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold text-foreground mb-3">A new layer on top of science</h2>
          <p className="text-muted-foreground font-sans leading-relaxed">
            Paper++ enriches every paper with AI-driven insights, making research accessible,
            verifiable, and interactive.
          </p>
        </div>
      </div>

      {/* ── Parallax scrolling cards ── */}
      <div style={{ height: `${features.length * 180}vh` }} className="relative">
        {features.map((feature, i) => (
          <ParallaxCard key={feature.title} feature={feature} index={i} />
        ))}
      </div>

      {/* ── CTA ── */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              Ready to transform how you read research?
            </h2>
            <p className="mb-8 text-muted-foreground font-sans">
              Join researchers already using Paper++ to accelerate their understanding.
            </p>
            <Button
              size="lg"
              className="gap-2 font-sans rounded-full px-8"
              onClick={() => navigate('/hub')}
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="container flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-sans">
            © 2026 Paper++. All rights reserved.
          </span>
          <div className="flex flex-col items-end leading-tight">
            <span className="logo-brand text-sm" style={{ color: 'hsl(var(--hero-teal))' }}>
              Springer Nature – Paper<span style={{ color: 'hsl(var(--hero-teal-mid))' }}>++</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
