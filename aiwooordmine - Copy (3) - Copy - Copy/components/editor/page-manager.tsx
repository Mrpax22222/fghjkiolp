"use client"

import { useEditorStore } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { FilePlus, FileText, Layers, RefreshCw, Copy, Star, Plus, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useEffect, useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import html2canvas from "html2canvas"
import { deriveSelectorForSingleElement } from "@/lib/utils"

// کلاس‌های CSS برای حالت‌های مختلف کالیبراسیون
const CSS_CLASSES = {
  CALIBRATE_PAGE: "template-calibrate-page",
  CALIBRATE_ELEMENT: "template-calibrate-element",
  SELECTED_ELEMENT: "template-selected-element",
}

export function PageManager({ inline = false }: { inline?: boolean }) {
  const {
    iframeDoc,
    iframeWin,
    addNewPage,
    renumberPages,
    moveElementToPage,
    copyElementToPage,
    markPageAsTemplate,
    createPageFromTemplate,
    templatePages,
    selectedElements,
    updateElementContent,
  } = useEditorStore()

  const [pageCount, setPageCount] = useState(0)
  const [pages, setPages] = useState<Element[]>([])
  const [selectedPage, setSelectedPage] = useState<number | null>(null)

  // تغییر رویکرد انتخاب صفحه و عناصر به صورت مستقیم در پیش‌نمایش

  // جایگزین کردن متغیرهای وضعیت دیالوگ با متغیرهای وضعیت انتخاب مستقیم
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [isDirectSelectionMode, setIsDirectSelectionMode] = useState(false)
  const [isNamingDialogOpen, setIsNamingDialogOpen] = useState(false)

  const [isCreateFromTemplateDialogOpen, setIsCreateFromTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [localSelectedElements, setLocalSelectedElements] = useState<string[]>([])
  const [availableElements, setAvailableElements] = useState<{ id: string; name: string; type: string }[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [elementContents, setElementContents] = useState<Record<string, string>>({})
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([])
  const [selectedElementsPreview, setSelectedElementsPreview] = useState<Record<string, string>>({})
  const [currentStep, setCurrentStep] = useState<"page" | "elements" | "name">("page")
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false)

  // وضعیت کالیبراسیون
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationStep, setCalibrationStep] = useState<"page" | "elements" | null>(null)
  const [calibrationBasePageElement, setCalibrationBasePageElement] = useState<Element | null>(null)
  const [pageSelector, setPageSelector] = useState<string>("")
  const [draftPageSelector, setDraftPageSelector] = useState<string>("")
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [showHelp, setShowHelp] = useState(true) // This state is not currently used, consider removing or implementing help feature.

  // Reference to store the original page HTML for previewing selected elements
  const selectedPageHtmlRef = useRef<string>("")

  // Subscribe to iframeDoc and iframeWin from the store
  const iframeDocFromStore = useEditorStore((state) => state.iframeDoc);
  const iframeWinFromStore = useEditorStore((state) => state.iframeWin);
  const [thumbnailTrigger, setThumbnailTrigger] = useState(0);

  useEffect(() => {
    if (!iframeDocFromStore || !iframeWinFromStore) {
      // If iframe is not ready, clear relevant states
      setPages([]);
      setPageThumbnails([]);
      setPageCount(0);
      return; // Exit effect
    }

    // Initial population of pages and thumbnails
    const initialPageElements = iframeDocFromStore.querySelectorAll(".page");
    const initialPagesArray = Array.from(initialPageElements);
    
    setPageCount(initialPagesArray.length);
    setPages(initialPagesArray);

    // Initial thumbnail generation
    if (initialPagesArray.length > 0) {
      generatePageThumbnails(initialPagesArray);
    } else {
      setPageThumbnails([]);
    }

    // Setup MutationObserver to watch for page changes in the iframe
    const observer = new MutationObserver(() => {
      if (!iframeDocFromStore) return;

      const updatedPageElements = iframeDocFromStore.querySelectorAll(".page");
      const updatedPagesArray = Array.from(updatedPageElements);

      // Update state based on observed changes
      setPageCount(updatedPagesArray.length);
      setPages(updatedPagesArray);
      // Trigger the separate effect for thumbnail generation
      setThumbnailTrigger(prev => prev + 1);
    });

    // Observe direct children changes on the iframe's body
    observer.observe(iframeDocFromStore.body, {
      childList: true, // Detect additions/removals of direct children
      subtree: false,  // Do not observe deeper subtree changes for this particular observer
    });

    // Cleanup function to disconnect the observer when the effect re-runs or component unmounts
    return () => {
      observer.disconnect();
    };
  }, [iframeDocFromStore, iframeWinFromStore]); // Re-run if iframeDoc or iframeWin changes

  // useEffect to handle thumbnail generation based on trigger and pages state
  useEffect(() => {
    // Avoid running on initial mount if thumbnailTrigger is 0 and pages is empty,
    // as initial generation is handled in the main useEffect.
    if (thumbnailTrigger === 0 && pages.length === 0) {
        return;
    }

    if (pages.length > 0) {
      generatePageThumbnails(pages);
    } else {
      setPageThumbnails([]); // Clear thumbnails if no pages
    }
    // The dependency on `pages` ensures that if `pages` array reference changes
    // (e.g. elements are added/removed), thumbnails are regenerated.
    // `generatePageThumbnails` should be stable or memoized if it were a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbnailTrigger, pages]);


  // تابع برای تلاش برای ادامه به مرحله انتخاب عناصر
  const attemptProceedToElementSelection = (currentDraftSelector: string) => {
    if (!iframeDoc) {
      setStatusMessage("خطا: دسترسی به محتوای صفحه امکان‌پذیر نیست.")
      return
    }

    try {
      const elements = iframeDoc.querySelectorAll(currentDraftSelector)
      if (elements.length === 0) {
        setStatusMessage(`خطا: سلکتور "${currentDraftSelector}" هیچ عنصری را پیدا نکرد. لطفاً عنصر دیگری را برای صفحه انتخاب کنید.`)
        setPageSelector("") // Clear any previously valid page selector
        // Keep draftPageSelector as is, so user sees what failed.
        // Calibration step remains "page"
        return
      }

      // Selector is valid and finds elements
      setPageSelector(currentDraftSelector)
      setCalibrationStep("elements")
      startCalibration("elements") // This will set its own initial status message for element selection
      setStatusMessage(`محدوده صفحه با سلکتور "${currentDraftSelector}" تایید شد. اکنون عناصر قابل ویرایش را انتخاب کنید.`)
      showCalibrationNotification("مرحله ۲: عناصر قابل ویرایش را انتخاب کنید")
    } catch (e) {
      console.error("خطا در اعتبارسنجی سلکتور صفحه:", e)
      setStatusMessage(`خطا: سلکتور "${currentDraftSelector}" نامعتبر است. لطفاً عنصر دیگری را برای صفحه انتخاب کنید.`)
      setPageSelector("")
    }
  }


  // Function to generate thumbnails for pages
  const generatePageThumbnails = async (pageElements: Element[]) => {
    if (!iframeDoc || !iframeWin || pageElements.length === 0 || isGeneratingThumbnails) return

    setIsGeneratingThumbnails(true)
    const TARGET_MAX_DIMENSION = 150 // px for the longest side of the thumbnail

    try {
      const thumbnails: string[] = []

      for (let i = 0; i < pageElements.length; i++) {
        const page = pageElements[i] as HTMLElement
        const originalWidth = page.offsetWidth
        const originalHeight = page.offsetHeight

        if (originalWidth === 0 || originalHeight === 0) {
          console.warn("Skipping thumbnail for zero-dimension page element:", page)
          thumbnails.push("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7") // 1x1 transparent gif
          continue
        }

        let thumbnailScale: number
        if (originalWidth > originalHeight) {
          thumbnailScale = TARGET_MAX_DIMENSION / originalWidth
        } else {
          thumbnailScale = TARGET_MAX_DIMENSION / originalHeight
        }
        thumbnailScale = Math.min(1, thumbnailScale) // Don't scale up if element is smaller than target

        try {
          const canvas = await html2canvas(page, {
            logging: false,
            backgroundColor: iframeWin?.getComputedStyle(page).backgroundColor || "#ffffff",
            width: originalWidth,
            height: originalHeight,
            scale: thumbnailScale,
            useCORS: true,
            onclone: (clonedDoc, clonedElement) => {
              // clonedElement is the clone of 'page' in html2canvas's internal document
              const elementsToClean = (clonedElement as HTMLElement).querySelectorAll("[data-editor-id]");
              elementsToClean.forEach((el) => {
                el.classList.remove("editor-highlight-hover", "editor-highlight-selected");
                el.removeAttribute("contenteditable");
              });
              // Clean the root element itself if it has editor attributes
              if ((clonedElement as HTMLElement).matches("[data-editor-id]")) {
                (clonedElement as HTMLElement).classList.remove("editor-highlight-hover", "editor-highlight-selected");
                (clonedElement as HTMLElement).removeAttribute("contenteditable");
              }

              // Optional: copy essential styles if html2canvas misses them, though it's usually good.
              // This ensures styles defined in the original iframe's head are available.
              const originalIframeDoc = page.ownerDocument;
              if (originalIframeDoc && originalIframeDoc.head && clonedDoc && clonedDoc.head) {
                Array.from(originalIframeDoc.head.querySelectorAll('link[rel="stylesheet"]')).forEach(link => {
                  if (link instanceof HTMLLinkElement && link.getAttribute('href') && !clonedDoc.head.querySelector(`link[href="${link.getAttribute('href')}"]`)) {
                    clonedDoc.head.appendChild(link.cloneNode(true));
                  }
                });
                Array.from(originalIframeDoc.head.querySelectorAll('style')).forEach(styleTag => {
                  clonedDoc.head.appendChild(styleTag.cloneNode(true));
                });
              }
            },
          })
          thumbnails.push(canvas.toDataURL("image/png"))
        } catch (err) {
          console.error("Error generating thumbnail for page:", page, err)
          thumbnails.push("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23eee'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='10' fill='%23aaa' text-anchor='middle' dy='.3em'%3EError%3C/text%3E%3C/svg%3E") // Placeholder SVG
        }
      }

      setPageThumbnails(thumbnails)
    } catch (error) {
      console.error("Error in generatePageThumbnails process:", error)
    } finally {
      setIsGeneratingThumbnails(false)
    }
  }

  // تابع برای شروع کالیبراسیون
  const startCalibration = (step: "page" | "elements") => {
    if (!iframeDoc) return

    // پاکسازی وضعیت قبلی
    clearCalibration()

    // تنظیم وضعیت کالیبراسیون
    setIsCalibrating(true)
    setCalibrationStep(step)

    if (step === "page") {
      setStatusMessage("لطفاً یک عنصر که نشان‌دهنده کل صفحه است را انتخاب کنید.")

      // اضافه کردن کلاس به همه عناصر برای نمایش حالت کالیبراسیون
      const allElements = iframeDoc.querySelectorAll("*")
      allElements.forEach((el) => {
        if (el !== iframeDoc.body && el !== iframeDoc.documentElement) {
          el.classList.add(CSS_CLASSES.CALIBRATE_PAGE)
        }
      })

      // نمایش راهنما
      showCalibrationNotification("لطفاً روی عنصری که نشان‌دهنده کل صفحه است کلیک کنید")
    } else if (step === "elements") {
      setStatusMessage("لطفاً عناصری که می‌خواهید در قالب قابل ویرایش باشند را انتخاب کنید.")

      if (calibrationBasePageElement) {
        // اضافه کردن کلاس به عناصر داخل صفحه انتخاب شده
        const elements = calibrationBasePageElement.querySelectorAll("[data-editor-id]")
        elements.forEach((el) => {
          el.classList.add(CSS_CLASSES.CALIBRATE_ELEMENT)
        })
      }

      // نمایش راهنما
      showCalibrationNotification("لطفاً روی عناصری که می‌خواهید قابل ویرایش باشند کلیک کنید")
    }
  }

  // تابع برای پایان کالیبراسیون
  const endCalibration = () => {
    clearCalibration()
    setIsCalibrating(false)
    setCalibrationStep(null)
    setStatusMessage("")
  }

  // تابع برای پاکسازی وضعیت کالیبراسیون
  const clearCalibration = () => {
    if (!iframeDoc) return

    // حذف کلاس‌های کالیبراسیون از همه عناصر
    const calibratePageElements = iframeDoc.querySelectorAll(`.${CSS_CLASSES.CALIBRATE_PAGE}`)
    calibratePageElements.forEach((el) => {
      el.classList.remove(CSS_CLASSES.CALIBRATE_PAGE)
    })

    const calibrateElementElements = iframeDoc.querySelectorAll(`.${CSS_CLASSES.CALIBRATE_ELEMENT}`)
    calibrateElementElements.forEach((el) => {
      el.classList.remove(CSS_CLASSES.CALIBRATE_ELEMENT)
    })

    const selectedElementElements = iframeDoc.querySelectorAll(`.${CSS_CLASSES.SELECTED_ELEMENT}`)
    selectedElementElements.forEach((el) => {
      el.classList.remove(CSS_CLASSES.SELECTED_ELEMENT)
    })
  }

  // تابع برای نمایش اعلان راهنما
  const showCalibrationNotification = (message: string) => {
    const notification = document.createElement("div")
    notification.className = "selection-notification"
    notification.textContent = message
    document.body.appendChild(notification)

    setTimeout(() => {
      document.body.removeChild(notification)
    }, 3000)
  }

  // تابع برای انتخاب صفحه پایه
  const setCalibrationBasePage = (element: Element) => {
    if (!iframeDoc || calibrationStep !== "page") return

    try {
      // حذف کلاس از صفحه قبلی
      if (calibrationBasePageElement) {
        calibrationBasePageElement.classList.remove(CSS_CLASSES.SELECTED_ELEMENT)
      }

      // اضافه کردن کلاس به صفحه جدید
      element.classList.add(CSS_CLASSES.SELECTED_ELEMENT)

      // ذخیره صفحه انتخاب شده
      setCalibrationBasePageElement(element)

      // استخراج سلکتور
      const selector = deriveSelectorForSingleElement(element)

      if (!selector || selector.trim() === "") {
        setStatusMessage("خطا: نمی‌توان سلکتور مناسبی برای عنصر انتخاب شده ایجاد کرد.")
        return
      }

      setDraftPageSelector(selector)

      // پاکسازی کلاس‌های کالیبراسیون
      const calibrateElements = iframeDoc.querySelectorAll(`.${CSS_CLASSES.CALIBRATE_PAGE}`)
      calibrateElements.forEach((el) => {
        el.classList.remove(CSS_CLASSES.CALIBRATE_PAGE)
      })

      // به‌روزرسانی وضعیت و تلاش برای رفتن به مرحله بعد
      setStatusMessage(`عنصر صفحه انتخاب شد. در حال بررسی سلکتور: ${selector}`)
      // Removed direct showCalibrationNotification here, attemptProceedToElementSelection will handle it or show error.
      attemptProceedToElementSelection(selector)

    } catch (error) {
      console.error("خطا در انتخاب صفحه پایه:", error)
      setStatusMessage("خطا در انتخاب صفحه پایه. لطفاً دوباره تلاش کنید.")
    }
  }

  // تابع confirmPageSelectorAndProceed دیگر استفاده نمی‌شود و منطق آن در attemptProceedToElementSelection ادغام شده است.

  // تابع برای انتخاب/لغو انتخاب عنصر
  const toggleElementSelection = (elementId: string) => {
    if (!iframeDoc) return

    const element = iframeDoc.querySelector(`[data-editor-id="${elementId}"]`)
    if (!element) return

    if (localSelectedElements.includes(elementId)) {
      // لغو انتخاب عنصر
      setLocalSelectedElements((prev) => prev.filter((id) => id !== elementId))
      element.classList.remove(CSS_CLASSES.SELECTED_ELEMENT)
    } else {
      // انتخاب عنصر
      setLocalSelectedElements((prev) => [...prev, elementId])
      element.classList.add(CSS_CLASSES.SELECTED_ELEMENT)
    }
  }

  // تابع برای شروع فرآیند انتخاب مستقیم
  const startDirectTemplateCreation = () => {
    // شروع حالت انتخاب مستقیم
    setIsDirectSelectionMode(true)

    // شروع کالیبراسیون صفحه
    startCalibration("page")

    // نمایش راهنما در بالای صفحه
    showCalibrationNotification("لطفاً روی عنصری که نشان‌دهنده کل صفحه است کلیک کنید")
  }

  // تابع برای پایان فرآیند انتخاب مستقیم و باز کردن دیالوگ نامگذاری
  const finishDirectSelectionAndOpenNaming = () => {
    // پایان حالت انتخاب مستقیم
    setIsDirectSelectionMode(false)

    // پایان کالیبراسیون
    endCalibration()

    // باز کردن دیالوگ نامگذاری
    setIsNamingDialogOpen(true)
  }

  // تغییر تابع confirmElementSelectionAndProceed
  const confirmElementSelectionAndProceed = () => {
    if (localSelectedElements.length === 0) {
      setStatusMessage("لطفاً حداقل یک عنصر انتخاب کنید.")
      return
    }

    // پاکسازی کلاس‌های کالیبراسیون
    clearCalibration()

    // باز کردن دیالوگ نامگذاری
    finishDirectSelectionAndOpenNaming()
  }

  // اضافه کردن event listener برای کلیک در iframe
  useEffect(() => {
    if (!iframeDoc || !isCalibrating) return

    const handleClick = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const target = e.target as Element

      // بررسی کلیک روی body یا html
      if (!target || target === iframeDoc.body || target === iframeDoc.documentElement) {
        return
      }

      if (calibrationStep === "page") {
        // انتخاب صفحه
        setCalibrationBasePage(target)
      } else if (calibrationStep === "elements") {
        // انتخاب عنصر
        const elementId = target.getAttribute("data-editor-id")
        if (elementId) {
          toggleElementSelection(elementId)
        }
      }
    }

    iframeDoc.addEventListener("click", handleClick, true)

    return () => {
      iframeDoc.removeEventListener("click", handleClick, true)
    }
  }, [iframeDoc, isCalibrating, calibrationStep, calibrationBasePageElement])

  // تغییر تابع handleMarkAsTemplate
  const handleMarkAsTemplate = () => {
    try {
      // بررسی همه شرایط لازم
      if (!calibrationBasePageElement) {
        setStatusMessage("خطا: صفحه‌ای انتخاب نشده است.")
        return
      }

      if (localSelectedElements.length === 0) {
        setStatusMessage("خطا: هیچ عنصری انتخاب نشده است.")
        return
      }

      if (!templateName || templateName.trim() === "") {
        setStatusMessage("خطا: لطفاً یک نام برای قالب وارد کنید.")
        return
      }

      if (!pageSelector || pageSelector.trim() === "") {
        setStatusMessage("خطا: سلکتور صفحه معتبر نیست.")
        return
      }

      if (!iframeDoc) {
        setStatusMessage("خطا: دسترسی به محتوای صفحه امکان‌پذیر نیست.")
        return
      }

      // پیدا کردن شماره صفحه
      const pageElements = iframeDoc.querySelectorAll(pageSelector) || []

      if (pageElements.length === 0) {
        setStatusMessage("خطا: هیچ صفحه‌ای با سلکتور مشخص شده یافت نشد.")
        return
      }

      const pageIndex = Array.from(pageElements).indexOf(calibrationBasePageElement)

      if (pageIndex === -1) {
        setStatusMessage("خطا: صفحه انتخاب شده در بین صفحات یافت نشد.")
        return
      }

      // ذخیره قالب
      markPageAsTemplate(pageIndex, templateName, localSelectedElements, pageSelector)

      // پاکسازی وضعیت
      setIsNamingDialogOpen(false)
      setTemplateName("")
      setLocalSelectedElements([])
      setCalibrationBasePageElement(null)
      setPageSelector("")
      setDraftPageSelector("")
      clearCalibration()

      // نمایش اعلان موفقیت
      showCalibrationNotification("قالب با موفقیت ذخیره شد")
    } catch (error) {
      console.error("خطا در ذخیره قالب:", error)
      setStatusMessage(`خطا در ذخیره قالب: ${error instanceof Error ? error.message : "خطای ناشناخته"}`)
    }
  }

  // Function to generate preview of selected elements
  const generateElementPreview = (elementId: string) => {
    if (!iframeDoc || !elementId) return ""

    const element = iframeDoc.querySelector(`[data-editor-id="${elementId}"]`)
    if (!element) return ""

    // Create a simplified preview of the element
    const clone = element.cloneNode(true) as HTMLElement

    // Remove editor-specific classes and attributes
    const editorElements = clone.querySelectorAll("[data-editor-id]")
    editorElements.forEach((el) => {
      el.classList.remove("editor-highlight-hover", "editor-highlight-selected")
      el.removeAttribute("contenteditable")
    })

    return clone.outerHTML
  }

  // Update element previews when selection changes
  useEffect(() => {
    const previews: Record<string, string> = {}

    localSelectedElements.forEach((elementId) => {
      previews[elementId] = generateElementPreview(elementId)
    })

    setSelectedElementsPreview(previews)
  }, [localSelectedElements])

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)

    // پیدا کردن قالب انتخاب شده
    const template = templatePages.find((t) => t.id === templateId)
    if (!template) return

    // تنظیم فیلدهای محتوا برای عناصر قابل ویرایش
    const initialContents: Record<string, string> = {}
    template.editableElements.forEach((elementId) => {
      initialContents[elementId] = ""
    })
    setElementContents(initialContents)
  }

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return

    createPageFromTemplate(selectedTemplate, elementContents)
    setIsCreateFromTemplateDialogOpen(false)
    setSelectedTemplate(null)
    setElementContents({})
  }

  const handleElementContentChange = (elementId: string, content: string) => {
    setElementContents((prev) => ({
      ...prev,
      [elementId]: content,
    }))
  }

  // جایگزین کردن renderTemplateCreationDialog با دیالوگ نامگذاری
  const renderNamingDialog = () => {
    return (
      <Dialog
        open={isNamingDialogOpen}
        onOpenChange={(open) => {
          setIsNamingDialogOpen(open)
          if (!open) {
            // پاکسازی وضعیت
            setLocalSelectedElements([])
            setTemplateName("")
            setCalibrationBasePageElement(null)
            setPageSelector("")
            setDraftPageSelector("")
            clearCalibration()
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>نامگذاری قالب</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">نام قالب</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="نام قالب را وارد کنید"
                className="w-full"
              />
            </div>

            <div className="p-4 border rounded-md bg-muted/20">
              <h4 className="text-sm font-medium mb-2">خلاصه قالب</h4>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="font-medium ml-2">سلکتور صفحه:</span>
                  <span dir="ltr">{pageSelector}</span>
                </div>
                <div className="flex">
                  <span className="font-medium ml-2">تعداد عناصر قابل ویرایش:</span>
                  <span>{localSelectedElements.length} عنصر</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNamingDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={handleMarkAsTemplate} disabled={!templateName}>
              ذخیره قالب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // اضافه کردن کامپوننت نوار راهنما برای حالت انتخاب مستقیم
  const renderDirectSelectionToolbar = () => {
    if (!isDirectSelectionMode) return null

    let guidanceTitle = ""
    let guidanceText = ""
    let showProblematicDraftSelector = false

    if (calibrationStep === "page") {
      guidanceTitle = "مرحله ۱: انتخاب محدوده صفحه"
      if (draftPageSelector && !pageSelector) { // A draft exists, but it's not confirmed (likely failed validation by attemptProceedToElementSelection)
        guidanceText = "سلکتور پیشنهادی برای صفحه معتبر نیست یا هیچ عنصری را پیدا نکرد. لطفاً عنصر دیگری را برای صفحه انتخاب کنید."
        showProblematicDraftSelector = true
      } else if (calibrationBasePageElement && draftPageSelector && pageSelector) { // Page selected and confirmed
        guidanceText = `محدوده صفحه با سلکتور "${pageSelector}" انتخاب شد. در حال انتقال به مرحله بعد...`
      }
      else {
        guidanceText = "روی عنصری که کل صفحه را در بر می‌گیرد کلیک کنید."
      }
    } else if (calibrationStep === "elements") {
      guidanceTitle = "مرحله ۲: انتخاب عناصر قابل ویرایش"
      guidanceText = "روی عناصری که می‌خواهید قابل ویرایش باشند کلیک کنید. برای لغو انتخاب، دوباره کلیک کنید."
    }

    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 min-w-[300px] max-w-[90%] sm:max-w-lg md:max-w-xl">
        <div className="flex-grow space-y-1">
          {guidanceTitle && <p className="text-sm font-medium">{guidanceTitle}</p>}
          {guidanceText && <p className="text-xs text-muted-foreground">{guidanceText}</p>}

          {showProblematicDraftSelector && draftPageSelector && (
            <p className="text-xs text-destructive mt-1">سلکتور ناموفق: <code>{draftPageSelector}</code></p>
          )}
          {pageSelector && calibrationStep === "elements" && (
            <p className="text-xs text-muted-foreground mt-1">سلکتور صفحه تایید شده: <code>{pageSelector}</code></p>
          )}
          {calibrationStep === "elements" && (
            <p className="text-xs text-muted-foreground mt-1">عناصر قابل ویرایش انتخاب شده: {localSelectedElements.length}</p>
          )}
           {statusMessage && (
            <p className={`text-xs mt-1 p-1 rounded ${statusMessage.toLowerCase().includes("خطا:") ? "text-destructive bg-destructive/10" : "text-green-600 bg-green-500/10"}`}>
              {statusMessage}
            </p>
          )}
        </div>

        <div className="flex gap-2 items-center shrink-0">
          {calibrationStep === "elements" && (
            <Button
              size="sm"
              onClick={() => {
                if (localSelectedElements.length > 0) {
                  confirmElementSelectionAndProceed()
                } else {
                  setStatusMessage("حداقل یک عنصر قابل ویرایش را انتخاب کنید.")
                  showCalibrationNotification("حداقل یک عنصر قابل ویرایش را انتخاب کنید.")
                }
              }}
              disabled={localSelectedElements.length === 0}
            >
              تایید عناصر و نامگذاری
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsDirectSelectionMode(false) // Ensure mode is exited
              endCalibration()
              // TODO: Clear session storage if implementing persistence
            }}
          >
            لغو
          </Button>
        </div>
      </div>
    )
  }

  // Visual template usage dialog
  const renderTemplateUsageDialog = () => {
    return (
      <Dialog open={isCreateFromTemplateDialogOpen} onOpenChange={setIsCreateFromTemplateDialogOpen}>
        <DialogTrigger asChild>
          <Button className={inline ? "h-8" : "w-full justify-start"} variant={inline ? "ghost" : "outline"}>
            <Plus className={inline ? "h-4 w-4 ml-2" : "mr-2 h-4 w-4"} />
            ایجاد از قالب
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>ایجاد صفحه از قالب</DialogTitle>
          </DialogHeader>

          {templatePages.length > 0 ? (
            <div className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-4">انتخاب قالب</h3>
                  <ScrollArea className="h-[60vh] pr-2">
                    <div className="space-y-2">
                      {templatePages.map((template) => (
                        <Card
                          key={template.id}
                          className={`overflow-hidden cursor-pointer transition-all ${
                            selectedTemplate === template.id ? "ring-2 ring-primary" : "hover:shadow-md"
                          }`}
                          onClick={() => handleSelectTemplate(template.id)}
                        >
                          <CardHeader className="p-3">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <Badge>{template.editableElements.length} عنصر قابل ویرایش</Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="md:col-span-2">
                  {selectedTemplate ? (
                    <div className="border rounded-md p-4">
                      <h3 className="text-sm font-medium mb-4">ویرایش محتوای عناصر</h3>
                      <ScrollArea className="h-[60vh] pr-2">
                        <div className="space-y-6">
                          {Object.keys(elementContents).map((elementId) => {
                            const template = templatePages.find((t) => t.id === selectedTemplate)
                            if (!template) return null

                            // Find element info if available
                            const elementInfo = availableElements.find((e) => e.id === elementId) || {
                              id: elementId,
                              name: `عنصر ${elementId.substring(0, 8)}`,
                              type: "unknown",
                            }

                            return (
                              <div key={elementId} className="space-y-2">
                                <Label htmlFor={`content-${elementId}`} className="font-medium">
                                  {elementInfo.name}
                                </Label>
                                <Textarea
                                  id={`content-${elementId}`}
                                  value={elementContents[elementId]}
                                  onChange={(e) => handleElementContentChange(elementId, e.target.value)}
                                  placeholder={`محتوای جدید برای ${elementInfo.name}`}
                                  rows={3}
                                  className="resize-none"
                                />
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>

                      <div className="mt-4">
                        <Button onClick={handleCreateFromTemplate} className="w-full">
                          ایجاد صفحه با محتوای جدید
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full border rounded-md p-8">
                      <div className="text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>لطفاً یک قالب را از سمت راست انتخاب کنید</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>هیچ قالبی ذخیره نشده است. ابتدا یک صفحه را به عنوان قالب ذخیره کنید.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  // تغییر در inline mode
  if (inline) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm mr-2">تعداد صفحات: {pageCount}</div>

        <Button variant="ghost" className="h-8" onClick={addNewPage}>
          <FilePlus className="h-4 w-4 ml-2" />
          صفحه جدید
        </Button>

        <Button variant="ghost" className="h-8" onClick={renumberPages}>
          <RefreshCw className="h-4 w-4 ml-2" />
          شماره‌گذاری
        </Button>

        <Button variant="ghost" className="h-8" onClick={startDirectTemplateCreation} disabled={isDirectSelectionMode}>
          <Star className="h-4 w-4 ml-2" />
          ذخیره به عنوان قالب
        </Button>

        {renderNamingDialog()}
        {renderDirectSelectionToolbar()}
        {renderTemplateUsageDialog()}

        <Button
          variant="ghost"
          className="h-8"
          onClick={() => moveElementToPage("next")}
          disabled={!useEditorStore.getState().selectedElements.length}
        >
          <Layers className="h-4 w-4 ml-2" />
          انتقال به صفحه بعد
        </Button>

        <Button
          variant="ghost"
          className="h-8"
          onClick={() => copyElementToPage("next")}
          disabled={!useEditorStore.getState().selectedElements.length}
        >
          <Copy className="h-4 w-4 ml-2" />
          کپی به صفحه بعد
        </Button>
      </div>
    )
  }

  // تغییر در حالت عادی
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">مدیریت صفحات</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <Tabs defaultValue="pages">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="pages" className="flex-1">
                صفحات
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex-1">
                قالب‌ها
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pages">
              <div className="text-sm mb-4">تعداد صفحات: {pageCount}</div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {Array.from({ length: Math.min(4, pageCount) }).map((_, index) => (
                  <Card key={index} className="overflow-hidden cursor-pointer transition-all hover:shadow-md">
                    <div className="aspect-[210/297] relative bg-muted/30 flex items-center justify-center">
                      {pageThumbnails[index] ? (
                        <img
                          src={pageThumbnails[index] || "/placeholder.svg"}
                          alt={`صفحه ${index + 1}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                      )}
                    </div>
                    <CardFooter className="p-2 bg-muted/20">
                      <p className="text-xs font-medium w-full text-center">صفحه {index + 1}</p>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              <div className="space-y-2">
                <Button className="w-full justify-start" variant="outline" onClick={addNewPage}>
                  <FilePlus className="mr-2 h-4 w-4" />
                  افزودن صفحه جدید
                </Button>

                <Button className="w-full justify-start" variant="outline" onClick={renumberPages}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  اعمال شماره‌گذاری صفحات
                </Button>

                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={startDirectTemplateCreation}
                  disabled={isDirectSelectionMode}
                >
                  <Star className="mr-2 h-4 w-4" />
                  ذخیره به عنوان قالب
                </Button>

                {renderNamingDialog()}
                {renderDirectSelectionToolbar()}

                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => moveElementToPage("next")}
                  disabled={!useEditorStore.getState().selectedElements.length}
                >
                  <Layers className="mr-2 h-4 w-4" />
                  انتقال عنصر به صفحه بعدی
                </Button>

                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => copyElementToPage("next")}
                  disabled={!useEditorStore.getState().selectedElements.length}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  کپی عنصر به صفحه بعدی
                </Button>

                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => moveElementToPage("prev")}
                  disabled={!useEditorStore.getState().selectedElements.length}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  انتقال عنصر به صفحه قبلی
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="templates">
              <div className="space-y-2">
                {renderTemplateUsageDialog()}

                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-medium">قالب‌های ذخیره شده</h3>
                  {templatePages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {templatePages.map((template) => (
                        <Card key={template.id} className="overflow-hidden">
                          <CardHeader className="p-3">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <Badge className="mb-2">{template.editableElements.length} عنصر قابل ویرایش</Badge>
                            <div className="flex gap-2 mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  handleSelectTemplate(template.id)
                                  setIsCreateFromTemplateDialogOpen(true)
                                }}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                استفاده
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4 border rounded-md">
                      هیچ قالبی ذخیره نشده است
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
