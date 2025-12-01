import { Shield } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container px-4 py-12 mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">GuardianNet AI</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Empowering digital safety across Africa through AI-powered protection 
              and community support.
            </p>
            <div className="text-sm text-muted-foreground">
              Part of Power Hacks 2025 - 16 Days of Activism
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a></li>
              <li><a href="/dashboard" className="hover:text-primary transition-colors">Dashboard</a></li>
              <li><a href="/safety-filters" className="hover:text-primary transition-colors">Safety Filters</a></li>
              <li><a href="/report-incident" className="hover:text-primary transition-colors">Report Incident</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#resources" className="hover:text-primary transition-colors">Resources</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#help" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#contact" className="hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#safety-resources" className="hover:text-primary transition-colors">Safety Resources</a></li>
              <li><a href="#emergency-hotlines" className="hover:text-primary transition-colors">Emergency Hotlines</a></li>
              <li><a href="#privacy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#terms" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#documentation" className="hover:text-primary transition-colors">Documentation</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground">Phone:</span>
                <a href="tel:0766708702" className="hover:text-primary transition-colors">0766708702</a>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground">Email:</span>
                <div className="flex flex-col gap-1">
                  <a href="mailto:kmudau872@gmail.com" className="hover:text-primary transition-colors break-all">kmudau872@gmail.com</a>
                  <a href="mailto:bunmiadesanmi8@gmail.com" className="hover:text-primary transition-colors break-all">bunmiadesanmi8@gmail.com</a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center text-muted-foreground text-sm">
          <p>© 2024 GuardianNet AI. Designed by Khuliso Mudau & Adesanmi Olubunmi Janet. All rights reserved.</p>
          <p className="mt-2">Built with ❤️ for a safer digital Africa</p>
        </div>
      </div>
    </footer>
  );
};
