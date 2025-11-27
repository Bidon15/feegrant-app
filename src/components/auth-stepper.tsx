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
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                index < currentStep
                  ? "bg-primary text-primary-foreground"
                  : index === currentStep
                  ? "bg-primary/20 text-primary border-2 border-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {index < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            <span
              className={`text-sm font-medium hidden sm:block ${
                index <= currentStep ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {step}
            </span>
          </div>

          {/* Connector line */}
          {index < steps.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 mx-2 ${
                index < currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default AuthStepper;
