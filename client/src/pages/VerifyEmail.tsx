import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

type VerificationState = "loading" | "success" | "error" | "already-verified";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [state, setState] = useState<VerificationState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const token = params.get("token");

    if (!token) {
      setState("error");
      setMessage("No verification token provided");
      return;
    }

    verifyEmail(token);
  }, [searchString]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`/api/auth/verify-email?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        if (data.alreadyVerified) {
          setState("already-verified");
          setMessage("Your email has already been verified");
        } else {
          setState("success");
          setMessage("Your email has been verified successfully!");
        }
      } else {
        setState("error");
        setMessage(data.message || "Verification failed");
      }
    } catch (error) {
      setState("error");
      setMessage("An error occurred during verification");
    }
  };

  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          <>
            <div className="mx-auto bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Verifying your email</h2>
            <p className="text-slate-600">Please wait while we verify your email address...</p>
          </>
        );

      case "success":
        return (
          <>
            <div className="mx-auto bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Email Verified!</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => setLocation("/")}
            >
              Continue to Login
            </Button>
          </>
        );

      case "already-verified":
        return (
          <>
            <div className="mx-auto bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
              <Mail className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Already Verified</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => setLocation("/")}
            >
              Go to Login
            </Button>
          </>
        );

      case "error":
        return (
          <>
            <div className="mx-auto bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Verification Failed</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/signup")}
              >
                Back to Signup
              </Button>
              <button
                type="button"
                onClick={() => setLocation("/")}
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                Go to Login
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0 overflow-hidden">
        <CardContent className="p-8 text-center">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
