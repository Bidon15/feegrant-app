import { Check } from "lucide-react";

interface AuthStepperProps {
  currentStep: number;
  steps: string[];
}

const AuthStepper = ({ currentStep, steps }: AuthStepperProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all font-mono text-sm ${
                index < currentStep
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  : index === currentStep
                  ? "bg-primary/20 text-primary border border-primary shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                  : "bg-muted/50 text-muted-foreground border border-border"
              }`}
            >
              {index < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                <span>{index + 1}</span>
              )}
              {/* Active step glow effect */}
              {index === currentStep && (
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
              )}
            </div>
            <span
              className={`text-sm font-mono hidden sm:block transition-colors ${
                index < currentStep
                  ? "text-primary"
                  : index === currentStep
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {step}
            </span>
          </div>

          {/* Connector line - network style */}
          {index < steps.length - 1 && (
            <div className="relative w-8 sm:w-12 mx-2">
              <div
                className={`h-px transition-all ${
                  index < currentStep
                    ? "bg-gradient-to-r from-primary to-primary shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                    : "bg-border"
                }`}
              />
              {/* Animated pulse for active connection */}
              {index === currentStep - 1 && (
                <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AuthStepper;
