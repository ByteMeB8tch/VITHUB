"use client"

import { useState } from "react"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { Phone, AlertTriangle, Heart, Shield, FileText } from "lucide-react"

const emergencyContacts = [
  { name: "Campus Security", phone: "+1 (555) 911-1234", email: "security@campus.edu", available: "24/7" },
  { name: "Medical Center", phone: "+1 (555) 911-5678", email: "medical@campus.edu", available: "24/7" },
  {
    name: "Mental Health Services",
    phone: "+1 (555) 123-4567",
    email: "counseling@campus.edu",
    available: "Mon-Fri 8AM-8PM",
  },
  { name: "Title IX Office", phone: "+1 (555) 234-5678", email: "titleix@campus.edu", available: "Mon-Fri 9AM-5PM" },
]

const reportCategories = [
  { name: "Safety Concern", icon: AlertTriangle, color: "text-red-400" },
  { name: "Harassment", icon: Shield, color: "text-orange-400" },
  { name: "Maintenance Issue", icon: FileText, color: "text-blue-400" },
  { name: "Medical Emergency", icon: Heart, color: "text-pink-400" },
]

export default function SafetyPage() {
  const [reportType, setReportType] = useState<string | null>(null)
  const [showSOSConfirm, setShowSOSConfirm] = useState(false)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Campus Safety & Support</h1>
          <p className="text-foreground/60">Resources, emergency contacts, and issue reporting</p>
        </div>

        {/* Emergency Alert Banner */}
        <div className="bg-red-500/20 border-2 border-red-500/60 rounded-lg p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-400 mb-1">Emergency Assistance Available</h3>
            <p className="text-sm text-foreground/70">
              Press the SOS button below or call Campus Security immediately at +1 (555) 911-1234
            </p>
          </div>
          <Dialog open={showSOSConfirm} onOpenChange={setShowSOSConfirm}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0">SOS - Get Help Now</Button>
            </DialogTrigger>
            <DialogContent className="bg-card/50 border-border/60">
              <DialogHeader>
                <DialogTitle className="text-red-400">Emergency Alert</DialogTitle>
                <DialogDescription>
                  Are you safe? This will alert campus security and send your location.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white">Confirm - Send Alert</Button>
                <Button
                  variant="outline"
                  className="w-full border-border/60 bg-transparent"
                  onClick={() => setShowSOSConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Emergency Contacts */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Emergency Contacts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyContacts.map((contact, idx) => (
              <Card key={idx} className="bg-card/50 border-border/60">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">{contact.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-accent">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${contact.phone}`} className="hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                    <div className="text-foreground/60">{contact.email}</div>
                    <Badge variant="secondary" className="inline-block">
                      {contact.available}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Report an Issue */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Report an Issue</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reportCategories.map((category, idx) => {
              const Icon = category.icon
              return (
                <Dialog key={idx}>
                  <DialogTrigger asChild>
                    <Card className="bg-card/50 border-border/60 hover:border-accent/40 hover:bg-card/70 transition-smooth cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                          <Icon className={`h-8 w-8 ${category.color}`} />
                          <h3 className="font-semibold">{category.name}</h3>
                          <p className="text-xs text-foreground/60">Report an incident anonymously</p>
                        </div>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="bg-card/50 border-border/60">
                    <DialogHeader>
                      <DialogTitle>{category.name}</DialogTitle>
                      <DialogDescription>
                        Describe your concern in detail. All reports are confidential.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Input placeholder="Your name (optional)" className="bg-card/50 border-border/60" />
                      <Input placeholder="Location" className="bg-card/50 border-border/60" />
                      <textarea
                        placeholder="Describe the issue..."
                        className="w-full p-3 rounded-md bg-card/50 border border-border/60 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
                        rows={4}
                      />
                      <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                        Submit Report
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            })}
          </div>
        </div>

        {/* Support Resources */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Support Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-400" />
                  Mental Health
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground/70">
                Access counseling services, support groups, and wellness programs. All services are free and
                confidential.
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  Title IX & Equity
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground/70">
                Report discrimination, harassment, or sexual misconduct. Support and resources available 24/7.
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
