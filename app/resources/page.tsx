"use client"

import { useState } from "react"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar, Clock, MapPin, Users } from "lucide-react"

const resources = [
  {
    id: 1,
    name: "Computer Lab 201",
    type: "Lab",
    availability: "Available",
    capacity: 30,
    location: "Building A, 2nd Floor",
    nextAvailable: "09:00 AM",
    bookingSlots: ["09:00-10:30", "11:00-12:30", "14:00-15:30", "16:00-17:30"],
  },
  {
    id: 2,
    name: "Main Library - Study Area",
    type: "Library",
    availability: "Available",
    capacity: 50,
    location: "Central Library, Ground Floor",
    nextAvailable: "Now",
    bookingSlots: ["Open 24/7 during exam season", "Reserve specific zones"],
  },
  {
    id: 3,
    name: "Seminar Hall A",
    type: "Hall",
    availability: "Busy",
    capacity: 100,
    location: "Building C, 3rd Floor",
    nextAvailable: "02:00 PM",
    bookingSlots: ["14:00-15:00", "15:30-16:30"],
  },
  {
    id: 4,
    name: "Research Lab - Chemistry",
    type: "Lab",
    availability: "Available",
    capacity: 20,
    location: "Science Building, 1st Floor",
    nextAvailable: "10:00 AM",
    bookingSlots: ["10:00-11:30", "13:00-14:30", "15:00-16:30"],
  },
  {
    id: 5,
    name: "Conference Room 1",
    type: "Room",
    availability: "Available",
    capacity: 15,
    location: "Administration Building",
    nextAvailable: "09:00 AM",
    bookingSlots: ["09:00-10:00", "10:30-11:30", "13:00-14:00", "14:30-15:30"],
  },
  {
    id: 6,
    name: "Sports Gymnasium",
    type: "Facility",
    availability: "Available",
    capacity: 200,
    location: "Sports Complex",
    nextAvailable: "04:00 PM",
    bookingSlots: ["16:00-17:00", "17:30-18:30", "19:00-20:00"],
  },
]

export default function ResourcesPage() {
  const [selectedResource, setSelectedResource] = useState<(typeof resources)[0] | null>(null)
  const [bookedSlot, setBookedSlot] = useState<string | null>(null)

  const getAvailabilityColor = (availability: string) => {
    return availability === "Available" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Resource Management</h1>
          <p className="text-foreground/60">Book labs, library spaces, and seminar halls</p>
        </div>

        {/* Resource Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <Card
              key={resource.id}
              className="bg-card/50 border-border/60 hover:border-accent/40 hover:bg-card/70 transition-smooth"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold">{resource.name}</h3>
                  <Badge className={getAvailabilityColor(resource.availability)}>{resource.availability}</Badge>
                </div>
                <Badge variant="secondary" className="w-fit">
                  {resource.type}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm text-foreground/70">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    {resource.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    Capacity: {resource.capacity}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" />
                    Next available: {resource.nextAvailable}
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card/50 border-border/60">
                    <DialogHeader>
                      <DialogTitle>{resource.name}</DialogTitle>
                      <DialogDescription>Select a time slot to book this resource</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Available Slots:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {resource.bookingSlots.map((slot, idx) => (
                            <Button
                              key={idx}
                              variant={bookedSlot === slot ? "default" : "outline"}
                              className={`text-xs h-auto py-2 ${bookedSlot === slot ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "border-border/60"}`}
                              onClick={() => setBookedSlot(slot)}
                            >
                              {slot}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                        Confirm Booking
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
