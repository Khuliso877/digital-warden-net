import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export const CTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-feature" />
      
      <div className="container relative z-10 px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-gradient-card border border-border rounded-3xl p-12 shadow-strong text-center">
            <div className="inline-flex w-20 h-20 rounded-2xl bg-gradient-hero items-center justify-center mb-6">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Ready to Take Control of Your{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Digital Safety?
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of women and girls across Africa who are creating safer 
              digital spaces with GuardianNet AI. Start your protection today—free.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-medium hover:shadow-strong transition-all"
                onClick={() => navigate("/auth")}
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-primary/30 hover:bg-gradient-feature transition-all"
                onClick={() => navigate("/auth")}
              >
                Schedule a Demo
              </Button>
            </div>
            
            <div className="mt-8 text-sm text-muted-foreground">
              No credit card required • 100% privacy guaranteed • Free forever plan
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
