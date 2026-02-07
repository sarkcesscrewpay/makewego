// client/src/components/PhoneInput.tsx
import PhoneInputWithCountry from "react-phone-number-input";
import { isValidPhoneNumber, parsePhoneNumber, CountryCode } from "libphonenumber-js";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string | undefined) => void;
  defaultCountry?: CountryCode;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, defaultCountry = "GH", placeholder = "Enter phone number", className, disabled, error }, ref) => {
    return (
      <div className="space-y-1">
        <div
          className={cn(
            "flex items-center rounded-xl border bg-slate-50 dark:bg-slate-800 transition-colors",
            "focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500",
            error ? "border-red-500" : "border-slate-200 dark:border-slate-700",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <PhoneInputWithCountry
            international
            countryCallingCodeEditable={false}
            defaultCountry={defaultCountry}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className="phone-input-container"
          />
        </div>
        {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

// Validation helpers
export function validatePhoneNumber(phone: string | undefined): { valid: boolean; error?: string } {
  if (!phone) {
    return { valid: false, error: "Phone number is required" };
  }

  if (!isValidPhoneNumber(phone)) {
    return { valid: false, error: "Please enter a valid phone number" };
  }

  return { valid: true };
}

export function formatPhoneForDisplay(phone: string): string {
  try {
    const parsed = parsePhoneNumber(phone);
    return parsed ? parsed.formatInternational() : phone;
  } catch {
    return phone;
  }
}

export function getCountryFromPhone(phone: string): CountryCode | undefined {
  try {
    const parsed = parsePhoneNumber(phone);
    return parsed?.country;
  } catch {
    return undefined;
  }
}

export { isValidPhoneNumber, parsePhoneNumber };
export type { CountryCode };
export default PhoneInput;
