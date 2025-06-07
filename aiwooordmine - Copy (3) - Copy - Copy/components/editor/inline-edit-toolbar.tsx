"use client"

import { useEditorStore } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState, useEffect } from "react"

export function InlineEditToolbar() {
  const { finishInlineEditing, executeCommand, activeInlineEditElement, iframeDoc } = useEditorStore()
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    alignRight: false,
    alignCenter: false,
    alignLeft: false,
  })

  // بررسی وضعیت قالب‌بندی فعلی
  useEffect(() => {
    if (!iframeDoc || !activeInlineEditElement) return

    const selection = iframeDoc.getSelection()
    if (!selection || selection.rangeCount === 0) return

    // بررسی وضعیت قالب‌بندی با استفاده از document.queryCommandState
    setFormatState({
      bold: iframeDoc.queryCommandState("bold"),
      italic: iframeDoc.queryCommandState("italic"),
      underline: iframeDoc.queryCommandState("underline"),
      alignRight: iframeDoc.queryCommandState("justifyRight"),
      alignCenter: iframeDoc.queryCommandState("justifyCenter"),
      alignLeft: iframeDoc.queryCommandState("justifyLeft"),
    })

    // اضافه کردن event listener برای تغییرات انتخاب
    const handleSelectionChange = () => {
      setFormatState({
        bold: iframeDoc.queryCommandState("bold"),
        italic: iframeDoc.queryCommandState("italic"),
        underline: iframeDoc.queryCommandState("underline"),
        alignRight: iframeDoc.queryCommandState("justifyRight"),
        alignCenter: iframeDoc.queryCommandState("justifyCenter"),
        alignLeft: iframeDoc.queryCommandState("justifyLeft"),
      })
    }

    iframeDoc.addEventListener("selectionchange", handleSelectionChange)
    return () => {
      iframeDoc.removeEventListener("selectionchange", handleSelectionChange)
    }
  }, [iframeDoc, activeInlineEditElement])

  // تابع اجرای دستور با به‌روزرسانی وضعیت
  const executeFormatCommand = (command: string, value?: string) => {
    executeCommand(command, value)

    // به‌روزرسانی وضعیت بعد از اجرای دستور
    if (iframeDoc) {
      setTimeout(() => {
        setFormatState((prev) => ({
          ...prev,
          bold: iframeDoc.queryCommandState("bold"),
          italic: iframeDoc.queryCommandState("italic"),
          underline: iframeDoc.queryCommandState("underline"),
          alignRight: iframeDoc.queryCommandState("justifyRight"),
          alignCenter: iframeDoc.queryCommandState("justifyCenter"),
          alignLeft: iframeDoc.queryCommandState("justifyLeft"),
        }))
      }, 10)
    }
  }

  return (
    <div className="flex items-center gap-1 bg-background border rounded-md shadow-lg p-1 backdrop-blur-sm bg-opacity-95">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={formatState.bold ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => executeFormatCommand("bold")}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">ضخیم (Ctrl+B)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={formatState.italic ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => executeFormatCommand("italic")}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">مورب (Ctrl+I)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={formatState.underline ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => executeFormatCommand("underline")}
            >
              <Underline className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">زیرخط (Ctrl+U)</TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={formatState.alignRight ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => executeFormatCommand("justifyRight")}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">تراز راست</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={formatState.alignCenter ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => executeFormatCommand("justifyCenter")}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">تراز وسط</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={formatState.alignLeft ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => executeFormatCommand("justifyLeft")}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">تراز چپ</TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => executeFormatCommand("insertUnorderedList")}
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">لیست نامرتب</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => executeFormatCommand("insertOrderedList")}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">لیست مرتب</TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border mx-1" />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
              <Type className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0">
            <div className="grid gap-0.5 p-1">
              <Button
                variant="ghost"
                className="justify-start font-normal h-8"
                onClick={() => executeFormatCommand("formatBlock", "<h1>")}
              >
                عنوان 1
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal h-8"
                onClick={() => executeFormatCommand("formatBlock", "<h2>")}
              >
                عنوان 2
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal h-8"
                onClick={() => executeFormatCommand("formatBlock", "<h3>")}
              >
                عنوان 3
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal h-8"
                onClick={() => executeFormatCommand("formatBlock", "<p>")}
              >
                پاراگراف
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-4 w-px bg-border mx-1" />

        <Button variant="default" size="sm" className="h-8 rounded-md" onClick={finishInlineEditing}>
          <Check className="h-4 w-4 ml-1" />
          اتمام ویرایش
        </Button>
      </TooltipProvider>
    </div>
  )
}
