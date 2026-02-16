import { FileText, Sparkles, Users, FlaskConical, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: FileText,
    title: 'PDF to Interactive',
    description: 'Upload any scientific PDF or paste a DOI. Our AI pipeline transforms it into a modular, navigable research article.',
  },
  {
    icon: Users,
    title: 'Persona-Tailored Views',
    description: 'Read as an expert, student, reviewer, or journalist. Each persona surfaces the insights most relevant to you.',
  },
  {
    icon: Sparkles,
    title: 'AI-Enriched Layers',
    description: 'Automated summaries, methodology critiques, statistical annotations, and contextual cross-references.',
  },
  {
    icon: FlaskConical,
    title: 'Replication Assistant',
    description: 'Step-by-step replication guides, equipment lists, and a digital lab environment for virtual experimentation.',
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header — Nature-style thin top bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="container flex h-14 items-center justify-between">
          <span className="text-2xl font-serif font-bold tracking-tight text-foreground">
            Paper++
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-sans text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#" className="hover:text-foreground transition-colors">About</a>
            <a href="#" className="hover:text-foreground transition-colors">Subscribe</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="font-sans" onClick={() => navigate('/researcher-home')}>
              Log in
            </Button>
            <Button size="sm" className="font-sans bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate('/researcher-home')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — editorial, left-aligned like Nature */}
      <section className="border-b border-border">
        <div className="container py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-sans font-semibold uppercase tracking-widest text-accent">
              Research Reimagined
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              The interactive layer<br />on top of science
            </h1>
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground font-sans max-w-2xl">
              Transform static scientific PDFs into interactive, persona-tailored articles. 
              Upload a paper, choose your perspective, and discover research like never before.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <Button size="lg" className="gap-2 font-sans bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate('/researcher-home')}>
                Upload a Paper
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" className="font-sans">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features — clean grid, Nature-style cards with top red border */}
      <section id="features" className="py-20 bg-secondary/40">
        <div className="container">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              A new layer on top of science
            </h2>
            <p className="text-muted-foreground font-sans text-base">
              Paper++ enriches every paper with AI-driven insights, making research accessible, verifiable, and interactive.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded bg-accent/10">
                  <feature.icon className="h-4.5 w-4.5 text-accent" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground font-sans">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              Ready to transform how you read research?
            </h2>
            <p className="mb-8 text-muted-foreground font-sans">
              Join researchers who are already using Paper++ to accelerate their understanding.
            </p>
            <Button
              size="lg"
              className="gap-2 font-sans bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => navigate('/researcher-home')}
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-sans">© 2026 Paper++. All rights reserved.</span>
          <span className="text-sm font-serif font-bold text-foreground">Paper++</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
