import { Link } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 mb-4">
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-semibold">For Property Owners</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-display">
              List Your Property on UNILET
            </h2>
            <p className="text-primary-foreground/80 max-w-xl leading-relaxed">
              Join our network of verified agents and reach thousands of students looking for accommodation near universities.
            </p>
          </div>
          
          <Button
            variant="secondary"
            size="xl"
            asChild
            className="shrink-0"
          >
            <Link to="/auth/agent-signup">
              Become an Agent
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
