"use client"

import type React from "react"
import { useState } from "react"
import DashboardLayout from "@/components/dashboard/layout"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Send, MoreVertical, Phone, Video, Paperclip, Smile } from "lucide-react"

interface Message {
  id: number
  sender: string
  content: string
  timestamp: string
  isOwn: boolean
}

interface Chat {
  id: number
  name: string
  avatar: string
  lastMessage: string
  timestamp: string
  unread: number
  online: boolean
}

export default function CommunicationPage() {
  const [selectedChat, setSelectedChat] = useState<number>(1)
  const [messageInput, setMessageInput] = useState("")

  const chats: Chat[] = [
    {
      id: 1,
      name: "Dr. Priya Sharma",
      avatar: "/avatars/01.png",
      lastMessage: "Assignment submission deadline extended to Friday",
      timestamp: "10:30 AM",
      unread: 2,
      online: true,
    },
    {
      id: 2,
      name: "CSE B2 - Project Group",
      avatar: "/avatars/02.png",
      lastMessage: "Meeting at SJT 401 tomorrow at 2 PM?",
      timestamp: "9:45 AM",
      unread: 5,
      online: true,
    },
    {
      id: 3,
      name: "Aditya Menon",
      avatar: "/avatars/03.png",
      lastMessage: "Thanks for the ML notes!",
      timestamp: "Yesterday",
      unread: 0,
      online: false,
    },
    {
      id: 4,
      name: "Training & Placement Cell",
      avatar: "/avatars/04.png",
      lastMessage: "Your placement registration is confirmed",
      timestamp: "Yesterday",
      unread: 0,
      online: true,
    },
    {
      id: 5,
      name: "IEEE Student Chapter",
      avatar: "/avatars/05.png",
      lastMessage: "New workshop: IoT & Embedded Systems - Jan 20",
      timestamp: "2 days ago",
      unread: 0,
      online: false,
    },
  ]

  const messages: Message[] = [
    {
      id: 1,
      sender: "Dr. Priya Sharma",
      content: "Hi, I reviewed your Cloud Computing assignment. Excellent work on the AWS deployment!",
      timestamp: "10:15 AM",
      isOwn: false,
    },
    {
      id: 2,
      sender: "You",
      content: "Thank you, Professor! I had a question about the Docker containerization part.",
      timestamp: "10:20 AM",
      isOwn: true,
    },
    {
      id: 3,
      sender: "Dr. Priya Sharma",
      content: "Of course! Can you come to my cabin in SJT Block tomorrow between 2-4 PM?",
      timestamp: "10:25 AM",
      isOwn: false,
    },
    {
      id: 4,
      sender: "You",
      content: "Perfect! I'll be there around 2:30 PM.",
      timestamp: "10:28 AM",
      isOwn: true,
    },
    {
      id: 5,
      sender: "Dr. Priya Sharma",
      content: "Assignment submission deadline extended to Friday",
      timestamp: "10:30 AM",
      isOwn: false,
    },
  ]

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // Handle sending message
      console.log("Sending:", messageInput)
      setMessageInput("")
    }
  }

  const selectedChatData = chats.find((chat) => chat.id === selectedChat)

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 h-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Communications</h1>
          <p className="text-muted-foreground">Connect with faculty, classmates, clubs, and campus services</p>
        </div>

        <Card className="h-[calc(100vh-240px)] flex overflow-hidden">
          {/* Sidebar - Chat List */}
          <div className="w-full md:w-80 border-r border-border/60 flex flex-col">
            <div className="p-4 border-b border-border/60">
              <Tabs defaultValue="messages" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="messages">Messages</TabsTrigger>
                  <TabsTrigger value="groups">Groups</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-10" />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat.id)}
                    className={`w-full p-3 rounded-lg flex items-start gap-3 hover:bg-secondary/50 transition-colors ${
                      selectedChat === chat.id ? "bg-secondary/50" : ""
                    }`}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={chat.avatar} />
                        <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {chat.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm truncate">{chat.name}</p>
                        <span className="text-xs text-muted-foreground">{chat.timestamp}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                        {chat.unread > 0 && (
                          <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                            {chat.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col hidden md:flex">
            {/* Chat Header */}
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedChatData?.avatar} />
                  <AvatarFallback>{selectedChatData?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedChatData?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedChatData?.online ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] ${message.isOwn ? "order-2" : "order-1"}`}>
                      {!message.isOwn && <p className="text-xs text-muted-foreground mb-1">{message.sender}</p>}
                      <div
                        className={`p-3 rounded-lg ${
                          message.isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/50 text-foreground"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{message.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border/60">
              <div className="flex items-end gap-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage()
                      }
                    }}
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => {
                      /* Add emoji picker */
                    }}
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </div>
                <Button onClick={handleSendMessage} size="icon">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
