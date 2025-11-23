import { Shield, Eye, Users, Brain, FileText, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Detection",
    description: "Advanced NLP and machine learning analyze content in real-time to identify threats before they cause harm.",
    color: "primary"
  },
  {
    icon: Eye,
    title: "Proactive Alerts",
    description: "Receive immediate notifications about potentially harmful content with options to review before full exposure.",
    color: "secondary"
  },
  {
    icon: Shield,
    title: "Customizable Filters",
    description: "Define your own safety thresholds and keywords to create a personalized protection experience.",
    color: "accent"
  },
  {
    icon: FileText,
    title: "Evidence Collection",
    description: "Easy documentation and timestamping of incidents for robust reporting to authorities or platforms.",
    color: "primary"
  },
  {
    icon: Users,
    title: "Community Support",
    description: "Connect with trusted contacts and access curated resources for survivors of digital violence.",
    color: "secondary"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Real-time analysis with response times under 500ms to protect you without slowing you down.",
    color: "accent"
  }
];

export const Features = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-feature" />
      
      <div className="container relative z-10 px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Safety Features Built for{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              You
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Comprehensive protection powered by cutting-edge AI technology
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="p-6 h-full bg-gradient-card border-border/50 hover:shadow-medium transition-all group cursor-pointer">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-${feature.color} bg-opacity-10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-7 h-7 text-${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
