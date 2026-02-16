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
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-serif font-bold text-foreground">Paper++</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/researcher-home')}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate('/researcher-home')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 to-background" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground font-sans animate-fade-in">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              AI-powered research reading experience
            </div>
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Research papers,{' '}
              <span className="text-accent">reimagined</span>
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-muted-foreground font-sans max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Transform static scientific PDFs into interactive, persona-tailored articles. 
              Upload a paper, choose your perspective, and discover research like never before.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button size="lg" className="gap-2 text-base px-8" onClick={() => navigate('/researcher-home')}>
                Upload a Paper
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" className="text-base px-8">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              A new layer on top of science
            </h2>
            <p className="text-muted-foreground font-sans">
              Paper++ enriches every paper with AI-driven insights, making research accessible, verifiable, and interactive.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <feature.icon className="h-5 w-5 text-accent" />
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
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to transform how you read research?
            </h2>
            <p className="mb-8 text-primary-foreground/70 font-sans">
              Join researchers who are already using Paper++ to accelerate their understanding.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 text-base px-8"
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
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <FileText className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-serif font-bold text-foreground">Paper++</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
