import { CheckCircle, Shield, Star } from 'lucide-react';

const features = [
  {
    icon: CheckCircle,
    title: 'Verified Agents',
    description: 'All agents undergo strict verification including ID verification and property ownership proof.',
  },
  {
    icon: Shield,
    title: 'Secure Bookings',
    description: 'Book property inspections safely through our platform with full transparency.',
  },
  {
    icon: Star,
    title: 'Trusted Reviews',
    description: 'Real reviews from verified students help you make informed decisions.',
  },
];

export function VerifiedAgents() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-4">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-semibold">Trust & Safety</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-display">Why Choose UNILET?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We connect students with verified accommodation providers, ensuring a safe and transparent rental experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center p-8 rounded-2xl bg-card border shadow-card hover:shadow-card-hover transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-primary/10 text-primary mb-6">
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3 font-display">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
