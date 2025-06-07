"use client"

import { useEditorStore } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { Download, Undo2, Redo2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DocumentTools({ inline = false }: { inline?: boolean }) {
  const { generateOutput, undo, redo, canUndo, canRedo } = useEditorStore()
  const [htmlOutput, setHtmlOutput] = useState("")
  const [isOutputOpen, setIsOutputOpen] = useState(false)

  const handleGenerateOutput = () => {
    const output = generateOutput()
    setHtmlOutput(output)
    setIsOutputOpen(true)
  }

  if (inline) {
    return (
      <Dialog open={isOutputOpen} onOpenChange={setIsOutputOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="h-8" onClick={handleGenerateOutput}>
            <Download className="h-4 w-4 ml-2" />
            خروجی سند
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>خروجی سند</DialogTitle>
          </DialogHeader>
          <Textarea value={htmlOutput} readOnly className="font-mono text-xs h-96 overflow-auto" />
          <Button
            onClick={() => {
              navigator.clipboard.writeText(htmlOutput)
            }}
          >
            کپی به کلیپ‌بورد
          </Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">ابزارهای سند</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={undo} disabled={!canUndo}>
                <Undo2 className="mr-2 h-4 w-4" />
                واگرد
              </Button>
              <Button variant="outline" className="flex-1" onClick={redo} disabled={!canRedo}>
                <Redo2 className="mr-2 h-4 w-4" />
                از نو
              </Button>
            </div>

            <Dialog open={isOutputOpen} onOpenChange={setIsOutputOpen}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start" onClick={handleGenerateOutput}>
                  <Download className="mr-2 h-4 w-4" />
                  تولید خروجی HTML
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>خروجی HTML</DialogTitle>
                </DialogHeader>
                <Textarea value={htmlOutput} readOnly className="font-mono text-xs h-96 overflow-auto" />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(htmlOutput)
                  }}
                >
                  کپی به کلیپ‌بورد
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
