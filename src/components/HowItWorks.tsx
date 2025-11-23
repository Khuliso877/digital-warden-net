import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Connect Your Platforms",
    description: "Seamlessly integrate with your social media and messaging apps in seconds."
  },
  {
    number: "02",
    title: "AI Monitors in Real-Time",
    description: "Our advanced AI continuously analyzes content for potential threats and harmful behavior."
  },
  {
    number: "03",
    title: "Get Instant Alerts",
    description: "Receive proactive notifications before harmful content reaches you, with full control over your response."
  },
  {
    number: "04",
    title: "Take Action",
    description: "Document incidents, report violations, and access support resources—all from one place."
  }
];

export const HowItWorks = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            How{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              GuardianNet
            </span>{" "}
            Works
          </h2>
          <p className="text-xl text-muted-foreground">
            Four simple steps to comprehensive digital protection
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex gap-8 items-start mb-12 group">
                {/* Number badge */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-medium group-hover:scale-110 transition-transform">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow icon (except last) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute left-10 top-24 text-primary/30">
                    <ArrowRight className="w-6 h-6 rotate-90" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
