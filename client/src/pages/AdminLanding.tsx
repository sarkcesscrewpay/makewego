import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
    Shield,
    Users,
    BarChart3,
    Ticket,
    Car,
    ChevronRight,
    Lock,
    UserPlus,
} from "lucide-react";

export default function AdminLanding() {
    const { user } = useAuth();

    // Check if user is admin
    if (!user || user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-slate-800/80 border-slate-700">
                    <CardHeader className="text-center">
                        <Lock className="h-16 w-16 mx-auto text-red-400 mb-4" />
                        <CardTitle className="text-white text-2xl">Admin Access Required</CardTitle>
                        <CardDescription className="text-slate-400">
                            This area is restricted to administrators only. Please log in with an admin account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Link href="/login">
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                                Login as Admin
                            </Button>
                        </Link>
                        <p className="text-center text-slate-500 text-sm">
                            Contact your system administrator if you need access.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const adminLinks = [
        {
            title: "Admin Console",
            description: "Full management dashboard with users, KYC, tickets, and analytics",
            icon: BarChart3,
            href: "/admin/console",
            color: "bg-emerald-500",
        },
        {
            title: "User Management",
            description: "View, edit, suspend users and manage roles",
            icon: Users,
            href: "/admin/console?tab=users",
            color: "bg-blue-500",
        },
        {
            title: "Driver KYC",
            description: "Approve or reject driver license applications",
            icon: Car,
            href: "/admin/console?tab=kyc",
            color: "bg-amber-500",
        },
        {
            title: "Support Tickets",
            description: "Manage customer support tickets",
            icon: Ticket,
            href: "/admin/console?tab=tickets",
            color: "bg-purple-500",
        },
        {
            title: "Register Staff",
            description: "Add station masters and supervisors",
            icon: UserPlus,
            href: "/admin/register-staff",
            color: "bg-pink-500",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 bg-emerald-500/20 rounded-full mb-4">
                        <Shield className="h-10 w-10 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
                    <p className="text-slate-400">Welcome back, {user.firstName}. Select an area to manage.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {adminLinks.map((link) => (
                        <Link key={link.href} href={link.href}>
                            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-all cursor-pointer group h-full">
                                <CardContent className="pt-6 flex items-start gap-4">
                                    <div className={`p-3 rounded-lg ${link.color}`}>
                                        <link.icon className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors flex items-center">
                                            {link.title}
                                            <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </h3>
                                        <p className="text-sm text-slate-400 mt-1">{link.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                <div className="mt-8 text-center">
                    <p className="text-slate-500 text-sm">
                        Secret access: <code className="bg-slate-700 px-2 py-1 rounded text-emerald-400">/mwg-ctrl-x9k72</code>
                    </p>
                </div>
            </div>
        </div>
    );
}
