import { useEffect, useRef, useState } from 'react';
import { Users, Sparkles, FlaskConical, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const features = [
{
  icon: Users,
  title: 'Persona-Tailored Views',
  description:
  'Read as an expert, student, reviewer, or journalist. Each persona surfaces the insights most relevant to you.'
},
{
  icon: Sparkles,
  title: 'AI-Enriched Layers',
  description:
  'From insights to actions: interactive data, tweakable parameters, reusable workflows, and real‑time comparison with your own results.'
},
{
  icon: FlaskConical,
  title: 'Agentic Replication Assistant',
  description:
  'Find everything you need to reproduce and speed up your work through community-engaging tools, and a step-by-step replication checklist — check your resources and fill the missing ones in a timely fashion.'
}];


// Lightweight IntersectionObserver fade-in hook
function useFadeInRefs(count: number) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [visible, setVisible] = useState<boolean[]>(Array(count).fill(false));

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    refs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setVisible((v) => {
                const next = [...v];
                next[i] = true;
                return next;
              });
            }, i * 120);
            obs.disconnect();
          }
        },
        { threshold: 0.15 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return { refs, visible };
}

// Animated particle network canvas
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();

    const NUM = 55;
    const MAX_DIST = 130;

    type Particle = {
      x: number;y: number;
      vx: number;vy: number;
      r: number;
    };

    const particles: Particle[] = Array.from({ length: NUM }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.55,
      r: Math.random() * 2.5 + 1.2
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Update positions
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.35;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }} />);


}

const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { refs: cardRefs, visible: cardVisible } = useFadeInRefs(features.length);

  // Parallax: shift hero content slightly on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const y = window.scrollY;
        heroRef.current.style.transform = `translateY(${y * 0.18}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex flex-col leading-tight">
            <span className="logo-brand text-lg" style={{ color: 'hsl(var(--hero-teal))' }}>
              Springer Nature – Paper<span style={{ color: 'hsl(var(--hero-teal-mid))' }}>++</span>
            </span>
            <span
              className="text-[10px] font-normal tracking-wide"
              style={{ color: 'hsl(var(--hero-teal) / 0.65)' }}>
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
              onClick={() => navigate('/auth')}>
              Log in
            </Button>
            <Button
              size="sm"
              className="font-sans rounded-full px-5"
              onClick={() => navigate('/hub')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero — teal gradient, reduced height ── */}
      <section
        className="relative overflow-hidden"
        style={{
          minHeight: '62vh',
          background:
          'linear-gradient(100deg, hsl(var(--hero-teal)) 0%, hsl(var(--hero-teal-mid)) 60%, hsl(197 55% 36%) 100%)'
        }}>

        {/* Subtle noise-texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'300\' height=\'300\' filter=\'url(%23n)\'/%3E%3C/svg%3E")'
          }} />

        {/* Particle network — right half */}
        <div className="absolute right-0 top-0 w-1/2 h-full pointer-events-none">
          <ParticleCanvas />
        </div>

        {/* Parallax content wrapper */}
        <div
          ref={heroRef}
          className="container relative z-10 flex flex-col justify-center"
          style={{ minHeight: '62vh', paddingTop: '4rem', paddingBottom: '4rem' }}>

          <div className="max-w-2xl">
            {/* Main headline */}
            <h1
              className="mb-3 text-6xl sm:text-7xl lg:text-8xl font-bold leading-[1.02] tracking-tight"
              style={{ color: 'hsl(var(--hero-teal-foreground))' }}>
              Paper<span style={{ color: 'hsl(197 55% 72%)' }}>++</span>
            </h1>

            {/* Tagline */}
            <p
              className="mb-6 text-xl sm:text-2xl font-light"
              style={{ color: 'hsl(var(--hero-teal-foreground) / 0.85)' }}>
              Interactive research publication
            </p>

            {/* Body copy */}
            <p
              className="mb-8 max-w-lg text-base leading-relaxed sm:text-lg"
              style={{ color: 'hsl(var(--hero-teal-foreground) / 0.75)' }}>
              Turn scientific knowledge from something you read into something you operate on.
            </p>

            {/* CTA */}
            <Button
              size="lg"
              className="gap-2 rounded-full border-2 px-8 text-base font-semibold transition-all duration-200"
              style={{
                background: 'transparent',
                borderColor: 'hsl(var(--hero-teal-foreground) / 0.8)',
                color: 'hsl(var(--hero-teal-foreground))'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                'hsl(var(--hero-teal-foreground) / 0.12)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
              onClick={() => navigate('/hub')}>
              Start Discovery
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-20"
          style={{
            background: 'linear-gradient(to bottom, transparent, hsl(var(--background)))'
          }} />
      </section>

      {/* ── Feature Cards ── */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="max-w-2xl mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              A new layer on top of science
            </h2>
            <p className="text-muted-foreground font-sans leading-relaxed">
              Paper++ enriches every paper with AI-driven insights, making research accessible,
              verifiable, and interactive.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) =>
            <div
              key={feature.title}
              ref={(el) => {cardRefs.current[i] = el;}}
              className="rounded-xl border border-border bg-card p-7 transition-all duration-700"
              style={{
                opacity: cardVisible[i] ? 1 : 0,
                transform: cardVisible[i] ? 'translateY(0)' : 'translateY(28px)',
                boxShadow: 'none'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 4px 24px 0 hsl(var(--primary) / 0.08)';
                (e.currentTarget as HTMLDivElement).style.borderColor =
                'hsl(var(--primary) / 0.3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.borderColor = '';
              }}>
                <div
                className="mb-5 flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: 'hsl(var(--primary) / 0.08)' }}>
                  <feature.icon className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground font-sans">
                  {feature.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 border-t border-border">
        <div className="container">
          














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
    </div>);

};

export default LandingPage;