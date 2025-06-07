"use client"

import { useEditorStore } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, Trash2, Edit2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ساده‌سازی کامپوننت ElementInspector برای inline mode
export function ElementInspector({ inline = false }: { inline?: boolean }) {
  const { selectedElements, iframeDoc, updateElementAttribute, removeElement, moveElement, startInlineEditing } =
    useEditorStore()
  const [elementInfo, setElementInfo] = useState({
    tagName: "",
    style: "",
  })

  useEffect(() => {
    if (selectedElements.length === 0 || !iframeDoc) return

    const element = selectedElements[0]
    const el = iframeDoc.querySelector(`[data-editor-id="${element}"]`)
    if (!el) return

    setElementInfo({
      tagName: el.tagName.toLowerCase(),
      style: (el as HTMLElement).style.cssText || "",
    })
  }, [selectedElements, iframeDoc])

  const handleApplyChanges = () => {
    if (selectedElements.length === 0) return
    updateElementAttribute(selectedElements[0], "style", elementInfo.style)
  }

  if (inline) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => moveElement(selectedElements[0], "up")}
          disabled={!selectedElements.length}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => moveElement(selectedElements[0], "down")}
          disabled={!selectedElements.length}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => startInlineEditing(selectedElements[0])}
          disabled={!selectedElements.length}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => removeElement(selectedElements[0])}
          disabled={!selectedElements.length}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // برای حالت غیر inline، همان کد قبلی را با حذف فیلدهای اضافی برمی‌گردانیم
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">ویژگی‌های عنصر</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex justify-end gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveElement(selectedElements[0], "up")}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveElement(selectedElements[0], "down")}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => startInlineEditing(selectedElements[0])}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeElement(selectedElements[0])}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
