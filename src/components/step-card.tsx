import type { LucideIcon } from "lucide-react";

interface StepCardProps {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

const StepCard = ({ number, icon: Icon, title, description }: StepCardProps) => {
  return (
    <div className="relative flex flex-col items-center text-center group pt-4">
      {/* Step number badge */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center z-10">
        {number}
      </div>

      {/* Icon circle */}
      <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center mb-4 mt-2 group-hover:glow-purple transition-all duration-300">
        <Icon className="w-8 h-8 text-primary" />
      </div>

      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
};

export default StepCard;
