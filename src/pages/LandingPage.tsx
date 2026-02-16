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
      {/* Header — Nature-style */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
        <div className="container flex h-14 items-center justify-between">
          <span className="text-xl font-serif font-bold tracking-tight text-foreground">
            Paper++
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-sans text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#" className="hover:text-foreground transition-colors">About</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="font-sans text-muted-foreground" onClick={() => navigate('/researcher-home')}>
              Log in
            </Button>
            <Button size="sm" className="font-sans rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-5" onClick={() => navigate('/researcher-home')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — matching the reference image style */}
      <section className="bg-card">
        <div className="container py-20 md:py-28 lg:py-32">
          <div className="max-w-2xl">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-foreground mb-2">
              Paper++
            </h1>
            <p className="text-2xl sm:text-3xl font-sans font-light text-nature-teal mb-6">
              Interactive research publication
            </p>
            <p className="text-sm font-sans text-muted-foreground mb-6">
              Powered by <span className="font-semibold text-foreground">Springer Nature Content Innovation</span>
            </p>
            <p className="text-base leading-relaxed text-muted-foreground font-sans max-w-lg mb-8">
              Experience research publications like never before.
              Explore modular content, interactive visualizations, and personalized insights.
            </p>
            <Button
              size="lg"
              className="gap-2 font-sans rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 text-base"
              onClick={() => navigate('/researcher-home')}
            >
              Start Discovery
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t border-border">
        <div className="container">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              A new layer on top of science
            </h2>
            <p className="text-muted-foreground font-sans">
              Paper++ enriches every paper with AI-driven insights, making research accessible, verifiable, and interactive.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
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
      <section className="py-20 bg-secondary">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              Ready to transform how you read research?
            </h2>
            <p className="mb-8 text-muted-foreground font-sans">
              Join researchers already using Paper++ to accelerate their understanding.
            </p>
            <Button
              size="lg"
              className="gap-2 font-sans rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8"
              onClick={() => navigate('/researcher-home')}
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="container flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-sans">© 2026 Paper++. All rights reserved.</span>
          <span className="text-sm font-serif font-bold text-foreground">Paper++</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
