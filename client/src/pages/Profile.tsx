import { useAuth } from "@/hooks/use-auth";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Shield, LogOut, Car, Hash, Users, Phone, CheckCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import DataSettings from "@/components/DataSettings";
import PhoneInput, { validatePhoneNumber, formatPhoneForDisplay } from "@/components/PhoneInput";

export default function Profile() {
  const { user, logout } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    vehicleMake: "",
    vehicleModel: "",
    plateNumber: "",
    capacity: ""
  });

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>("");
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        vehicleMake: user.driverDetails?.vehicleParams?.make || "",
        vehicleModel: user.driverDetails?.vehicleParams?.model || "",
        plateNumber: user.driverDetails?.vehicleParams?.plateNumber || "",
        capacity: user.driverDetails?.vehicleParams?.capacity?.toString() || ""
      });
      setPhoneNumber(user.phone || "");
    }
  }, [user]);

  const handleSavePhone = async () => {
    // Validate phone number using libphonenumber-js
    if (phoneNumber) {
      const validation = validatePhoneNumber(phoneNumber);
      if (!validation.valid) {
        setPhoneError(validation.error);
        toast({ title: "Error", description: validation.error || "Please enter a valid phone number", variant: "destructive" });
        return;
      }
    }
    setPhoneError(undefined);

    setIsSavingPhone(true);
    try {
      await updateProfile.mutateAsync({ phone: phoneNumber || "" });
      toast({ title: "Phone Saved", description: "Your phone number has been updated." });
      setIsEditingPhone(false);
      // Force refresh user data (invalidateQueries doesn't work with staleTime: Infinity)
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
      };

      if (user?.role === 'driver') {
        payload.driverDetails = {
          ...user.driverDetails,
          vehicleParams: {
            ...user.driverDetails?.vehicleParams,
            make: formData.vehicleMake,
            model: formData.vehicleModel,
            plateNumber: formData.plateNumber,
            capacity: parseInt(formData.capacity)
          }
        };
      }

      await updateProfile.mutateAsync(payload);
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
      setIsEditing(false);
    } catch (e: any) {
      console.error("Update failed:", e);
      toast({
        title: "Update Failed",
        description: e.message?.includes("Unexpected token")
          ? "Server returned an invalid response. Please check if the backend is running."
          : e.message,
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>Please sign in to view your profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">
                Go to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8 transition-colors">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="mt-2 text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Your account details and role
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                  <Button className="col-span-2" onClick={handleUpdate} disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </h3>
                      <div className="flex items-center text-gray-600">
                        <Mail className="w-4 h-4 mr-1" />
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Role</span>
                    </div>
                    <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
                      {profile.role === "admin" ? "Administrator" :
                        profile.role === "driver" ? "Driver" : "Passenger"}
                    </Badge>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Member since</span>
                <span className="text-sm text-gray-600">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Phone Number - Simple save without verification */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Phone Number
                </CardTitle>
                <CardDescription>
                  Add your phone number so drivers and passengers can contact you
                </CardDescription>
              </div>
              {user.phone && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Saved
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditingPhone || !user.phone ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (with country code)</Label>
                    <PhoneInput
                      value={phoneNumber || ""}
                      onChange={(value) => {
                        setPhoneNumber(value);
                        setPhoneError(undefined);
                      }}
                      defaultCountry="GH"
                      placeholder="Enter your phone number"
                      error={phoneError}
                      className="h-12"
                    />
                    <p className="text-xs text-slate-500">Select your country and enter your phone number</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSavePhone}
                      disabled={isSavingPhone || !phoneNumber}
                      className="flex-1"
                    >
                      {isSavingPhone && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {isSavingPhone ? "Saving..." : "Save Phone Number"}
                    </Button>
                    {user.phone && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingPhone(false);
                          setPhoneNumber(user.phone || "");
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-slate-500" />
                      <span className="font-medium">{user.phone ? formatPhoneForDisplay(user.phone) : user.phone}</span>
                    </div>
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setIsEditingPhone(true)}
                    className="w-full"
                  >
                    Change Number
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Information (Drivers Only) */}
          {user.role === 'driver' && (
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Car className="w-5 h-5 mr-2" />
                  Vehicle Details
                </CardTitle>
                <CardDescription>
                  Manage your vehicle parameters for accurate bookings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Car className="w-3 h-3" /> Make
                    </Label>
                    <Input
                      placeholder="e.g. Toyota"
                      value={formData.vehicleMake}
                      onChange={e => setFormData({ ...formData, vehicleMake: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Car className="w-3 h-3" /> Model
                    </Label>
                    <Input
                      placeholder="e.g. Hiace"
                      value={formData.vehicleModel}
                      onChange={e => setFormData({ ...formData, vehicleModel: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="w-3 h-3" /> Plate Number
                    </Label>
                    <Input
                      placeholder="e.g. GT-1234-22"
                      value={formData.plateNumber}
                      onChange={e => setFormData({ ...formData, plateNumber: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="w-3 h-3" /> Max Capacity
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g. 15"
                      value={formData.capacity}
                      onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                {isEditing && (
                  <Button className="w-full mt-2" onClick={handleUpdate} disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Saving Bus Details..." : "Update Vehicle Data"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Account Actions */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Manage your account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* Data & Offline Settings */}
          <DataSettings />

          {/* Quick Stats */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-sm text-gray-600">Total Rides</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-sm text-gray-600">Active Bookings</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
