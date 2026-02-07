import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Car, User, Loader2, Mail, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [verificationPending, setVerificationPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Driver Details
    licenseNumber: "",
    make: "",
    model: "",
    year: "",
    plateNumber: "",
    color: "",
    capacity: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResendVerification = async () => {
    if (!registeredEmail) return;
    setIsResending(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });

      const data = await response.json();
      toast({ title: "Email sent!", description: data.message });
    } catch (error: any) {
      toast({ title: "Failed to resend", description: error.message, variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Passwords match error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast({ title: "Missing fields", description: "Please fill in all basic information", variant: "destructive" });
      return;
    }

    if (role === "driver") {
      if (!formData.licenseNumber || !formData.make || !formData.model || !formData.plateNumber || !formData.capacity) {
        toast({ title: "Missing vehicle details", description: "All vehicle and driver details are required", variant: "destructive" });
        return;
      }
    }

    setIsLoading(true);

    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: role,
        driverDetails: role === "driver" ? {
          licenseNumber: formData.licenseNumber,
          vehicleParams: {
            make: formData.make,
            model: formData.model,
            year: formData.year,
            plateNumber: formData.plateNumber,
            color: formData.color,
            capacity: parseInt(formData.capacity)
          }
        } : undefined
      });

      // Check if email verification is required
      if (result.requiresVerification) {
        setVerificationPending(true);
        setRegisteredEmail(formData.email);
        toast({ title: "Check your email!", description: "We sent you a verification link" });
      } else {
        toast({ title: "Welcome!", description: "Account created successfully" });
        setLocation("/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Verification pending screen
  if (verificationPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 py-8 transition-colors">
        <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0 overflow-hidden bg-white dark:bg-slate-900 dark:shadow-slate-950/50">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white">
            <div className="mx-auto bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
              <Mail className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-display">Check Your Email</h1>
          </div>

          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Almost there!</h2>
              <p className="text-slate-600 dark:text-slate-300">
                We've sent a verification link to:
              </p>
              <p className="font-semibold text-blue-600 mt-2">{registeredEmail}</p>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Click the link in your email to verify your account and start using BusConnect.
              The link will expire in 24 hours.
            </p>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendVerification}
                disabled={isResending}
              >
                {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isResending ? "Sending..." : "Resend verification email"}
              </Button>

              <button
                type="button"
                onClick={() => setLocation("/")}
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                Back to login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 py-8 transition-colors">
      <Card className="w-full max-w-xl shadow-2xl rounded-2xl border-0 overflow-hidden bg-white dark:bg-slate-900 dark:shadow-slate-950/50">
        <div className="bg-blue-600 p-6 text-center text-white">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            {role === 'driver' ? <Car className="h-8 w-8 text-white" /> : <User className="h-8 w-8 text-white" />}
          </div>
          <h1 className="text-3xl font-bold font-display">Join BusConnect</h1>
          <p className="text-blue-100 mt-2">Create your account to get started</p>
        </div>

        <CardContent className="p-8">
          <form onSubmit={handleSignup} className="space-y-6">

            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-slate-700 dark:text-slate-200">I am a:</Label>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as "passenger" | "driver")} className="grid grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value="passenger" id="passenger" className="peer sr-only" />
                  <Label
                    htmlFor="passenger"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-200 dark:hover:border-slate-600 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/30 cursor-pointer transition-all"
                  >
                    <User className="mb-2 h-6 w-6 text-slate-600 dark:text-slate-300 peer-data-[state=checked]:text-blue-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Passenger</span>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem value="driver" id="driver" className="peer sr-only" />
                  <Label
                    htmlFor="driver"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-200 dark:hover:border-slate-600 peer-data-[state=checked]:border-emerald-600 peer-data-[state=checked]:bg-emerald-50 dark:peer-data-[state=checked]:bg-emerald-900/30 cursor-pointer transition-all"
                  >
                    <Car className="mb-2 h-6 w-6 text-slate-600 dark:text-slate-300 peer-data-[state=checked]:text-emerald-600" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Driver</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="firstName" placeholder="John" value={formData.firstName} onChange={handleChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" placeholder="Doe" value={formData.lastName} onChange={handleChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" placeholder="john@example.com" value={formData.email} onChange={handleChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
              </div>
            </div>

            {/* Driver Specific Fields */}
            {role === "driver" && (
              <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="flex items-center gap-2">
                  <Car className="text-emerald-600 h-5 w-5" />
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Vehicle & Driver Details</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">Driver License ID</Label>
                    <Input id="licenseNumber" name="licenseNumber" placeholder="DL-12345678" value={formData.licenseNumber} onChange={handleChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plateNumber">Plate Number</Label>
                    <Input id="plateNumber" name="plateNumber" placeholder="GT-123-24" value={formData.plateNumber} onChange={handleChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="make">Car Make</Label>
                    <Input id="make" name="make" placeholder="Toyota" value={formData.make} onChange={handleChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Car Model</Label>
                    <Input id="model" name="model" placeholder="HiAce" value={formData.model} onChange={handleChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input id="year" name="year" placeholder="2020" value={formData.year} onChange={handleChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input id="color" name="color" placeholder="White" value={formData.color} onChange={handleChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input id="capacity" name="capacity" type="number" placeholder="15" value={formData.capacity} onChange={handleChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className={`w-full h-12 text-base font-bold shadow-lg transition-all ${role === 'driver' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isLoading ? "creating Account..." : `Sign Up as ${role === 'passenger' ? 'Passenger' : 'Driver'}`}
            </Button>

            <div className="text-center text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setLocation("/")}
                className="text-blue-600 font-bold hover:underline"
              >
                Sign in
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}