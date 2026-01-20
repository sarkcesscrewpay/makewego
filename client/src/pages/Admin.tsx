import { useState } from "react";
import { useBuses, useCreateBus } from "@/hooks/use-buses";
import { useRoutes, useCreateRoute } from "@/hooks/use-routes";
import { useSchedules, useCreateSchedule } from "@/hooks/use-schedules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Bus, Map as MapIcon, Calendar } from "lucide-react";

export default function Admin() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        
        <Tabs defaultValue="buses" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="buses">Buses</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
          </TabsList>
          
          <TabsContent value="buses">
            <BusesPanel />
          </TabsContent>
          <TabsContent value="routes">
            <RoutesPanel />
          </TabsContent>
          <TabsContent value="schedules">
            <SchedulesPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function BusesPanel() {
  const { data: buses, isLoading } = useBuses();
  const createBus = useCreateBus();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createBus.mutate({
      plateNumber: formData.get("plateNumber") as string,
      driverName: formData.get("driverName") as string,
      capacity: Number(formData.get("capacity")),
      status: "active"
    }, {
      onSuccess: () => {
        setOpen(false);
        toast({ title: "Bus Created" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center"><Bus className="mr-2" /> Fleet Management</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="btn-primary"><Plus className="mr-2 h-4 w-4" /> Add Bus</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Bus</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Plate Number</Label>
                <Input name="plateNumber" required placeholder="ABC-1234" />
              </div>
              <div className="space-y-2">
                <Label>Driver Name</Label>
                <Input name="driverName" required placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input name="capacity" type="number" required placeholder="40" />
              </div>
              <Button type="submit" className="w-full btn-primary" disabled={createBus.isPending}>
                {createBus.isPending ? "Creating..." : "Create Bus"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buses?.map(bus => (
          <Card key={bus.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between">
                <span>{bus.plateNumber}</span>
                <span className="text-sm font-normal bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{bus.status}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">Driver: {bus.driverName}</div>
              <div className="text-sm text-gray-500">Capacity: {bus.capacity} seats</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RoutesPanel() {
  const { data: routes } = useRoutes();
  const createRoute = useCreateRoute();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createRoute.mutate({
      name: formData.get("name") as string,
      startLocation: formData.get("startLocation") as string,
      endLocation: formData.get("endLocation") as string,
      stops: (formData.get("stops") as string).split(",").map(s => s.trim()),
      distance: formData.get("distance") as string, // stored as decimal string in schema type
      estimatedDuration: Number(formData.get("estimatedDuration"))
    }, {
      onSuccess: () => {
        setOpen(false);
        toast({ title: "Route Created" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center"><MapIcon className="mr-2" /> Route Management</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="btn-primary"><Plus className="mr-2 h-4 w-4" /> Add Route</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Route</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Route Name</Label>
                <Input name="name" required placeholder="Express Line 1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input name="startLocation" required placeholder="City A" />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input name="endLocation" required placeholder="City B" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Stops (comma separated)</Label>
                <Input name="stops" placeholder="Stop 1, Stop 2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Distance (km)</Label>
                  <Input name="distance" type="number" step="0.1" required />
                </div>
                <div className="space-y-2">
                  <Label>Duration (mins)</Label>
                  <Input name="estimatedDuration" type="number" required />
                </div>
              </div>
              <Button type="submit" className="w-full btn-primary" disabled={createRoute.isPending}>
                Create Route
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {routes?.map(route => (
          <Card key={route.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{route.name}</h3>
                  <p className="text-gray-500">{route.startLocation} → {route.endLocation}</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>{route.distance} km</div>
                  <div>{route.estimatedDuration} mins</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SchedulesPanel() {
  const { data: schedules } = useSchedules();
  const { data: routes } = useRoutes();
  const { data: buses } = useBuses();
  const createSchedule = useCreateSchedule();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createSchedule.mutate({
      routeId: Number(formData.get("routeId")),
      busId: Number(formData.get("busId")),
      departureTime: new Date(formData.get("departureTime") as string),
      arrivalTime: new Date(formData.get("arrivalTime") as string),
      price: formData.get("price") as string // schema decimal
    }, {
      onSuccess: () => {
        setOpen(false);
        toast({ title: "Schedule Created" });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center"><Calendar className="mr-2" /> Schedule Management</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="btn-primary"><Plus className="mr-2 h-4 w-4" /> Add Schedule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Trip</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Route</Label>
                <select name="routeId" className="w-full border rounded-md p-2 bg-white" required>
                  {routes?.map(r => <option key={r.id} value={r.id}>{r.name} ({r.startLocation}-{r.endLocation})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Bus</Label>
                <select name="busId" className="w-full border rounded-md p-2 bg-white" required>
                  {buses?.map(b => <option key={b.id} value={b.id}>{b.plateNumber} ({b.driverName})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departure</Label>
                  <Input name="departureTime" type="datetime-local" required />
                </div>
                <div className="space-y-2">
                  <Label>Arrival</Label>
                  <Input name="arrivalTime" type="datetime-local" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Price (GHS)</Label>
                <Input name="price" type="number" step="0.01" required />
              </div>
              <Button type="submit" className="w-full btn-primary" disabled={createSchedule.isPending}>
                Schedule Trip
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schedules?.map(schedule => (
          <Card key={schedule.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between mb-2">
                <span className="font-bold">{schedule.route.name}</span>
                <span className="text-primary font-bold">GHS {schedule.price}</span>
              </div>
              <div className="text-sm text-gray-500 mb-2">
                Bus: {schedule.bus.plateNumber}
              </div>
              <div className="flex justify-between text-sm">
                <span>Dep: {new Date(schedule.departureTime).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Arr: {new Date(schedule.arrivalTime).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
