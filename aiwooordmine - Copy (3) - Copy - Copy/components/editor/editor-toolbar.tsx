"use client"

import { useEditorStore } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
  Table,
  LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Palette,
  FileText,
  Strikethrough,
  Superscript,
  Subscript,
  Quote,
  Code,
  ListChecks,
  Paperclip,
  Smile,
  ChevronDown,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { ElementInspector } from "@/components/editor/element-inspector"
import { PageManager } from "@/components/editor/page-manager"
import { AiEditPanel } from "@/components/editor/ai-edit-panel"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const FONT_SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "22", "24", "26", "28", "36", "48", "72"]
const FONT_FAMILIES = [
  { name: "Vazirmatn", value: "'Vazirmatn', sans-serif" },
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Times New Roman", value: "'Times New Roman', serif" },
  { name: "Courier New", value: "'Courier New', monospace" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Tahoma", value: "Tahoma, sans-serif" },
  { name: "Verdana", value: "Verdana, sans-serif" },
]

const COLORS = [
  { name: "مشکی", value: "#000000" },
  { name: "خاکستری تیره", value: "#545454" },
  { name: "خاکستری", value: "#737373" },
  { name: "خاکستری روشن", value: "#a6a6a6" },
  { name: "سفید", value: "#ffffff" },
  { name: "زرشکی", value: "#a10000" },
  { name: "قرمز", value: "#ff0000" },
  { name: "نارنجی", value: "#ff6600" },
  { name: "زرد", value: "#ffcc00" },
  { name: "سبز روشن", value: "#9bdb1d" },
  { name: "سبز", value: "#009e0f" },
  { name: "آبی روشن", value: "#00ccff" },
  { name: "آبی", value: "#0066cc" },
  { name: "بنفش", value: "#9933ff" },
]

// تابع کمکی برای تشخیص وضعیت قالب‌بندی متن
const getFormatButtonVariant = (format: string) => {
  const { iframeDoc, selectedElements } = useEditorStore.getState()
  if (!iframeDoc || selectedElements.length === 0) return "ghost"

  const element = iframeDoc.querySelector(`[data-editor-id="${selectedElements[0]}"]`) as HTMLElement
  if (!element) return "ghost"

  switch (format) {
    case "bold":
      return element.style.fontWeight === "bold" ? "secondary" : "ghost"
    case "italic":
      return element.style.fontStyle === "italic" ? "secondary" : "ghost"
    case "underline":
      return element.style.textDecoration?.includes("underline") ? "secondary" : "ghost"
    case "strikeThrough":
      return element.style.textDecoration?.includes("line-through") ? "secondary" : "ghost"
    case "superscript":
      return element.style.verticalAlign === "super" ? "secondary" : "ghost"
    case "subscript":
      return element.style.verticalAlign === "sub" ? "secondary" : "ghost"
    default:
      return "ghost"
  }
}

// تابع کمکی برای تشخیص وضعیت تراز متن
const getAlignButtonVariant = (align: string) => {
  const { iframeDoc, selectedElements } = useEditorStore.getState()
  if (!iframeDoc || selectedElements.length === 0) return "ghost"

  const element = iframeDoc.querySelector(`[data-editor-id="${selectedElements[0]}"]`) as HTMLElement
  if (!element) return "ghost"

  switch (align) {
    case "right":
      return element.style.textAlign === "right" ? "secondary" : "ghost"
    case "center":
      return element.style.textAlign === "center" ? "secondary" : "ghost"
    case "left":
      return element.style.textAlign === "left" ? "secondary" : "ghost"
    default:
      return "ghost"
  }
}

export function EditorToolbar() {
  const { executeCommand, selectedElements, undo, redo, canUndo, canRedo, addNewPage } = useEditorStore()

  const [activeTab, setActiveTab] = useState("format")
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState("")
  const [imageAlt, setImageAlt] = useState("")
  const [fontSize, setFontSize] = useState("16")
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value)
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("https://")
  const [linkText, setLinkText] = useState("")
  const [initialLinkTextFromSelection, setInitialLinkTextFromSelection] = useState("")

  const hasSelection = selectedElements.length > 0

  // تابع درج تصویر
  const insertImage = () => {
    if (!imageSrc) return

    const { iframeDoc, selectedElements, addHistorySnapshot } = useEditorStore.getState()
    if (!iframeDoc) return

    // ایجاد عنصر تصویر جدید
    const imgElement = iframeDoc.createElement("img")
    imgElement.src = imageSrc
    imgElement.alt = imageAlt || "تصویر"
    imgElement.style.maxWidth = "100%"

    // اضافه کردن data-editor-id به تصویر
    const uniqueId = `element-img-${Date.now()}`
    imgElement.setAttribute("data-editor-id", uniqueId)

    // اگر عنصری انتخاب شده باشد، تصویر را به آن اضافه می‌کنیم
    if (selectedElements.length > 0) {
      const element = iframeDoc.querySelector(`[data-editor-id="${selectedElements[0]}"]`)
      if (element) {
        element.appendChild(imgElement)
      }
    } else {
      // در غیر این صورت به آخرین صفحه اضافه می‌کنیم
      const pages = iframeDoc.querySelectorAll(".page")
      if (pages.length > 0) {
        pages[pages.length - 1].appendChild(imgElement)
      } else {
        iframeDoc.body.appendChild(imgElement)
      }
    }

    // ذخیره تاریخچه
    addHistorySnapshot()

    setIsImageDialogOpen(false)
    setImageSrc("")
    setImageAlt("")
  }

  // تابع درج جدول
  const insertTable = () => {
    const { iframeDoc, selectedElements, addHistorySnapshot } = useEditorStore.getState()
    if (!iframeDoc) return

    // ایجاد جدول ساده 3x3
    const tableHTML = `
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr>
            <th style="border: 1px solid #e0e0e0; padding: 8px; text-align: right; background-color: #f1f5f9;">عنوان 1</th>
            <th style="border: 1px solid #e0e0e0; padding: 8px; text-align: right; background-color: #f1f5f9;">عنوان 2</th>
            <th style="border: 1px solid #e0e0e0; padding: 8px; text-align: right; background-color: #f1f5f9;">عنوان 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 8px; text-align: right;">سلول 1</td>
            <td style="border: 1px solid #e0e0e0; padding: 8px; text-align: right;">سلول 2</td>
            <td style="border: 1px solid #e0e0e0; padding: 8px; text-align: right;">سلول 3</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 8px; text-align: right;">سلول 4</td>
            <td style="border: 1px solid #e0e0e0; padding: 8px; text-align: right;">سلول 5</td>
            <td style="border: 1px solid #e0e0e0; padding: 8px; text-align: right;">سلول 6</td>
          </tr>
        </tbody>
      </table>
    `

    // ایجاد عنصر موقت برای تبدیل HTML به DOM
    const tempDiv = iframeDoc.createElement("div")
    tempDiv.innerHTML = tableHTML
    const tableElement = tempDiv.firstElementChild

    if (!tableElement) return

    // اضافه کردن data-editor-id به جدول
    const uniqueId = `element-table-${Date.now()}`
    tableElement.setAttribute("data-editor-id", uniqueId)

    // اضافه کردن data-editor-id به همه سلول‌های جدول
    const cells = tableElement.querySelectorAll("th, td")
    cells.forEach((cell, index) => {
      cell.setAttribute("data-editor-id", `${uniqueId}-cell-${index}`)
    })

    // اگر عنصری انتخاب شده باشد، جدول را به آن اضافه می‌کنیم
    if (selectedElements.length > 0) {
      const element = iframeDoc.querySelector(`[data-editor-id="${selectedElements[0]}"]`)
      if (element) {
        element.appendChild(tableElement)
      }
    } else {
      // در غیر این صورت به آخرین صفحه اضافه می‌کنیم
      const pages = iframeDoc.querySelectorAll(".page")
      if (pages.length > 0) {
        pages[pages.length - 1].appendChild(tableElement)
      } else {
        iframeDoc.body.appendChild(tableElement)
      }
    }

    // ذخیره تاریخچه
    addHistorySnapshot()
  }

  // تابع باز کردن دیالوگ درج پیوند
  const handleOpenLinkDialog = () => {
    const { iframeDoc, selectedElements } = useEditorStore.getState()
    if (!iframeDoc) return

    if (selectedElements.length > 0) {
      const element = iframeDoc.querySelector(`[data-editor-id="${selectedElements[0]}"]`) as HTMLElement
      if (element && element.textContent) {
        setLinkText(element.textContent.trim())
        setInitialLinkTextFromSelection(element.textContent.trim())
      } else {
        setLinkText("پیوند")
        setInitialLinkTextFromSelection("")
      }
    } else {
      setLinkText("پیوند")
      setInitialLinkTextFromSelection("")
    }
    setLinkUrl("https://")
    setIsLinkDialogOpen(true)
  }

  // تابع تایید و درج پیوند
  const confirmInsertLink = () => {
    const { iframeDoc, selectedElements, addHistorySnapshot } = useEditorStore.getState()
    if (!iframeDoc || !linkUrl) return

    const linkElement = iframeDoc.createElement("a")
    linkElement.href = linkUrl
    linkElement.textContent = linkText || linkUrl
    linkElement.style.color = "#2563eb" // یا هر رنگ پیش‌فرض دیگری
    linkElement.style.textDecoration = "none"
    const uniqueId = `element-link-${Date.now()}`
    linkElement.setAttribute("data-editor-id", uniqueId)

    if (selectedElements.length > 0 && initialLinkTextFromSelection) {
      const element = iframeDoc.querySelector(`[data-editor-id="${selectedElements[0]}"]`) as HTMLElement
      if (element) {
        // اگر متن انتخاب شده بود و کاربر متن لینک را در دیالوگ تغییر داد یا همان را تایید کرد
        // عنصر قدیمی را با عنصر لینک جدید جایگزین می‌کنیم
        element.parentNode?.replaceChild(linkElement, element)
      }
    } else {
      // اگر متنی انتخاب نشده بود یا متن انتخاب شده محتوا نداشت، پیوند جدید را درج می‌کنیم
      const pages = iframeDoc.querySelectorAll(".page")
      if (pages.length > 0) {
        const lastPage = pages[pages.length - 1]
        // سعی می‌کنیم به آخرین فرزند قابل ویرایش اضافه کنیم یا به خود صفحه
         const lastEditableChild = lastPage.querySelector('[data-editor-id]:not(script):not(style)') || lastPage;
        (lastEditableChild || lastPage).appendChild(linkElement)
      } else {
        iframeDoc.body.appendChild(linkElement)
      }
    }

    addHistorySnapshot()
    setIsLinkDialogOpen(false)
    setLinkUrl("https://")
    setLinkText("")
    setInitialLinkTextFromSelection("")
  }


  const handleFontSizeChange = (size: string) => {
    setFontSize(size)
    executeCommand("fontSize", size)
  }

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family)
    executeCommand("fontName", family)
  }

  const handleColorChange = (color: string) => {
    executeCommand("foreColor", color)
  }

  const handleBackgroundColorChange = (color: string) => {
    executeCommand("hiliteColor", color)
  }

  return (
    <div className="border-b bg-muted/30">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b">
          <TabsTrigger
            value="format"
            className="data-[state=active]:bg-background rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm"
          >
            قالب‌بندی
          </TabsTrigger>
          <TabsTrigger
            value="insert"
            className="data-[state=active]:bg-background rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm"
          >
            درج
          </TabsTrigger>
          <TabsTrigger
            value="pages"
            className="data-[state=active]:bg-background rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm"
          >
            صفحات
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="data-[state=active]:bg-background rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm"
          >
            هوش مصنوعی
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="p-2 flex flex-wrap items-center gap-1 bg-background">
        {activeTab === "format" && (
          <ScrollArea className="w-full">
            <div className="flex items-center gap-1 min-w-max px-1">
              <TooltipProvider>
                {/* Font Family Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 gap-1 min-w-[120px] px-2">
                      <span className="truncate">
                        {FONT_FAMILIES.find((f) => f.value === fontFamily)?.name || "فونت"}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0">
                    <ScrollArea className="h-72">
                      <div className="grid gap-0.5 p-1">
                        {FONT_FAMILIES.map((font) => (
                          <Button
                            key={font.value}
                            variant="ghost"
                            className="justify-start font-normal h-8"
                            style={{ fontFamily: font.value }}
                            onClick={() => handleFontFamilyChange(font.value)}
                          >
                            {font.name}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {/* Font Size Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-16 gap-1 px-2">
                      {fontSize}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-24 p-0">
                    <ScrollArea className="h-72">
                      <div className="grid gap-0.5 p-1">
                        {FONT_SIZES.map((size) => (
                          <Button
                            key={size}
                            variant="ghost"
                            className="justify-start font-normal h-8"
                            onClick={() => handleFontSizeChange(size)}
                          >
                            {size}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                <Separator orientation="vertical" className="mx-1 h-8" />

                {/* Text Color */}
                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-md">
                          <Palette className="h-4 w-4" />
                          <span className="sr-only">رنگ متن</span>
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">رنگ متن</TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-64 p-0">
                    <div className="grid grid-cols-5 gap-1 p-2">
                      {COLORS.map((color) => (
                        <Button
                          key={color.value}
                          variant="outline"
                          className="h-8 w-8 p-0 rounded-md"
                          style={{ backgroundColor: color.value }}
                          onClick={() => handleColorChange(color.value)}
                        >
                          <span className="sr-only">{color.name}</span>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Background Color */}
                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-md">
                          <div className="h-4 w-4 border border-current flex items-center justify-center">
                            <div className="h-2 w-2 bg-current" />
                          </div>
                          <span className="sr-only">رنگ پس‌زمینه</span>
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">رنگ پس‌زمینه</TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-64 p-0">
                    <div className="grid grid-cols-5 gap-1 p-2">
                      {COLORS.map((color) => (
                        <Button
                          key={color.value}
                          variant="outline"
                          className="h-8 w-8 p-0 rounded-md"
                          style={{ backgroundColor: color.value }}
                          onClick={() => handleBackgroundColorChange(color.value)}
                        >
                          <span className="sr-only">{color.name}</span>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Separator orientation="vertical" className="mx-1 h-8" />

                {/* Text Formatting */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={getFormatButtonVariant("bold")}
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("bold")}
                      disabled={!hasSelection}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">ضخیم (Ctrl+B)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={getFormatButtonVariant("italic")}
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("italic")}
                      disabled={!hasSelection}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">مورب (Ctrl+I)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={getFormatButtonVariant("underline")}
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("underline")}
                      disabled={!hasSelection}
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">زیرخط (Ctrl+U)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={getFormatButtonVariant("strikeThrough")}
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("strikeThrough")}
                      disabled={!hasSelection}
                    >
                      <Strikethrough className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">خط‌خورده</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={getFormatButtonVariant("superscript")}
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("superscript")}
                      disabled={!hasSelection}
                    >
                      <Superscript className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">بالانویس</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={getFormatButtonVariant("subscript")}
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("subscript")}
                      disabled={!hasSelection}
                    >
                      <Subscript className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">زیرنویس</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="mx-1 h-8" />

                {/* Headings */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("formatBlock", "<h1>")}
                      disabled={!hasSelection}
                    >
                      <Heading1 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">عنوان 1</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("formatBlock", "<h2>")}
                      disabled={!hasSelection}
                    >
                      <Heading2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">عنوان 2</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("formatBlock", "<h3>")}
                      disabled={!hasSelection}
                    >
                      <Heading3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">عنوان 3</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="mx-1 h-8" />

                {/* Alignment */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={getAlignButtonVariant("right")}
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("justifyRight")}
                      disabled={!hasSelection}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تراز راست</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={getAlignButtonVariant("center")}
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("justifyCenter")}
                      disabled={!hasSelection}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تراز وسط</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={getAlignButtonVariant("left")}
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("justifyLeft")}
                      disabled={!hasSelection}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تراز چپ</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="mx-1 h-8" />

                {/* Lists */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("insertUnorderedList")}
                      disabled={!hasSelection}
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
                      onClick={() => executeCommand("insertOrderedList")}
                      disabled={!hasSelection}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">لیست مرتب</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() =>
                        executeCommand(
                          "insertHTML",
                          "<ul class='checklist'><li><input type='checkbox'> مورد جدید</li></ul>",
                        )
                      }
                      disabled={!hasSelection}
                    >
                      <ListChecks className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">لیست چک‌باکس</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="mx-1 h-8" />

                {/* Special Formats */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("formatBlock", "<blockquote>")}
                      disabled={!hasSelection}
                    >
                      <Quote className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">نقل قول</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => executeCommand("formatBlock", "<pre>")}
                      disabled={!hasSelection}
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">کد</TooltipContent>
                </Tooltip>

                {hasSelection && (
                  <div className="mr-auto">
                    <ElementInspector inline />
                  </div>
                )}
              </TooltipProvider>
            </div>
          </ScrollArea>
        )}

        {activeTab === "insert" && (
          <ScrollArea className="w-full">
            <div className="flex items-center gap-2 min-w-max px-1">
              <TooltipProvider>
                <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="h-8 rounded-md">
                          <ImageIcon className="h-4 w-4 ml-2" />
                          تصویر
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">درج تصویر</TooltipContent>
                  </Tooltip>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>درج تصویر</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="image-src">آدرس تصویر</Label>
                        <Input
                          id="image-src"
                          value={imageSrc}
                          onChange={(e) => setImageSrc(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="image-alt">متن جایگزین</Label>
                        <Input
                          id="image-alt"
                          value={imageAlt}
                          onChange={(e) => setImageAlt(e.target.value)}
                          placeholder="توضیح تصویر"
                        />
                      </div>
                      <Button onClick={insertImage} className="w-full">
                        درج تصویر
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="h-8 rounded-md" onClick={insertTable}>
                      <Table className="h-4 w-4 ml-2" />
                      جدول
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">درج جدول</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="h-8 rounded-md" onClick={handleOpenLinkDialog}>
                      <LinkIcon className="h-4 w-4 ml-2" />
                      پیوند
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">درج پیوند</TooltipContent>
                </Tooltip>
                <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>درج پیوند</DialogTitle>
                      <DialogDescription>
                        آدرس URL و متن مورد نظر برای پیوند را وارد کنید.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="link-url" className="text-right">
                          آدرس URL
                        </Label>
                        <Input
                          id="link-url"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          className="col-span-3"
                          placeholder="https://example.com"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="link-text" className="text-right">
                          متن پیوند
                        </Label>
                        <Input
                          id="link-text"
                          value={linkText}
                          onChange={(e) => setLinkText(e.target.value)}
                          className="col-span-3"
                          placeholder="متن پیوند"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsLinkDialogOpen(false)}>انصراف</Button>
                      <Button type="submit" onClick={confirmInsertLink}>تایید</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="h-8 rounded-md">
                      <Paperclip className="h-4 w-4 ml-2" />
                      پیوست
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">پیوست فایل</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="h-8 rounded-md">
                      <Smile className="h-4 w-4 ml-2" />
                      ایموجی
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">درج ایموجی</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="h-8 rounded-md">
                      <FileText className="h-4 w-4 ml-2" />
                      قالب آماده
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">درج قالب آماده</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </ScrollArea>
        )}

        {activeTab === "pages" && (
          <ScrollArea className="w-full">
            <div className="min-w-max px-1">
              <PageManager inline />
            </div>
          </ScrollArea>
        )}

        {activeTab === "ai" && (
          <ScrollArea className="w-full">
            <div className="min-w-max px-1">
              <AiEditPanel inline />
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
