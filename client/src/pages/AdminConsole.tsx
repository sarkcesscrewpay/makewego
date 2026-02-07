import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    useAdminStats,
    useAdminUsers,
    useUpdateUserStatus,
    useUpdateUserRole,
    useDeleteUser,
    usePendingKYCDrivers,
    useApproveDriverKYC,
    useRejectDriverKYC,
    useAdminSupportTickets,
    useUpdateSupportTicket,
    useAdminBookings,
    useAdminDeleteBooking,
    AdminUser,
    SupportTicket,
} from "@/hooks/use-admin";
import {
    Users,
    Car,
    Ticket,
    BarChart3,
    Shield,
    Ban,
    CheckCircle,
    XCircle,
    Search,
    Trash2,
    UserCog,
    Clock,
    AlertTriangle,
    DollarSign,
    Activity,
    Loader2,
    Eye,
    MessageSquare,
} from "lucide-react";

export default function AdminConsole() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <Shield className="h-8 w-8 text-emerald-400" />
                    <h1 className="text-3xl font-bold text-white">Admin Console</h1>
                </div>

                <Tabs defaultValue="dashboard" className="w-full">
                    <TabsList className="mb-8 bg-slate-800/50 border border-slate-700 p-1">
                        <TabsTrigger value="dashboard" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                            <BarChart3 className="h-4 w-4 mr-2" /> Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                            <Users className="h-4 w-4 mr-2" /> Users
                        </TabsTrigger>
                        <TabsTrigger value="kyc" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                            <Car className="h-4 w-4 mr-2" /> KYC Approval
                        </TabsTrigger>
                        <TabsTrigger value="tickets" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                            <Ticket className="h-4 w-4 mr-2" /> Support
                        </TabsTrigger>
                        <TabsTrigger value="bookings" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                            <Activity className="h-4 w-4 mr-2" /> Bookings
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard"><DashboardPanel /></TabsContent>
                    <TabsContent value="users"><UsersPanel /></TabsContent>
                    <TabsContent value="kyc"><KYCPanel /></TabsContent>
                    <TabsContent value="tickets"><TicketsPanel /></TabsContent>
                    <TabsContent value="bookings"><BookingsPanel /></TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// ==================== DASHBOARD PANEL ====================
