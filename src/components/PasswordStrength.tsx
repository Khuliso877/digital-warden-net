import { useMemo } from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Contains a number", test: (p) => /\d/.test(p) },
  { label: "Contains special character (!@#$%^&*)", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const getStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: "", color: "" };
  
  const passedRequirements = requirements.filter((req) => req.test(password)).length;
  
  if (passedRequirements <= 1) {
    return { score: 1, label: "Weak", color: "bg-destructive" };
  } else if (passedRequirements <= 2) {
    return { score: 2, label: "Fair", color: "bg-orange-500" };
  } else if (passedRequirements <= 3) {
    return { score: 3, label: "Good", color: "bg-yellow-500" };
  } else if (passedRequirements <= 4) {
    return { score: 4, label: "Strong", color: "bg-emerald-500" };
  } else {
    return { score: 5, label: "Excellent", color: "bg-emerald-600" };
  }
};

const generateStrongPassword = (): string => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

export const PasswordStrength = ({ password, showRequirements = true }: PasswordStrengthProps) => {
  const strength = useMemo(() => getStrength(password), [password]);
  const metRequirements = useMemo(
    () => requirements.map((req) => ({ ...req, met: req.test(password) })),
    [password]
  );

  if (!password) return null;

  return (
    <div className="mt-2 space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            "font-medium",
            strength.score <= 2 ? "text-destructive" : 
            strength.score <= 3 ? "text-yellow-600" : "text-emerald-600"
          )}>
            {strength.label}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", strength.color)}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-1.5">
          {metRequirements.map((req, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                req.met ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              {req.met ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warning for weak passwords */}
      {strength.score <= 2 && (
        <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-md text-xs text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Weak passwords are easily guessable. Consider using a mix of characters, numbers, and symbols.
          </span>
        </div>
      )}
    </div>
  );
};

export { generateStrongPassword, getStrength, requirements };
