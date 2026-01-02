import { Layout } from '@/components/layout/Layout';
import { HeroSearch } from '@/components/home/HeroSearch';
import { FeaturedListings } from '@/components/home/FeaturedListings';
import { VerifiedAgents } from '@/components/home/VerifiedAgents';
import { CTASection } from '@/components/home/CTASection';

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-6">
              <span className="text-sm font-semibold">🎓 Trusted by 10,000+ Students</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 font-display">
              Find Your Perfect
              <span className="text-gradient block mt-2">Student Accommodation</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Connect with verified agents and discover safe, affordable housing near your university. 
              No stress, no scams — just your ideal home.
            </p>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <HeroSearch />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-xl mx-auto mt-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary font-display">500+</div>
              <div className="text-sm text-muted-foreground tracking-wide">Verified Listings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary font-display">100+</div>
              <div className="text-sm text-muted-foreground tracking-wide">Verified Agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary font-display">10K+</div>
              <div className="text-sm text-muted-foreground tracking-wide">Happy Students</div>
            </div>
          </div>
        </div>
      </section>

      <FeaturedListings />
      <VerifiedAgents />
      <CTASection />
    </Layout>
  );
};

export default Index;