function DashboardPanel() {
    const { data: stats, isLoading } = useAdminStats();

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>;
    }

    const statCards = [
        { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "bg-blue-500" },
        { label: "Passengers", value: stats?.totalPassengers || 0, icon: Users, color: "bg-indigo-500" },
        { label: "Drivers", value: stats?.totalDrivers || 0, icon: Car, color: "bg-emerald-500" },
        { label: "Pending KYC", value: stats?.pendingKYC || 0, icon: Clock, color: "bg-amber-500" },
        { label: "Total Bookings", value: stats?.totalBookings || 0, icon: Ticket, color: "bg-purple-500" },
        { label: "Total Revenue", value: `GHS ${(stats?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: "bg-green-500" },
        { label: "Open Tickets", value: stats?.openTickets || 0, icon: MessageSquare, color: "bg-red-500" },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <Card key={i} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-400">{stat.label}</p>
                                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-lg ${stat.color}`}>
                                    <stat.icon className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                        <Users className="h-4 w-4 mr-2" /> View All Users
                    </Button>
                    <Button variant="outline" className="border-amber-600 text-amber-400 hover:bg-amber-900/30">
                        <Clock className="h-4 w-4 mr-2" /> Pending KYC ({stats?.pendingKYC})
                    </Button>
                    <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-900/30">
                        <MessageSquare className="h-4 w-4 mr-2" /> Open Tickets ({stats?.openTickets})
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

// ==================== USERS PANEL ====================
function UsersPanel() {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [page, setPage] = useState(1);
    const { toast } = useToast();

    const { data, isLoading } = useAdminUsers({ search, role: roleFilter, page });
    const updateStatus = useUpdateUserStatus();
    const updateRole = useUpdateUserRole();
    const deleteUser = useDeleteUser();

    const handleStatusChange = (userId: string, status: string) => {
        updateStatus.mutate({ userId, status }, {
            onSuccess: () => toast({ title: "User status updated" }),
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        });
    };

    const handleRoleChange = (userId: string, role: string) => {
        updateRole.mutate({ userId, role }, {
            onSuccess: () => toast({ title: "User role updated" }),
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        });
    };

    const handleDelete = (userId: string) => {
        if (confirm("Are you sure you want to delete this user?")) {
            deleteUser.mutate(userId, {
                onSuccess: () => toast({ title: "User deleted" }),
                onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-slate-800 border-slate-700 text-white"
                    />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="passenger">Passengers</SelectItem>
                        <SelectItem value="driver">Drivers</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>
            ) : (
                <div className="space-y-3">
                    {data?.users.map((user: AdminUser) => (
                        <Card key={user._id} className="bg-slate-800/50 border-slate-700">
                            <CardContent className="pt-4">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-white">{user.firstName} {user.lastName}</h3>
                                            <Badge variant={user.role === 'admin' ? 'default' : user.role === 'driver' ? 'secondary' : 'outline'}>
                                                {user.role}
                                            </Badge>
                                            {user.accountStatus === 'suspended' && <Badge variant="destructive">Suspended</Badge>}
                                            {user.accountStatus === 'banned' && <Badge variant="destructive">Banned</Badge>}
                                        </div>
                                        <p className="text-sm text-slate-400">{user.email}</p>
                                        {user.role === 'driver' && user.kycStatus && (
                                            <div className="mt-1">
                                                <Badge variant={user.kycStatus === 'approved' ? 'default' : user.kycStatus === 'pending' ? 'secondary' : 'destructive'}>
                                                    KYC: {user.kycStatus}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Select defaultValue={user.role} onValueChange={(v) => handleRoleChange(user._id, v)}>
                                            <SelectTrigger className="w-[120px] bg-slate-700 border-slate-600 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="passenger">Passenger</SelectItem>
                                                <SelectItem value="driver">Driver</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            size="sm"
                                            variant={user.accountStatus === 'active' || !user.accountStatus ? 'outline' : 'default'}
                                            onClick={() => handleStatusChange(user._id, user.accountStatus === 'active' || !user.accountStatus ? 'suspended' : 'active')}
                                            className="border-amber-600 text-amber-400"
                                        >
                                            {user.accountStatus === 'active' || !user.accountStatus ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(user._id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {data?.users.length === 0 && (
                        <div className="text-center py-8 text-slate-400">No users found</div>
                    )}
                </div>
            )}

            {data && data.total > 20 && (
                <div className="flex justify-center gap-2">
                    <Button disabled={page === 1} onClick={() => setPage(p => p - 1)} variant="outline">Previous</Button>
                    <span className="text-slate-400 py-2">Page {page} of {Math.ceil(data.total / 20)}</span>
                    <Button disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)} variant="outline">Next</Button>
                </div>
            )}
        </div>
    );
}

// ==================== KYC PANEL ====================
function KYCPanel() {
    const { data: drivers, isLoading } = usePendingKYCDrivers();
    const approve = useApproveDriverKYC();
    const reject = useRejectDriverKYC();
    const { toast } = useToast();
    const [rejectReason, setRejectReason] = useState("");
    const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

    const handleApprove = (driverId: string) => {
        approve.mutate(driverId, {
            onSuccess: () => toast({ title: "Driver approved successfully" }),
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        });
    };

    const handleReject = () => {
        if (!selectedDriver || !rejectReason) return;
        reject.mutate({ driverId: selectedDriver, reason: rejectReason }, {
            onSuccess: () => {
                toast({ title: "Driver rejected" });
                setSelectedDriver(null);
                setRejectReason("");
            },
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        });
    };

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-400" /> Pending KYC Applications
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Review driver license applications and vehicle details
                    </CardDescription>
                </CardHeader>
            </Card>

            {drivers?.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
                    <p>No pending KYC applications</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {drivers?.map((driver: AdminUser) => (
                        <Card key={driver._id} className="bg-slate-800/50 border-slate-700">
                            <CardContent className="pt-6">
                                <div className="flex flex-wrap justify-between gap-4">
                                    <div className="space-y-2">
                                        <h3 className="font-medium text-white text-lg">{driver.firstName} {driver.lastName}</h3>
                                        <p className="text-sm text-slate-400">{driver.email}</p>
                                        {driver.driverDetails && (
                                            <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                                                <p className="text-sm text-slate-300"><strong>License:</strong> {driver.driverDetails.licenseNumber}</p>
                                                {driver.driverDetails.vehicleParams && (
                                                    <>
                                                        <p className="text-sm text-slate-300">
                                                            <strong>Vehicle:</strong> {driver.driverDetails.vehicleParams.make} {driver.driverDetails.vehicleParams.model} ({driver.driverDetails.vehicleParams.year})
                                                        </p>
                                                        <p className="text-sm text-slate-300"><strong>Plate:</strong> {driver.driverDetails.vehicleParams.plateNumber}</p>
                                                        <p className="text-sm text-slate-300"><strong>Capacity:</strong> {driver.driverDetails.vehicleParams.capacity} seats</p>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button onClick={() => handleApprove(driver._id)} className="bg-emerald-600 hover:bg-emerald-700">
                                            <CheckCircle className="h-4 w-4 mr-2" /> Approve
                                        </Button>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="destructive" onClick={() => setSelectedDriver(driver._id)}>
                                                    <XCircle className="h-4 w-4 mr-2" /> Reject
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-slate-800 border-slate-700">
                                                <DialogHeader>
                                                    <DialogTitle className="text-white">Reject Driver Application</DialogTitle>
                                                    <DialogDescription className="text-slate-400">
                                                        Provide a reason for rejection. This will be sent to the driver.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <Textarea
                                                    placeholder="Reason for rejection..."
                                                    value={rejectReason}
                                                    onChange={(e) => setRejectReason(e.target.value)}
                                                    className="bg-slate-700 border-slate-600 text-white"
                                                />
                                                <DialogFooter>
                                                    <Button variant="destructive" onClick={handleReject} disabled={!rejectReason}>
                                                        Confirm Rejection
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

// ==================== TICKETS PANEL ====================
function TicketsPanel() {
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const { data: tickets, isLoading } = useAdminSupportTickets({ status: statusFilter, priority: priorityFilter });
    const updateTicket = useUpdateSupportTicket();
    const { toast } = useToast();

    const handleStatusChange = (ticketId: string, status: string) => {
        updateTicket.mutate({ ticketId, updates: { status: status as any } }, {
            onSuccess: () => toast({ title: "Ticket updated" }),
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        });
    };

    const priorityColors: Record<string, string> = {
        high: "bg-red-500",
        medium: "bg-amber-500",
        low: "bg-blue-500",
    };

    const statusColors: Record<string, string> = {
        open: "bg-red-500",
        in_progress: "bg-amber-500",
        resolved: "bg-emerald-500",
        closed: "bg-slate-500",
    };

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {tickets?.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <Ticket className="h-12 w-12 mx-auto mb-3" />
                    <p>No support tickets found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {tickets?.map((ticket: SupportTicket) => (
                        <Card key={ticket._id} className="bg-slate-800/50 border-slate-700">
                            <CardContent className="pt-6">
                                <div className="flex flex-wrap justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-white">{ticket.subject}</h3>
                                            <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                                            <Badge className={statusColors[ticket.status]}>{ticket.status.replace('_', ' ')}</Badge>
                                        </div>
                                        <p className="text-sm text-slate-400">{ticket.userName} • {ticket.userEmail}</p>
                                        <p className="text-sm text-slate-400">Category: {ticket.category}</p>
                                        <p className="text-slate-300 mt-2">{ticket.message}</p>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Created: {new Date(ticket.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Select defaultValue={ticket.status} onValueChange={(v) => handleStatusChange(ticket._id, v)}>
                                            <SelectTrigger className="w-[140px] bg-slate-700 border-slate-600 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="open">Open</SelectItem>
                                                <SelectItem value="in_progress">In Progress</SelectItem>
                                                <SelectItem value="resolved">Resolved</SelectItem>
                                                <SelectItem value="closed">Closed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

// ==================== BOOKINGS PANEL ====================
function BookingsPanel() {
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const { data, isLoading } = useAdminBookings({ status: statusFilter, page });
    const deleteBooking = useAdminDeleteBooking();
    const { toast } = useToast();

    const handleDelete = (bookingId: string) => {
        if (confirm("Are you sure you want to delete this booking?")) {
            deleteBooking.mutate(bookingId, {
                onSuccess: () => toast({ title: "Booking deleted" }),
                onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
            });
        }
    };

    const statusColors: Record<string, string> = {
        confirmed: "bg-emerald-500",
        cancelled: "bg-red-500",
        completed: "bg-blue-500",
        pending: "bg-amber-500",
    };

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {data?.bookings.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <Activity className="h-12 w-12 mx-auto mb-3" />
                    <p>No bookings found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {data?.bookings.map((booking: any) => (
                        <Card key={booking._id} className="bg-slate-800/50 border-slate-700">
                            <CardContent className="pt-4">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-white">
                                                {booking.user?.firstName} {booking.user?.lastName}
                                            </h3>
                                            <Badge className={statusColors[booking.status] || "bg-slate-500"}>{booking.status}</Badge>
                                        </div>
                                        <p className="text-sm text-slate-400">{booking.user?.email}</p>
                                        <p className="text-sm text-slate-300 mt-1">
                                            Route: {booking.schedule?.route?.startLocation || 'N/A'} → {booking.schedule?.route?.endLocation || 'N/A'}
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            Price: GHS {booking.price || 0} • Seat: #{booking.seatNumber || 'N/A'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(booking.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="destructive" onClick={() => handleDelete(booking._id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {data && data.total > 20 && (
                <div className="flex justify-center gap-2">
                    <Button disabled={page === 1} onClick={() => setPage(p => p - 1)} variant="outline">Previous</Button>
                    <span className="text-slate-400 py-2">Page {page} of {Math.ceil(data.total / 20)}</span>
                    <Button disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)} variant="outline">Next</Button>
                </div>
            )}
        </div>
    );
}
