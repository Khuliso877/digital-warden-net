import { Button } from "@/components/ui/button";
import { Shield, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-shield.jpg";

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />
      
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-accent rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="container relative z-10 px-4 py-20 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-feature border border-primary/20 rounded-full">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Safety by Design</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              Protecting{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Digital Spaces
              </span>{" "}
              for Everyone
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
              GuardianNet AI uses advanced artificial intelligence to detect, prevent, 
              and respond to digital violence in real-time. Empowering women and girls 
              across Africa with proactive protection.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-medium hover:shadow-strong transition-all"
                onClick={() => navigate("/auth")}
              >
                <Shield className="w-5 h-5 mr-2" />
                Get Started Free
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-primary/30 hover:bg-gradient-feature transition-all"
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Protection</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="text-3xl font-bold text-primary">AI</div>
                <div className="text-sm text-muted-foreground">Powered</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="text-3xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground">Private</div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-strong">
              <img 
                src={heroImage} 
                alt="Digital protection shield network" 
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-hero opacity-10" />
            </div>
            
            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute -bottom-6 -left-6 bg-card p-6 rounded-xl shadow-strong border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-hero rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-bold text-lg">Active Protection</div>
                  <div className="text-sm text-muted-foreground">Real-time monitoring</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
