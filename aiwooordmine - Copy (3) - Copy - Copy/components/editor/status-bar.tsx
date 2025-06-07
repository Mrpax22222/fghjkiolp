"use client"

import { useEditorStore } from "@/store/editor-store"
import { useEffect, useState } from "react"

// Enhance the status bar to be more Word-like
export function StatusBar() {
  const { hoveredElement, selectedElements } = useEditorStore()
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Add proper null checks to prevent accessing properties of null objects
  useEffect(() => {
    const { iframeDoc } = useEditorStore.getState()
    if (!iframeDoc) return

    // Make sure the body exists before accessing its textContent
    const text = iframeDoc.body?.textContent || ""
    const words = text.trim().split(/\s+/).filter(Boolean).length
    const chars = text.length

    // محاسبه تعداد صفحات
    const pages = iframeDoc.querySelectorAll(".page")

    setWordCount(words)
    setCharCount(chars)
    setTotalPages(pages.length)

    // تشخیص صفحه فعلی
    if (selectedElements.length > 0) {
      const selectedElement = iframeDoc.querySelector(`[data-editor-id="${selectedElements[0]}"]`)
      if (selectedElement) {
        const parentPage = selectedElement.closest(".page")
        if (parentPage) {
          const pageIndex = Array.from(pages).indexOf(parentPage)
          setCurrentPage(pageIndex + 1)
        }
      }
    }
  }, [selectedElements])

  // نمایش اطلاعات عنصر انتخاب شده به جای کد HTML
  const getSelectedElementInfo = () => {
    const { iframeDoc } = useEditorStore.getState()
    if (!selectedElements.length || !iframeDoc) return "آماده"

    const element = iframeDoc.querySelector(`[data-editor-id="${selectedElements[0]}"]`)
    if (!element) return "آماده"

    const tagName = element.tagName.toLowerCase()

    // نمایش نام عنصر به صورت کاربرپسند
    const friendlyNames: Record<string, string> = {
      p: "پاراگراف",
      h1: "عنوان 1",
      h2: "عنوان 2",
      h3: "عنوان 3",
      ul: "لیست نامرتب",
      ol: "لیست مرتب",
      li: "آیتم لیست",
      table: "جدول",
      tr: "ردیف جدول",
      td: "سلول جدول",
      img: "تصویر",
      a: "پیوند",
      blockquote: "نقل قول",
      div: "بخش",
      span: "متن",
    }

    return friendlyNames[tagName] || tagName
  }

  return (
    <div className="h-6 border-t px-4 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
      <div>{getSelectedElementInfo()}</div>
      <div className="flex items-center gap-4">
        <div>کلمات: {wordCount}</div>
        <div>کاراکترها: {charCount}</div>
        <div>
          صفحه {currentPage} از {totalPages}
        </div>
      </div>
    </div>
  )
}
