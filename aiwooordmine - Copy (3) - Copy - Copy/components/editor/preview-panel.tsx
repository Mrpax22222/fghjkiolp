"use client"

import { useEffect, useRef } from "react" // Removed useState
import { useEditorStore } from "@/store/editor-store"
import { InlineEditToolbar } from "@/components/editor/inline-edit-toolbar"
// Removed Button, Code, Copy imports

export function PreviewPanel() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  // Removed showCode state
  const {
    currentEditor,
    setIframeDoc,
    setIframeWin,
    isLoaded,
    setIsLoaded,
    isEditingInline,
    activeInlineEditElement,
    selectedElements,
    hoveredElement,
    addHistorySnapshot,
  } = useEditorStore()

  // بارگذاری محتوای HTML در iframe
  useEffect(() => {
    if (!currentEditor || !iframeRef.current) return

    const loadContent = async () => {
      try {
        const iframe = iframeRef.current
        if (!iframe) return; // Guard against null iframe

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

        if (!iframeDoc) return

        let contentToLoad = currentEditor.initialContent;
        if (typeof window !== "undefined") {
          const savedContent = localStorage.getItem(`editor-content-${currentEditor.id}`);
          if (savedContent) {
            contentToLoad = savedContent;
          }
        }

        iframeDoc.open()
        iframeDoc.write(contentToLoad)
        iframeDoc.close()

        // It's crucial that iframe.onload is set *before* content is written,
        // or ensure it's handled if content loads very fast.
        // However, with doc.write/close, onload usually fires after close().
        iframe.onload = () => {
          // Re-check iframe inside onload as it's a new scope for TS
          const currentIframe = iframeRef.current;
          if (!currentIframe) return;

          const iframeWindow = currentIframe.contentWindow
          const iframeDocument = iframeWindow?.document

          if (!iframeWindow || !iframeDocument) return

          // ذخیره ارجاع به document و window مربوط به iframe
          setIframeDoc(iframeDocument)
          setIframeWin(iframeWindow)

          // تزریق CSS برای هایلایت عناصر
          const styleElement = iframeDocument.createElement("style")
          styleElement.textContent = `
  .editor-highlight-hover {
    outline: 2px dashed #3b82f6 !important;
    outline-offset: 2px !important;
    transition: outline 0.2s ease !important;
  }
  .editor-highlight-selected {
    outline: 2px solid #2563eb !important;
    outline-offset: 2px !important;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
    transition: all 0.2s ease !important;
  }
  
  .template-editable-element {
    background-color: rgba(59, 130, 246, 0.1) !important;
    border: 1px dashed #3b82f6 !important;
  }
  
  /* Dark mode support for the editor content */
  @media (prefers-color-scheme: dark) {
    body {
      background-color: #1e293b !important;
      color: #e2e8f0 !important;
    }
    .page {
      background: #0f172a !important;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3) !important;
    }
    .section-box {
      background-color: #1e293b !important;
      border-color: #334155 !important;
    }
    .section-title {
      border-bottom-color: #475569 !important;
      color: #e2e8f0 !important;
    }
    table, th, td {
      border-color: #334155 !important;
    }
    th {
      background-color: #1e293b !important;
      color: #e2e8f0 !important;
    }
    tr:nth-child(even) {
      background-color: #1e293b !important;
    }
    .footer, .page-number {
      color: #94a3b8 !important;
      border-top-color: #334155 !important;
    }
    a {
      color: #60a5fa !important;
    }
    blockquote {
      background-color: #1e293b !important;
      border-right-color: #60a5fa !important;
      color: #94a3b8 !important;
    }
  }
  
  /* Improved visual feedback for editing */
  [contenteditable="true"] {
    min-height: 1em;
    border-radius: 4px;
    background-color: rgba(59, 130, 246, 0.05) !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
  }
`
          iframeDocument.head.appendChild(styleElement)

          // اضافه کردن شناسه‌های منحصربه‌فرد به عناصر
          const allElements = iframeDocument.querySelectorAll("*")
          allElements.forEach((el, index) => {
            if (el.nodeType === 1) {
              // Element node
              el.setAttribute("data-editor-id", `element-${index}`)
            }
          })

          // در تابع loadContent، بعد از اضافه کردن شناسه‌های منحصربه‌فرد به عناصر، اضافه کنید:
          // اضافه کردن MutationObserver برای اضافه کردن data-editor-id به عناصر جدید
          const editorMutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === 1) {
                    // Element node
                    const el = node as Element
                    if (!el.getAttribute("data-editor-id")) {
                      const uniqueId = `element-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                      el.setAttribute("data-editor-id", uniqueId)

                      // اگر این عنصر فرزندانی دارد، به آنها هم شناسه اضافه کنیم
                      el.querySelectorAll("*").forEach((child, childIndex) => {
                        if (!child.getAttribute("data-editor-id")) {
                          child.setAttribute("data-editor-id", `${uniqueId}-child-${childIndex}`)
                        }
                      })
                    }
                  }
                })
              }
            })
          })

          // شروع مشاهده تغییرات در بدنه سند
          editorMutationObserver.observe(iframeDocument.body, {
            childList: true,
            subtree: true,
          })

          // ذخیره observer در store برای پاکسازی بعدی
          useEditorStore.getState().setMutationObserver(editorMutationObserver)

          // اضافه کردن event listener ها
          setupEventListeners(iframeDocument)

          // ذخیره اسنپ‌شات اولیه برای تاریخچه
          addHistorySnapshot()

          // تنظیم وضعیت بارگذاری
          setIsLoaded(true)
        }
      } catch (error) {
        console.error("خطا در بارگذاری محتوا:", error)
      }
    }

    loadContent()
  }, [currentEditor])

  // تنظیم event listener ها برای تعامل با iframe
  const setupEventListeners = (doc: Document) => {
    const { selectElement, hoverElement, clearHover, clearSelection, startInlineEditing } = useEditorStore.getState()

    // کلیک روی عناصر
    doc.addEventListener("click", (e) => {
      e.preventDefault()

      const target = e.target as HTMLElement
      const editorId = target.getAttribute("data-editor-id")

      if (editorId) {
        selectElement(editorId)
      } else {
        clearSelection()
      }
    })

    // هاور روی عناصر
    doc.addEventListener("mouseover", (e) => {
      const target = e.target as HTMLElement
      const editorId = target.getAttribute("data-editor-id")

      if (editorId) {
        hoverElement(editorId)
      }
    })

    // خروج از هاور
    doc.addEventListener("mouseout", () => {
      clearHover()
    })

    // دبل کلیک برای ویرایش درون‌خطی
    doc.addEventListener("dblclick", (e) => {
      e.preventDefault()

      const target = e.target as HTMLElement
      const editorId = target.getAttribute("data-editor-id")

      if (editorId) {
        startInlineEditing(editorId)
      }
    })

    // اضافه کردن کلیدهای میانبر
    doc.addEventListener("keydown", (e) => {
      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault()
        useEditorStore.getState().undo()
      }

      // Ctrl+Y for redo
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault()
        useEditorStore.getState().redo()
      }
    })
  }

  // اضافه کردن observer برای به‌روزرسانی صفحات در لحظه
  useEffect(() => {
    const { iframeDoc } = useEditorStore.getState()
    if (!iframeDoc || !currentEditor) return

    // ایجاد یک MutationObserver برای مشاهده تغییرات در DOM
    const observer = new MutationObserver(() => {
      // به‌روزرسانی شماره صفحات
      if (currentEditor.pageNumberElementSelector) {
        const pages = iframeDoc.querySelectorAll(currentEditor.pageStructureSelector)
        pages.forEach((page, index) => {
          const pageNumber = index + 1
          const pageNumberElement = page.querySelector(currentEditor.pageNumberElementSelector!)

          if (pageNumberElement) {
            const pattern = currentEditor.pageNumberPattern || {
              prefix: "صفحه ",
              suffix: "",
              numberSystem: "western",
            }

            let numberText = pageNumber.toString()
            if (pattern.numberSystem === "persian") {
              numberText = toPersianNumber(pageNumber)
            }
            const newTextContent = `${pattern.prefix}${numberText}${pattern.suffix}`;
            if (pageNumberElement.textContent !== newTextContent) {
              pageNumberElement.textContent = newTextContent;
            }
          }
        })
      }
    })

    // شروع مشاهده تغییرات در بدنه سند
    observer.observe(iframeDoc.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [currentEditor])

  // تابع کمکی برای تبدیل اعداد به فارسی
  const toPersianNumber = (num: number): string => {
    const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
    return num.toString().replace(/\d/g, (digit) => persianDigits[Number.parseInt(digit)])
  }

  // محاسبه موقعیت نوار ابزار ویرایش درون‌خطی
  const calculateToolbarPosition = () => {
    if (!isEditingInline || !activeInlineEditElement) return null

    const { iframeDoc } = useEditorStore.getState()
    if (!iframeDoc) return null

    const element = iframeDoc.querySelector(`[data-editor-id="${activeInlineEditElement}"]`)
    if (!element) return null

    const rect = element.getBoundingClientRect()
    const iframeRect = iframeRef.current?.getBoundingClientRect() || { top: 0, left: 0 }

    return {
      top: iframeRect.top + rect.top - 40, // 40px بالاتر از عنصر
      left: iframeRect.left + rect.left,
      width: rect.width,
    }
  }

  const toolbarPosition = calculateToolbarPosition()

  // Removed handleCopyCode function

  return (
    // The main div now only needs to handle the iframe and its toolbar
    <div className="relative w-full h-full bg-muted/30 overflow-auto">
      {/* The iframe is now the primary content of this component */}
      <iframe
        ref={iframeRef}
        className="editor-iframe w-full h-full" // Use w-full h-full to fill parent
        title="پیش‌نمایش ویرایشگر"
        sandbox="allow-same-origin allow-scripts"
      />

      {/* Inline edit toolbar is always shown if conditions met, not dependent on showCode */}
      {isEditingInline && toolbarPosition && (
        <div
          style={{
            position: "fixed",
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
            width: `${toolbarPosition.width}px`,
            zIndex: 1000,
          }}
        >
          <InlineEditToolbar />
        </div>
      )}
    </div>
  )
}
