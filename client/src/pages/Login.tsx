import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Car, User, Bus, Loader2, Mail, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [signupVerificationPending, setSignupVerificationPending] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "passenger" as "passenger" | "driver",
    licenseNumber: "",
    make: "",
    model: "",
    year: "",
    plateNumber: "",
    color: "",
    capacity: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setVerificationRequired(false);

    try {
      await login(loginData);
      toast({ title: "Welcome back!" });
      setLocation("/dashboard");
    } catch (error: any) {
      // Check if this is a verification required error
      if (error.message.includes("verify your email")) {
        setVerificationRequired(true);
        setUnverifiedEmail(loginData.email);
      } else {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setIsResending(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
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

    if (signupData.password !== signupData.confirmPassword) {
      toast({ title: "Passwords match error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (signupData.role === "driver") {
      if (!signupData.licenseNumber || !signupData.make || !signupData.model || !signupData.plateNumber || !signupData.capacity) {
        toast({ title: "Missing vehicle details", description: "All vehicle and driver details are required", variant: "destructive" });
        return;
      }
    }

    setIsLoading(true);

    try {
      const result = await register({
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        email: signupData.email,
        phone: signupData.phone,
        password: signupData.password,
        role: signupData.role,
        driverDetails: signupData.role === "driver" ? {
          licenseNumber: signupData.licenseNumber,
          vehicleParams: {
            make: signupData.make,
            model: signupData.model,
            year: signupData.year,
            plateNumber: signupData.plateNumber,
            color: signupData.color,
            capacity: parseInt(signupData.capacity)
          }
        } : undefined
      });

      if (result.requiresVerification) {
        setSignupVerificationPending(true);
        setSignupEmail(signupData.email);
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

  const handleResendSignupVerification = async () => {
    if (!signupEmail) return;
    setIsResending(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupEmail }),
      });

      const data = await response.json();
      toast({ title: "Email sent!", description: data.message });
    } catch (error: any) {
      toast({ title: "Failed to resend", description: error.message, variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupData({ ...signupData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 py-8 transition-colors">
      <Card className="w-full max-w-xl shadow-2xl rounded-2xl border-0 overflow-hidden bg-white dark:bg-slate-900 dark:shadow-slate-950/50">
        <div className="bg-blue-600 p-6 text-center text-white">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <Bus className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold font-display">MakeWeGo</CardTitle>
          <CardDescription className="text-blue-100 mt-2">
            Your journey starts here
          </CardDescription>
        </div>

        <CardContent className="p-8">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-14">
              <TabsTrigger value="login" className="rounded-lg font-bold text-base data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all h-full">Login</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg font-bold text-base data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all h-full">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-6 mt-0">
              {verificationRequired && (
                <Alert className="border-amber-200 bg-amber-50">
                  <Mail className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Email verification required</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    <p className="mb-3">Please verify your email address before logging in. Check your inbox for the verification link.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="border-amber-300 hover:bg-amber-100"
                    >
                      {isResending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      {isResending ? "Sending..." : "Resend verification email"}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    className="h-12 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    className="h-12 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400"
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-6 mt-0 max-h-[60vh] overflow-y-auto px-1">
              {signupVerificationPending ? (
                <div className="text-center py-8">
                  <div className="mx-auto bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <Mail className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Check your email!</h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-2">We sent a verification link to:</p>
                  <p className="font-semibold text-blue-600 mb-4">{signupEmail}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Click the link in your email to verify your account. The link expires in 24 hours.
                  </p>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      onClick={handleResendSignupVerification}
                      disabled={isResending}
                      className="w-full"
                    >
                      {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isResending ? "Sending..." : "Resend verification email"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSignupVerificationPending(false)}
                      className="text-sm text-blue-600 font-medium hover:underline"
                    >
                      Use a different email
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="space-y-6">
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-slate-700 dark:text-slate-200">I am a:</Label>
                    <RadioGroup value={signupData.role} onValueChange={(value) => setSignupData({ ...signupData, role: value as "passenger" | "driver" })} className="grid grid-cols-2 gap-4">
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
                      <Input id="firstName" name="firstName" placeholder="John" value={signupData.firstName} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" name="lastName" placeholder="Doe" value={signupData.lastName} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email Address</Label>
                      <Input id="signup-email" name="email" type="email" placeholder="john@example.com" value={signupData.email} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" name="phone" type="tel" placeholder="0241234567" value={signupData.phone} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" name="password" type="password" value={signupData.password} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input id="confirmPassword" name="confirmPassword" type="password" value={signupData.confirmPassword} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                    </div>
                  </div>

                  {/* Driver Specific Fields */}
                  {signupData.role === "driver" && (
                    <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-4 fade-in duration-300">
                      <div className="flex items-center gap-2">
                        <Car className="text-emerald-600 h-5 w-5" />
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Vehicle & Driver Details</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="licenseNumber">Driver License ID</Label>
                          <Input id="licenseNumber" name="licenseNumber" placeholder="DL-12345678" value={signupData.licenseNumber} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="plateNumber">Plate Number</Label>
                          <Input id="plateNumber" name="plateNumber" placeholder="GT-123-24" value={signupData.plateNumber} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="make">Car Make</Label>
                          <Input id="make" name="make" placeholder="Toyota" value={signupData.make} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="model">Car Model</Label>
                          <Input id="model" name="model" placeholder="HiAce" value={signupData.model} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="year">Year</Label>
                          <Input id="year" name="year" placeholder="2020" value={signupData.year} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="color">Color</Label>
                          <Input id="color" name="color" placeholder="White" value={signupData.color} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="capacity">Capacity</Label>
                          <Input id="capacity" name="capacity" type="number" placeholder="15" value={signupData.capacity} onChange={handleSignupChange} required className="h-11 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
                        </div>
                      </div>
                    </div>
                  )}

                  <Button type="submit" className={`w-full h-12 text-lg font-bold shadow-lg transition-all ${signupData.role === 'driver' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {isLoading ? "Creating Account..." : `Sign Up as ${signupData.role === 'passenger' ? 'Passenger' : 'Driver'}`}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}