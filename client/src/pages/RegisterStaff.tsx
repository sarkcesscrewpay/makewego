import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Shield, UserPlus, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function RegisterStaff() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "admin",
        staffType: "station_master",
    });

    // Check if user is admin
    if (!user || user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-slate-800/80 border-slate-700">
                    <CardHeader className="text-center">
                        <Shield className="h-16 w-16 mx-auto text-red-400 mb-4" />
                        <CardTitle className="text-white text-2xl">Access Denied</CardTitle>
                        <CardDescription className="text-slate-400">
                            Only administrators can register new staff members.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch("/api/admin/register-staff", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to register staff");
            }

            toast({
                title: "Staff Registered Successfully",
                description: `${formData.firstName} ${formData.lastName} has been registered as ${formData.staffType.replace('_', ' ')}.`,
            });

            // Reset form
            setFormData({
                email: "",
                password: "",
                firstName: "",
                lastName: "",
                role: "admin",
                staffType: "station_master",
            });
        } catch (error: any) {
            toast({
                title: "Registration Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-lg mx-auto">
                <Link href="/admin/console">
                    <Button variant="ghost" className="text-slate-400 hover:text-white mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin Console
                    </Button>
                </Link>

                <Card className="bg-slate-800/80 border-slate-700">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-500/20 rounded-lg">
                                <UserPlus className="h-6 w-6 text-pink-400" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Register Staff</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Add station masters and supervisors to the system
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">First Name</Label>
                                    <Input
                                        placeholder="John"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        required
                                        className="bg-slate-700 border-slate-600 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Last Name</Label>
                                    <Input
                                        placeholder="Doe"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        required
                                        className="bg-slate-700 border-slate-600 text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Email</Label>
                                <Input
                                    type="email"
                                    placeholder="staff@company.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="bg-slate-700 border-slate-600 text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Password</Label>
                                <Input
                                    type="password"
                                    placeholder="Strong password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={6}
                                    className="bg-slate-700 border-slate-600 text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Staff Type</Label>
                                <Select
                                    value={formData.staffType}
                                    onValueChange={(value) => setFormData({ ...formData, staffType: value })}
                                >
                                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="station_master">Station Master</SelectItem>
                                        <SelectItem value="supervisor">Supervisor</SelectItem>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Registering...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Register Staff Member
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
