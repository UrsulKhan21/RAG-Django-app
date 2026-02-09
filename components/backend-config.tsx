"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Settings } from "lucide-react"
import { toast } from "sonner"

export function BackendConfig() {
  const { backendUrl, setBackendUrl } = useAuth()
  const [url, setUrl] = useState(backendUrl)
  const [open, setOpen] = useState(false)

  const handleSave = () => {
    const trimmed = url.trim().replace(/\/+$/, "")
    if (!trimmed) {
      toast.error("Please enter a valid URL")
      return
    }
    setBackendUrl(trimmed)
    toast.success("Backend URL updated")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Configure backend URL</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex flex-col gap-3">
          <div>
            <h4 className="text-sm font-medium text-foreground">Django Backend URL</h4>
            <p className="text-xs text-muted-foreground">
              Set the URL where your Django backend is running
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="backend-url" className="text-xs">
              Backend URL
            </Label>
            <Input
              id="backend-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="text-sm"
            />
          </div>
          <Button onClick={handleSave} size="sm">
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
