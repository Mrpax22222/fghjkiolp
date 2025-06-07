"use client"
import { PreviewPanel } from "@/components/editor/preview-panel"
import { StatusBar } from "@/components/editor/status-bar"
import { useEditorStore } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileDown, Eye, Settings, Undo2, Redo2, Code, Copy, MonitorPlay } from "lucide-react" // Added Copy, MonitorPlay
import Link from "next/link"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { useState, useEffect } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import html2pdf from 'html2pdf.js'
import { toast } from "sonner"


export function EditorLayout() {
  const { currentEditor, generateOutput, iframeDoc } = useEditorStore()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [showCodeView, setShowCodeView] = useState(false) // State for toggling code view

  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("")

  const handleCopyCode = () => {
    const editorStoreState = useEditorStore.getState(); // Get the store's state
    if (editorStoreState.currentEditor) { // Check if currentEditor exists in the store
      const codeToCopy = editorStoreState.generateOutput(); // Call generateOutput
      navigator.clipboard.writeText(codeToCopy)
        .then(() => {
          console.log("Code copied to clipboard from layout (using generateOutput)!");
          toast.success("کد با موفقیت کپی شد!");
        })
        .catch(err => {
          console.error("Failed to copy code from layout (using generateOutput): ", err);
          toast.error("خطا در کپی کردن کد.");
        });
    } else {
      console.warn("handleCopyCode: No currentEditor found in store.");
      toast.error("امکان کپی کد وجود ندارد: ویرایشگر بارگذاری نشده است.");
    }
  };

  const generatePdfWithHtml2Pdf = async (action: 'preview' | 'download') => {
    const htmlContent = generateOutput();
    if (!htmlContent || !iframeDoc) {
      console.error("No HTML content or iframeDoc not ready.");
      return;
    }
    
    // Create a temporary element to hold the clean HTML for html2pdf.js
    // This is important because html2pdf.js works best with a DOM element.
    const tempElement = iframeDoc.createElement('div');
    // iframeDoc.body.appendChild(tempElement); // Append to iframe's body temporarily if needed for styles
    tempElement.innerHTML = htmlContent; // Use the full HTML structure

    // We need to ensure the styles are applied.
    // If generateOutput() doesn't include a full HTML document with styles,
    // we might need to clone iframeDoc.documentElement as the source.
    // For simplicity, assuming generateOutput() provides a self-contained styled HTML string.
    // If not, use: const elementToPrint = iframeDoc.documentElement.cloneNode(true) as HTMLElement;

    // Find the actual body content from the string to avoid nested html/body tags if generateOutput gives full HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const elementToPrint = doc.body; // Or doc.documentElement if generateOutput() is a full HTML page.

    setIsGeneratingPdf(true);

    const options = {
      margin: 1,
      filename: `${currentEditor?.name || "document"}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false }, // Options for html2canvas
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }, // Options for jsPDF
      // pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } // Optional: control page breaks
    };

    try {
      if (action === 'preview') {
        const pdfDataUrl = await html2pdf().set(options).from(elementToPrint).toPdf().output('datauristring');
        if (pdfPreviewUrl) {
          URL.revokeObjectURL(pdfPreviewUrl); // Revoke previous if it was a blob URL
        }
        setPdfPreviewUrl(pdfDataUrl);
        setIsPdfPreviewOpen(true);
      } else if (action === 'download') {
        await html2pdf().set(options).from(elementToPrint).save();
        // Optional: Close preview after download
        // setIsPdfPreviewOpen(false);
        // if (pdfPreviewUrl) {
        //   URL.revokeObjectURL(pdfPreviewUrl);
        //   setPdfPreviewUrl("");
        // }
      }
    } catch (error) {
      console.error("Error generating PDF with html2pdf.js:", error);
    } finally {
      setIsGeneratingPdf(false);
      // iframeDoc.body.removeChild(tempElement); // Clean up temp element if appended
    }
  };

  const handlePreviewPdf = () => {
    generatePdfWithHtml2Pdf('preview');
  };

  const handleDownload = () => {
    // If preview is open and URL exists, we could try to download that blob,
    // but html2pdf.js's .save() is direct.
    // If we want to download the *exact* blob from preview, we'd need to store it.
    // For simplicity, regenerating for download is fine for a demo.
    generatePdfWithHtml2Pdf('download');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable fullscreen: ${e.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  // The `handleViewHtml` function is removed, its functionality is replaced by the toggle button.

  // Cleanup URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl)
      }
    }
  }, [pdfPreviewUrl])

  // Update the editor layout to better support dark mode and make it more Word-like
  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <header className="h-14 border-b px-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">بازگشت به صفحه اصلی</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight">{currentEditor?.name || "ویرایشگر سند"}</h1>
            <p className="text-xs text-muted-foreground">ویرایشگر پیشرفته با قابلیت‌های مشابه ورد</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => {
                    const editorStore = useEditorStore.getState()
                    if (editorStore.canUndo) {
                      editorStore.undo()
                    }
                  }}
                  disabled={!useEditorStore.getState().canUndo}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">واگرد (Ctrl+Z)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => {
                    const editorStore = useEditorStore.getState()
                    if (editorStore.canRedo) {
                      editorStore.redo()
                    }
                  }}
                  disabled={!useEditorStore.getState().canRedo}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">از نو (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <ModeToggle />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full" onClick={toggleFullscreen}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">پیش‌نمایش تمام صفحه</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>تنظیمات ویرایشگر</DropdownMenuItem>
              <DropdownMenuItem>راهنما</DropdownMenuItem>
              <DropdownMenuItem>درباره</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* This button REPLACES the old "مشاهده HTML" button and TOGGLES the view */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setShowCodeView(!showCodeView)}
                  disabled={!currentEditor} // Optionally disable if no content
                >
                  {showCodeView ? <MonitorPlay className="h-4 w-4" /> : <Code className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {showCodeView ? "نمایش پیش‌نمایش زنده" : "نمایش کد HTML"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button size="sm" className="rounded-full gap-2 px-4" onClick={handlePreviewPdf} disabled={isGeneratingPdf || !iframeDoc}>
            {isGeneratingPdf || !iframeDoc ? ( // Show loader if generating or iframeDoc not ready
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال آماده‌سازی...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                پیش‌نمایش PDF
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Toolbar at the top like Word */}
      <EditorToolbar />

      {/* Main content area: Renders Code View or PreviewPanel based on showCodeView state */}
      <div className="flex-1 overflow-auto"> {/* `overflow-auto` for scrolling if code is long */}
        {showCodeView ? (
          currentEditor ? ( // Check if currentEditor exists
            <div className="p-4 h-full flex flex-col"> {/* Padding and flex layout for code view */}
              <div className="flex justify-end mb-2"> {/* Copy button aligned to the right */}
                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                  <Copy className="w-4 h-4 mr-1" />
                  کپی کردن کد
                </Button>
              </div>
              <div className="flex-grow overflow-auto bg-white dark:bg-gray-900 rounded-md"> {/* Scrollable area for pre/code */}
                <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto h-full">
                  <code className="font-mono text-gray-800 dark:text-gray-200">
                    {useEditorStore.getState().generateOutput()} {/* Call generateOutput here */}
                  </code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              ویرایشگر بارگذاری نشده یا محتوایی برای نمایش وجود ندارد.
            </div>
          )
        ) : (
          // Container for PreviewPanel to ensure it fills available space correctly
          <div className="flex-1 overflow-hidden h-full">
            <PreviewPanel />
          </div>
        )}
      </div>

      <StatusBar />

      {/* اضافه کردن دیالوگ پیش‌نمایش PDF بعد از بخش StatusBar */}
      <Dialog open={isPdfPreviewOpen} onOpenChange={setIsPdfPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>پیش‌نمایش PDF</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <div className="bg-muted rounded-md p-4 h-[60vh] overflow-auto">
              {pdfPreviewUrl ? (
                <iframe src={pdfPreviewUrl} className="w-full h-full border-0" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPdfPreviewOpen(false)}>
                انصراف
              </Button>
              <Button onClick={handleDownload} disabled={isGeneratingPdf || !pdfPreviewUrl}>
                {isGeneratingPdf ? ( // Keep download button showing loader only if isGeneratingPdf is true
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    در حال آماده‌سازی...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    دانلود PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
