import { motion } from "framer-motion";
import { TrendingDown, Shield, Users, Globe } from "lucide-react";

const stats = [
  {
    icon: TrendingDown,
    value: "85%",
    label: "Reduction in harassment incidents",
    description: "Users report significant decrease in harmful interactions"
  },
  {
    icon: Shield,
    value: "10M+",
    label: "Threats detected daily",
    description: "Real-time protection across platforms"
  },
  {
    icon: Users,
    value: "500K+",
    label: "Protected users",
    description: "Women and girls across Africa"
  },
  {
    icon: Globe,
    value: "15+",
    label: "Countries supported",
    description: "Growing Pan-African coverage"
  }
];

export const Impact = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-95" />
      
      <div className="container relative z-10 px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 text-primary-foreground"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Making Real Impact
          </h2>
          <p className="text-xl text-primary-foreground/90">
            Transforming digital spaces across Africa, one user at a time
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center text-primary-foreground"
              >
                <div className="inline-flex w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm items-center justify-center mb-4">
                  <Icon className="w-8 h-8" />
                </div>
                <div className="text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-xl font-semibold mb-2">{stat.label}</div>
                <div className="text-primary-foreground/80 text-sm">
                  {stat.description}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
