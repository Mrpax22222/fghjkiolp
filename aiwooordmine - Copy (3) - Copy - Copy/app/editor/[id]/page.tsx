"use client"

import { useEffect, use } from "react" // Import 'use'
import { EditorLayout } from "@/components/editor/editor-layout"
import { useEditorStore } from "@/store/editor-store"
import { LoadingEditor } from "@/components/editor/loading-editor"

const KNOWN_TEMPLATE_IDS = ["report-template", "article-template", "resume-template"];

export default function EditorPage({ params }: { params: { id: string } }) {
  // Unwrap params using React.use() as per the warning.
  // 'params' itself is treated as the Promise.
  const resolvedParams = use(params as any);
  const id = (resolvedParams as { id: string }).id;

  const { setCurrentEditor, isLoaded, setIsLoaded } = useEditorStore()

  useEffect(() => {
    let isMounted = true;
    setIsLoaded(false); // Set loading at the start of the effect

    const loadEditorData = async () => {
      if (!id) {
        if (isMounted) setIsLoaded(true); // No ID, nothing to load
        return;
      }

      try {
        let editorConfig;
        if (KNOWN_TEMPLATE_IDS.includes(id)) {
          const templateBaseConfig = {
            id: id,
            name:
              id === "report-template"
                ? "قالب گزارش نقشه برداری"
                : id === "article-template"
                  ? "قالب مقاله علمی"
                  : "قالب رزومه",
            htmlFilePath: `/templates/${id}.html`,
            pageStructureSelector: "div.page" as const,
            newPageTemplate: `<div class="page rtl">
              <h2 class="section-title"><i class="fas fa-sticky-note"></i> صفحه جدید</h2>
              <div class="notes-area">
              </div>
              <div class="footer">
                گزارش کار - درس نقشه برداری عملی
              </div>
              <div class="page-number">صفحه جدید</div>
            </div>`,
            contentRemovalSelectorsForNewPage: [".notes-area"],
            pageNumberElementSelector: ".page-number" as const,
            pageNumberPattern: {
              prefix: "صفحه ",
              suffix: "",
              numberSystem: "persian" as "persian" | "western",
            },
          };
          const response = await fetch(templateBaseConfig.htmlFilePath);
          if (!response.ok) {
            throw new Error(`Failed to fetch template: ${response.statusText}`);
          }
          const templateHtml = await response.text();
          editorConfig = {
            ...templateBaseConfig,
            initialContent: templateHtml,
          };
        } else {
          editorConfig = {
            id: id,
            name: `ویرایشگر ${id}`,
            initialContent: localStorage.getItem(`editor-content-${id}`) || getDefaultHtml(),
            pageStructureSelector: "div.page" as const,
            newPageTemplate: `<div class="page rtl">
              <h2 class="section-title"><i class="fas fa-sticky-note"></i> صفحه جدید</h2>
              <div class="notes-area">
              </div>
              <div class="footer">
                گزارش کار - درس نقشه برداری عملی
              </div>
              <div class="page-number">صفحه جدید</div>
            </div>`,
            contentRemovalSelectorsForNewPage: [".notes-area"],
            pageNumberElementSelector: ".page-number" as const,
            pageNumberPattern: {
              prefix: "صفحه ",
              suffix: "",
              numberSystem: "persian" as "persian" | "western",
            },
          };
        }
        if (isMounted && editorConfig) {
          setCurrentEditor(editorConfig);
        }
      } catch (error) {
        console.error(`Error loading editor data for id: ${id}`, error);
        if (isMounted) {
          // Fallback to a default editor configuration on error
          setCurrentEditor({
            id: id,
            name: `خطا در بارگذاری ${id}`,
            initialContent: getDefaultHtml(),
            pageStructureSelector: "div.page" as const,
            newPageTemplate: `<div class="page rtl"><h2>صفحه جدید</h2></div>`,
            contentRemovalSelectorsForNewPage: [],
            pageNumberElementSelector: ".page-number" as const,
            pageNumberPattern: { prefix: "صفحه ", suffix: "", numberSystem: "persian" as "persian" | "western" },
          });
        }
      } finally {
        if (isMounted) {
          setIsLoaded(true); // Ensure isLoaded is true after all operations
        }
      }
    };

    loadEditorData();

    return () => {
      isMounted = false; // Cleanup on unmount
    };
  }, [id, setCurrentEditor, setIsLoaded]);

  if (!isLoaded) {
    return <LoadingEditor />
  }

  return <EditorLayout />
}

// تابع برای ایجاد HTML پیش‌فرض در صورت شروع از صفر
function getDefaultHtml() {
  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <title>سند جدید</title>
    <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" type="text/css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            font-size: 12px;
            color: #000000;
            font-family: 'Vazirmatn', sans-serif;
            direction: rtl;
            line-height: 1.7;
            font-weight: 600;
        }
        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 10mm auto;
            background: white;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
            box-sizing: border-box !important;
            position: relative;
            page-break-after: always;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        .page:hover {
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }
        .center-title {
            text-align: center;
            margin-bottom: 15mm;
        }
        .center-title h1 { 
            font-size: 24px; 
            color: #1a1a1a; 
            font-weight: 900;
            margin-bottom: 8px;
        }
        .center-title h2 { 
            font-size: 18px; 
            color: #333333; 
            font-weight: 800;
        }
        .section-box {
            border: 1px solid #e0e0e0;
            padding: 16px;
            margin-bottom: 20px;
            border-radius: 8px;
            background-color: #f9f9f9;
            transition: all 0.2s ease;
        }
        .section-box:hover {
            border-color: #bdbdbd;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .section-title {
            border-bottom: 2px dashed #bdbdbd;
            padding-bottom: 8px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.3em;
            font-weight: bold;
            color: #333333;
        }
        .section-title i {
            color: #2563eb;
        }
        .footer {
            position: absolute;
            bottom: 15mm;
            left: 20mm;
            right: 20mm;
            font-size: 12px;
            color: #666666;
            text-align: left;
            font-weight: 600;
            padding-top: 8px;
            border-top: 1px solid #e0e0e0;
        }
        .page-number {
            position: absolute;
            text-align: right;
            left: auto;
            right: 20mm;
            bottom: 15mm;
            color: #666666;
            font-weight: 600;
        }
        p {
            text-align: justify;
            line-height: 1.8;
        }
        ul, ol {
            padding-right: 20px;
        }
        ul li, ol li {
            margin-bottom: 8px;
        }
        ul li i, ol li i {
            color: #2563eb;
            margin-left: 6px;
        }
    </style>
</head>
<body>
<div class="page rtl">
    <div class="center-title">
        <h1><i class="fas fa-file-alt"></i> عنوان سند</h1>
        <h2>زیرعنوان سند</h2>
    </div>
    <div class="section-box">
        <h2 class="section-title"><i class="fas fa-pen"></i> بخش اول</h2>
        <p>
            این یک متن نمونه است. شما می‌توانید این متن را ویرایش کنید و محتوای مورد نظر خود را جایگزین کنید.
        </p>
    </div>
    <div class="footer">
        پاورقی سند
    </div>
    <div class="page-number">صفحه 1</div>
</div>
</body>
</html>`
}