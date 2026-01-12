"use client"

import { Suspense, useState } from "react"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, MessageCircle, ThumbsUp } from "lucide-react"

const announcements = [
  {
    id: 1,
    title: "Mid-Term Examination Schedule Released",
    category: "Academic",
    content: "Mid-term exams for Winter Semester 2026 will be conducted from Feb 10-20. Check VTOP for detailed schedule.",
    author: "Controller of Examinations",
    timestamp: "3 hours ago",
    likes: 45,
    comments: 12,
  },
  {
    id: 2,
    title: "Riviera 2026 - Cultural Fest Registration Open",
    category: "Event",
    content: "VIT Chennai's annual cultural fest Riviera is back! Register now for exciting events, workshops, and performances. Last date: Jan 25.",
    author: "Student Activities Council",
    timestamp: "5 hours ago",
    likes: 128,
    comments: 34,
  },
  {
    id: 3,
    title: "Guest Lecture: AI in Healthcare",
    category: "Academic",
    content: "Dr. Ramesh Kumar from IIT Madras will deliver a guest lecture on AI applications in healthcare. Date: Jan 18, 4 PM, SJT Auditorium.",
    author: "CSE Department",
    timestamp: "1 day ago",
    likes: 67,
    comments: 8,
  },
  {
    id: 4,
    title: "Hostel WiFi Maintenance Notice",
    category: "Emergency",
    content: "WiFi services in all hostel blocks will be unavailable on Jan 15 from 12 AM to 6 AM for system upgrades.",
    author: "IT Services",
    timestamp: "1 day ago",
    likes: 23,
    comments: 15,
  },
  {
    id: 5,
    title: "Placement Drive: TCS Digital",
    category: "Placement",
    content: "TCS Digital will be conducting on-campus recruitment for 2026 graduates. Eligible students: 7.5+ CGPA. Registration closes Jan 20.",
    author: "Training & Placement Cell",
    timestamp: "2 days ago",
    likes: 156,
    comments: 42,
  },
  {
    id: 6,
    title: "IEEE Student Chapter Workshop",
    category: "Clubs",
    content: "Join IEEE's hands-on workshop on IoT and Embedded Systems. Free for IEEE members. Register before Jan 16.",
    author: "IEEE Student Chapter",
    timestamp: "2 days ago",
    likes: 34,
    comments: 9,
  },
]

const categories = ["All", "Academic", "Events", "Clubs", "Emergency", "Placement"]

function AnnouncementsContent() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")

  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesCategory = selectedCategory === "All" || ann.category === selectedCategory
    const matchesSearch =
      ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Academic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      Event: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      Clubs: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      Emergency: "bg-red-500/20 text-red-400 border-red-500/30",
      Placement: "bg-green-500/20 text-green-400 border-green-500/30",
    }
    return colors[category] || "bg-accent/20 text-accent border-accent/30"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Announcements & Communications</h1>
        <p className="text-foreground/60">Stay updated with the latest campus news and announcements</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          <Input
            placeholder="Search announcements..."
            className="pl-10 bg-card/50 border-border/60"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={
              selectedCategory === cat ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "border-border/60"
            }
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Announcements Grid */}
      <div className="space-y-4">
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((ann) => (
            <Card
              key={ann.id}
              className="bg-card/50 border-border/60 hover:border-accent/40 hover:bg-card/70 transition-smooth"
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{ann.title}</h3>
                      <Badge className={getCategoryColor(ann.category)}>{ann.category}</Badge>
                    </div>
                    <p className="text-sm text-foreground/60">
                      {ann.author} • {ann.timestamp}
                    </p>
                  </div>
                </div>
                <p className="text-foreground/80 mb-4">{ann.content}</p>
                <div className="flex gap-4 text-sm text-foreground/60">
                  <button className="flex items-center gap-1 hover:text-accent transition-colors">
                    <ThumbsUp className="h-4 w-4" />
                    {ann.likes}
                  </button>
                  <button className="flex items-center gap-1 hover:text-accent transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    {ann.comments}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-card/50 border-border/60">
            <CardContent className="p-12 text-center">
              <p className="text-foreground/60">No announcements found. Try a different search.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function AnnouncementsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="text-foreground/60">Loading announcements...</div>}>
        <AnnouncementsContent />
      </Suspense>
    </DashboardLayout>
  )
}
