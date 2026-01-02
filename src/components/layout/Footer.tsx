import { Link } from 'react-router-dom';
import { Home, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Home className="icon-md text-primary-foreground" />
              </div>
              <span className="text-xl font-bold font-display">UNILET</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              The trusted platform connecting students with verified accommodation near universities.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 font-display">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/search" className="hover:text-background transition-colors">
                  Find Properties
                </Link>
              </li>
              <li>
                <Link to="/auth/agent-signup" className="hover:text-background transition-colors">
                  List Your Property
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-background transition-colors">
                  Blog & Guides
                </Link>
              </li>
            </ul>
          </div>

          {/* For Students */}
          <div>
            <h4 className="font-semibold mb-4 font-display">For Students</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/auth/signup" className="hover:text-background transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/search" className="hover:text-background transition-colors">
                  Browse Listings
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-background transition-colors">
                  My Bookings
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 font-display">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="icon-sm" />
                support@unilet.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="icon-sm" />
                +234 800 123 4567
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="icon-sm" />
                Lagos, Nigeria
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-muted-foreground/20 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} UNILET. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
