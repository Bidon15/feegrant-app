import type { LucideIcon } from "lucide-react";

interface StepCardProps {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

const StepCard = ({ number, icon: Icon, title, description }: StepCardProps) => {
  return (
    <div className="relative flex flex-col items-center text-center group">
      {/* Step number - terminal style */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
        <div className="font-mono text-xs px-2 py-0.5 rounded bg-primary/20 border border-primary/30 text-primary">
          0{number}
        </div>
      </div>

      {/* Icon container - network node style */}
      <div className="relative mt-4 mb-6">
        {/* Outer glow ring */}
        <div className="absolute inset-0 w-20 h-20 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Connecting dot indicators */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/30 group-hover:bg-primary/60 transition-colors" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/30 group-hover:bg-primary/60 transition-colors" />

        {/* Main icon container */}
        <div className="relative w-20 h-20 glass rounded-2xl flex items-center justify-center border-primary/20 group-hover:border-primary/40 transition-all duration-300">
          {/* Inner gradient background */}
          <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-primary/10 to-transparent" />

          {/* Icon */}
          <Icon className="w-8 h-8 text-primary relative z-10" />

          {/* Pulse effect on hover */}
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 group-hover:border-primary/30 group-hover:animate-pulse transition-all" />
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground text-sm max-w-[200px]">{description}</p>

      {/* Bottom connection line (visible on mobile) */}
      <div className="md:hidden absolute -bottom-4 left-1/2 w-px h-8 bg-gradient-to-b from-primary/30 to-transparent" />
    </div>
  );
};

export default StepCard;
