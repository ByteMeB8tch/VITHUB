"use client"

import type React from "react"
import { useState } from "react"
import DashboardLayout from "@/components/dashboard/layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { User, Bell, Lock, Palette, Globe, Mail, Phone, BookOpen, GraduationCap } from "lucide-react"

export default function SettingsPage() {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)

  // Profile settings
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    registrationNo: "",
    branch: "CSE",
    year: "3",
    section: "B2",
  })

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    announcementAlerts: true,
    assignmentReminders: true,
    examAlerts: true,
    placementUpdates: true,
    clubEvents: false,
  })

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showEmail: false,
    showPhone: false,
  })

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: "dark",
    language: "english",
  })

  const handleSaveProfile = () => {
    setIsSaving(true)
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false)
      alert("Profile updated successfully!")
    }, 1000)
  }

  const handleSaveNotifications = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      alert("Notification preferences saved!")
    }, 1000)
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Update your personal details and academic information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src="/avatars/user.png" />
                      <AvatarFallback className="text-2xl">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" size="sm">
                        Change Photo
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">JPG, PNG or GIF. Max size 2MB</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="regno">Registration Number</Label>
                      <Input
                        id="regno"
                        placeholder="21BCE1234"
                        value={profileData.registrationNo}
                        onChange={(e) => setProfileData({ ...profileData, registrationNo: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="flex gap-2">
                        <Mail className="h-4 w-4 mt-3 text-muted-foreground" />
                        <Input id="email" type="email" value={profileData.email} disabled />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="flex gap-2">
                        <Phone className="h-4 w-4 mt-3 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="branch">Branch</Label>
                      <Select value={profileData.branch} onValueChange={(v) => setProfileData({ ...profileData, branch: v })}>
                        <SelectTrigger id="branch">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CSE">Computer Science & Engineering</SelectItem>
                          <SelectItem value="ECE">Electronics & Communication</SelectItem>
                          <SelectItem value="EEE">Electrical & Electronics</SelectItem>
                          <SelectItem value="MECH">Mechanical Engineering</SelectItem>
                          <SelectItem value="CIVIL">Civil Engineering</SelectItem>
                          <SelectItem value="IT">Information Technology</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Select value={profileData.year} onValueChange={(v) => setProfileData({ ...profileData, year: v })}>
                        <SelectTrigger id="year">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1st Year</SelectItem>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                          <SelectItem value="4">4th Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="section">Section</Label>
                      <Input
                        id="section"
                        placeholder="B2"
                        value={profileData.section}
                        onChange={(e) => setProfileData({ ...profileData, section: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full md:w-auto">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Choose what notifications you want to receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-notif">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Switch
                        id="email-notif"
                        checked={notifications.emailNotifications}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="push-notif">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
                      </div>
                      <Switch
                        id="push-notif"
                        checked={notifications.pushNotifications}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, pushNotifications: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Academic Alerts</h4>

                      <div className="flex items-center justify-between pl-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="announcements">Announcements</Label>
                          <p className="text-sm text-muted-foreground">Important campus announcements</p>
                        </div>
                        <Switch
                          id="announcements"
                          checked={notifications.announcementAlerts}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, announcementAlerts: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between pl-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="assignments">Assignment Reminders</Label>
                          <p className="text-sm text-muted-foreground">Due dates and submissions</p>
                        </div>
                        <Switch
                          id="assignments"
                          checked={notifications.assignmentReminders}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, assignmentReminders: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between pl-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="exams">Exam Alerts</Label>
                          <p className="text-sm text-muted-foreground">Exam schedules and updates</p>
                        </div>
                        <Switch
                          id="exams"
                          checked={notifications.examAlerts}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, examAlerts: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between pl-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="placements">Placement Updates</Label>
                          <p className="text-sm text-muted-foreground">Job opportunities and drives</p>
                        </div>
                        <Switch
                          id="placements"
                          checked={notifications.placementUpdates}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, placementUpdates: checked })}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="club-events">Club Events</Label>
                        <p className="text-sm text-muted-foreground">Updates from clubs and chapters</p>
                      </div>
                      <Switch
                        id="club-events"
                        checked={notifications.clubEvents}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, clubEvents: checked })}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveNotifications} disabled={isSaving} className="w-full md:w-auto">
                    {isSaving ? "Saving..." : "Save Preferences"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription>Control your privacy and data visibility</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="profile-visible">Public Profile</Label>
                        <p className="text-sm text-muted-foreground">Make your profile visible to other students</p>
                      </div>
                      <Switch
                        id="profile-visible"
                        checked={privacy.profileVisible}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, profileVisible: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-email">Show Email</Label>
                        <p className="text-sm text-muted-foreground">Display email on your profile</p>
                      </div>
                      <Switch
                        id="show-email"
                        checked={privacy.showEmail}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, showEmail: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-phone">Show Phone Number</Label>
                        <p className="text-sm text-muted-foreground">Display phone number on your profile</p>
                      </div>
                      <Switch
                        id="show-phone"
                        checked={privacy.showPhone}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, showPhone: checked })}
                      />
                    </div>
                  </div>

                  <Button onClick={() => alert("Privacy settings saved!")} className="w-full md:w-auto">
                    Save Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Appearance
                  </CardTitle>
                  <CardDescription>Customize how VIT Chennai Hub looks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select value={appearance.theme} onValueChange={(v) => setAppearance({ ...appearance, theme: v })}>
                        <SelectTrigger id="theme">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">Currently using dark theme</p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select value={appearance.language} onValueChange={(v) => setAppearance({ ...appearance, language: v })}>
                        <SelectTrigger id="language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="hindi">हिन्दी (Hindi)</SelectItem>
                          <SelectItem value="tamil">தமிழ் (Tamil)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button onClick={() => alert("Appearance settings saved!")} className="w-full md:w-auto">
                    Save Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Security
                  </CardTitle>
                  <CardDescription>Manage your password and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                  </div>

                  <Button className="w-full md:w-auto">Change Password</Button>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Active Sessions</h4>
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Windows PC - Chrome</p>
                          <p className="text-sm text-muted-foreground">Current session • Chennai, India</p>
                        </div>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Active</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="destructive" className="w-full md:w-auto">
                    Sign Out All Devices
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
