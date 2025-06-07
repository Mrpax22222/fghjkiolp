import { create } from "zustand"
import { enableMapSet } from "immer"
import morphdom from 'morphdom';

// Enable Map and Set support for immer
enableMapSet()

interface Editor {
  id: string
  name: string
  initialContent: string
  pageStructureSelector: string
  newPageTemplate: string
  contentRemovalSelectorsForNewPage?: string[]
  pageNumberElementSelector?: string
  pageNumberPattern?: {
    prefix: string
    suffix: string
    numberSystem: "western" | "persian"
  }
}

interface TemplatePage {
  id: string
  name: string
  pageIndex: number
  html: string
  editableElements: string[]
  pageSelector: string // Added pageSelector
}

interface EditorState {
  // وضعیت‌های اصلی
  currentEditor: Editor | null
  isLoaded: boolean
  iframeDoc: Document | null
  iframeWin: Window | null

  // وضعیت‌های انتخاب و هاور
  selectedElements: string[]
  hoveredElement: string | null

  // وضعیت ویرایش درون‌خطی
  isEditingInline: boolean
  activeInlineEditElement: string | null

  // وضعیت تاریخچه
  history: HTMLElement[] // Changed from string[]
  historyIndex: number
  isUndoRedoOperation: boolean

  // وضعیت هوش مصنوعی
  isAiEditing: boolean
  aiTargetElement: string | null
  aiEditScope: "element" | "wholeFile"
  setAiEditScope: (scope: "element" | "wholeFile") => void

  // وضعیت‌های دیگر
  originalStylesFromTemplate: string
  headContentForOutputFromTemplate: string

  // وضعیت قالب‌ها
  templatePages: TemplatePage[]

  // اضافه کردن متغیر mutationObserver به state
  mutationObserver: MutationObserver | null

  // اکشن‌ها
  setCurrentEditor: (editor: Editor) => void
  setIsLoaded: (isLoaded: boolean) => void
  setIframeDoc: (doc: Document) => void
  setIframeWin: (win: Window) => void

  selectElement: (elementId: string) => void
  clearSelection: () => void
  hoverElement: (elementId: string) => void
  clearHover: () => void

  updateElementAttribute: (elementId: string, attribute: string, value: string) => void
  removeElement: (elementId: string) => void
  moveElement: (elementId: string, direction: "up" | "down") => void

  startInlineEditing: (elementId: string) => void
  finishInlineEditing: () => void
  executeCommand: (command: string, value?: string) => void

  addNewPage: () => void
  renumberPages: () => void
  moveElementToPage: (direction: "prev" | "next") => void
  copyElementToPage: (direction: "prev" | "next") => void

  // اکشن‌های مربوط به قالب‌ها
  markPageAsTemplate: (pageIndex: number, name: string, editableElements: string[], pageSelector: string) => void
  createPageFromTemplate: (templateId: string, elementContents?: Record<string, string>) => void

  addHistorySnapshot: () => void
  undo: () => void
  redo: () => void

  startAiEditing: () => void
  applyAiChanges: (htmlContent: string) => void
  cancelAiEditing: () => void

  generateOutput: () => string

  // محاسبه‌های مشتق شده
  canUndo: boolean
  canRedo: boolean

  setupKeyboardShortcuts: () => void

  // اضافه کردن تابع setMutationObserver به اکشن‌ها
  setMutationObserver: (observer: MutationObserver) => void

  // Add this function to the EditorState interface
  updateElementContent: (elementId: string, content: string) => void
}

export const useEditorStore = create<EditorState>((set, get) => {
  const EDITOR_TEMPLATES_KEY = "editor-templates";

  // Load templates from localStorage on initialization
  let initialTemplatePages: TemplatePage[] = [];
  if (typeof window !== "undefined") {
    try {
      const storedTemplates = localStorage.getItem(EDITOR_TEMPLATES_KEY);
      if (storedTemplates) {
        initialTemplatePages = JSON.parse(storedTemplates);
      }
    } catch (error) {
      console.error("Error loading templates from localStorage:", error);
      initialTemplatePages = []; // Fallback to empty array on error
    }
  }

  return {
    // وضعیت‌های اصلی
    currentEditor: null,
    isLoaded: false,
    iframeDoc: null,
    iframeWin: null,

    // وضعیت‌های انتخاب و هاور
    selectedElements: [],
    hoveredElement: null,

    // وضعیت ویرایش درون‌خطی
    isEditingInline: false,
    activeInlineEditElement: null,

    // وضعیت تاریخچه
    history: [],
    historyIndex: -1,
    isUndoRedoOperation: false,

    // وضعیت هوش مصنوعی
    isAiEditing: false,
    aiTargetElement: null,
    aiEditScope: "element",
    setAiEditScope: (scope) => set({ aiEditScope: scope }),

    // وضعیت‌های دیگر
    originalStylesFromTemplate: "",
    headContentForOutputFromTemplate: "",

    // وضعیت قالب‌ها
    templatePages: initialTemplatePages,

    // اضافه کردن متغیر mutationObserver به state
    mutationObserver: null,

  // اکشن‌ها
  setCurrentEditor: (editor) => set({ currentEditor: editor }),
  setIsLoaded: (isLoaded) => set({ isLoaded }),
  setIframeDoc: (doc) => set({ iframeDoc: doc }),
  setIframeWin: (win) => {
    set({ iframeWin: win })
    get().setupKeyboardShortcuts()
  },

  selectElement: (elementId) => {
    const { iframeDoc } = get()
    if (!iframeDoc) return

    // حذف کلاس انتخاب از همه عناصر
    const selectedEls = iframeDoc.querySelectorAll(".editor-highlight-selected")
    selectedEls.forEach((el) => el.classList.remove("editor-highlight-selected"))

    // اضافه کردن کلاس انتخاب به عنصر جدید
    const element = iframeDoc.querySelector(`[data-editor-id="${elementId}"]`)
    if (element) {
      element.classList.add("editor-highlight-selected")
      set({ selectedElements: [elementId] })
    }
  },

  clearSelection: () => {
    const { iframeDoc } = get()
    if (!iframeDoc) return

    // حذف کلاس انتخاب از همه عناصر
    const selectedEls = iframeDoc.querySelectorAll(".editor-highlight-selected")
    selectedEls.forEach((el) => el.classList.remove("editor-highlight-selected"))

    set({ selectedElements: [] })
  },

  hoverElement: (elementId) => {
    const { iframeDoc } = get()
    if (!iframeDoc) return

    // حذف کلاس هاور از همه عناصر
    const hoveredEls = iframeDoc.querySelectorAll(".editor-highlight-hover")
    hoveredEls.forEach((el) => el.classList.remove("editor-highlight-hover"))

    // اضافه کردن کلاس هاور به عنصر جدید
    const element = iframeDoc.querySelector(`[data-editor-id="${elementId}"]`)
    if (element) {
      element.classList.add("editor-highlight-hover")
      set({ hoveredElement: elementId })
    }
  },

  clearHover: () => {
    const { iframeDoc } = get()
    if (!iframeDoc) return

    // حذف کلاس هاور از همه عناصر
    const hoveredEls = iframeDoc.querySelectorAll(".editor-highlight-hover")
    hoveredEls.forEach((el) => el.classList.remove("editor-highlight-hover"))

    set({ hoveredElement: null })
  },

  updateElementAttribute: (elementId, attribute, value) => {
    const { iframeDoc } = get()
    if (!iframeDoc) return

    const element = iframeDoc.querySelector(`[data-editor-id="${elementId}"]`)
    if (!element) return

    if (value) {
      element.setAttribute(attribute, value)
    } else {
      element.removeAttribute(attribute)
    }

    get().addHistorySnapshot()
  },

  removeElement: (elementId) => {
    const { iframeDoc } = get()
    if (!iframeDoc) return

    const element = iframeDoc.querySelector(`[data-editor-id="${elementId}"]`)
    if (!element) return

    element.remove()
    set({ selectedElements: [] })

    get().addHistorySnapshot()
  },

  moveElement: (elementId, direction) => {
    const { iframeDoc } = get()
    if (!iframeDoc) return

    const element = iframeDoc.querySelector(`[data-editor-id="${elementId}"]`)
    if (!element || !element.parentNode) return

    if (direction === "up") {
      const prevSibling = element.previousElementSibling
      if (prevSibling) {
        element.parentNode.insertBefore(element, prevSibling)
      }
    } else {
      const nextSibling = element.nextElementSibling
      if (nextSibling && nextSibling.nextElementSibling) {
        element.parentNode.insertBefore(element, nextSibling.nextElementSibling)
      } else if (nextSibling) {
        element.parentNode.appendChild(element)
      }
    }

    get().addHistorySnapshot()
  },

  startInlineEditing: (elementId) => {
    const { iframeDoc } = get()
    if (!iframeDoc) return

    const element = iframeDoc.querySelector(`[data-editor-id="${elementId}"]`) as HTMLElement
    if (!element) return

    // تنظیم contenteditable
    element.contentEditable = "true"
    element.focus()

    set({
      isEditingInline: true,
      activeInlineEditElement: elementId,
    })
  },

  finishInlineEditing: () => {
    const { iframeDoc, activeInlineEditElement } = get()
    if (!iframeDoc || !activeInlineEditElement) return

    const element = iframeDoc.querySelector(`[data-editor-id="${activeInlineEditElement}"]`) as HTMLElement
    if (!element) return

    // حذف contenteditable
    element.contentEditable = "false"

    set({
      isEditingInline: false,
      activeInlineEditElement: null,
    })

    get().addHistorySnapshot()
  },

  executeCommand: (command, value) => {
    const { iframeDoc, selectedElements, isEditingInline } = get()
    if (!iframeDoc) return

    console.log(`Executing command: ${command}`, value ? `with value: ${value}` : "")

    // اگر در حالت ویرایش درون‌خطی هستیم، از execCommand استفاده می‌کنیم
    if (isEditingInline) {
      try {
        iframeDoc.execCommand(command, false, value)
      } catch (error) {
        console.error(`Error executing command ${command}:`, error)
      }
      get().addHistorySnapshot()
      return
    }

    // اگر عنصری انتخاب شده است، قالب‌بندی را مستقیماً روی آن اعمال می‌کنیم
    if (selectedElements.length > 0) {
      const element = iframeDoc.querySelector(`[data-editor-id="${selectedElements[0]}"]`) as HTMLElement
      if (!element) return

      // اعمال قالب‌بندی با استفاده از CSS به جای execCommand
      // Helper function for morphdom updates to preserve input focus/values
      const morphdomOptions = {
      onBeforeElUpdated: function(fromEl: Element, toEl: Element) {
      if ((fromEl.tagName === 'INPUT' || fromEl.tagName === 'TEXTAREA') && fromEl === iframeDoc.activeElement) {
      const fromInputElement = fromEl as HTMLInputElement | HTMLTextAreaElement;
      const toInputElement = toEl as HTMLInputElement | HTMLTextAreaElement;
      if (fromInputElement.value !== toInputElement.value) {
      toInputElement.value = fromInputElement.value;
      }
      }
      // Preserve data-editor-id explicitly if it's not automatically handled by morphdom in all cases
      // Although morphdom typically preserves attributes not present on the `toEl` if they exist on `fromEl`.
      // However, here `toEl` is a clone, so it should have it.
      return true;
      }
      };
      
      let modified = false; // Flag to track if a non-structural DOM change occurred that needs morphdom
      
      // Clone the element for modification if we plan to use morphdom
      // For structural changes (formatBlock, lists, insertHTML), we might use direct DOM ops or specialized functions
      let clonedElement = element.cloneNode(true) as HTMLElement;
      
      switch (command) {
      case "bold":
      clonedElement.style.fontWeight = clonedElement.style.fontWeight === "bold" ? "normal" : "bold";
      modified = true;
      break;
      case "italic":
      clonedElement.style.fontStyle = clonedElement.style.fontStyle === "italic" ? "normal" : "italic";
      modified = true;
      break;
      case "underline":
      if (clonedElement.style.textDecoration.includes("underline")) {
      clonedElement.style.textDecoration = clonedElement.style.textDecoration.replace("underline", "").trim();
      } else {
      const currentDecoration = clonedElement.style.textDecoration || "";
      clonedElement.style.textDecoration = (currentDecoration + " underline").trim();
      }
      if (clonedElement.style.textDecoration === "") clonedElement.style.removeProperty("text-decoration");
      modified = true;
      break;
      case "strikeThrough":
      if (clonedElement.style.textDecoration.includes("line-through")) {
      clonedElement.style.textDecoration = clonedElement.style.textDecoration.replace("line-through", "").trim();
      } else {
      const currentDecoration = clonedElement.style.textDecoration || "";
      clonedElement.style.textDecoration = (currentDecoration + " line-through").trim();
      }
      if (clonedElement.style.textDecoration === "") clonedElement.style.removeProperty("text-decoration");
      modified = true;
      break;
      case "superscript":
      if (clonedElement.style.verticalAlign === "super") {
      clonedElement.style.verticalAlign = "";
      clonedElement.style.fontSize = "";
      } else {
      clonedElement.style.verticalAlign = "super";
      clonedElement.style.fontSize = "smaller";
      }
      if (clonedElement.style.verticalAlign === "") clonedElement.style.removeProperty("vertical-align");
      if (clonedElement.style.fontSize === "") clonedElement.style.removeProperty("font-size");
      modified = true;
      break;
      case "subscript":
      if (clonedElement.style.verticalAlign === "sub") {
      clonedElement.style.verticalAlign = "";
      clonedElement.style.fontSize = "";
      } else {
      clonedElement.style.verticalAlign = "sub";
      clonedElement.style.fontSize = "smaller";
      }
      if (clonedElement.style.verticalAlign === "") clonedElement.style.removeProperty("vertical-align");
      if (clonedElement.style.fontSize === "") clonedElement.style.removeProperty("font-size");
      modified = true;
      break;
      case "justifyLeft":
      clonedElement.style.textAlign = "left";
      modified = true;
      break;
      case "justifyCenter":
      clonedElement.style.textAlign = "center";
      modified = true;
      break;
      case "justifyRight":
      clonedElement.style.textAlign = "right";
      modified = true;
      break;
      case "fontSize":
      if (value) {
      clonedElement.style.fontSize = `${value}px`;
      } else {
      clonedElement.style.removeProperty("font-size");
      }
      modified = true;
      break;
      case "fontName":
      if (value) {
      clonedElement.style.fontFamily = value;
      } else {
      clonedElement.style.removeProperty("font-family");
      }
      modified = true;
      break;
      case "foreColor":
      if (value) {
      clonedElement.style.color = value;
      } else {
      clonedElement.style.removeProperty("color");
      }
      modified = true;
      break;
      case "hiliteColor":
      if (value) {
      clonedElement.style.backgroundColor = value;
      } else {
      clonedElement.style.removeProperty("background-color");
      }
      modified = true;
      break;
      case "formatBlock":
      // Structural change: Handled directly, not with morphdom on the element itself here.
      // The existing logic for replaceChild is kept.
      modified = false; // Set to false as morphdom isn't used for this element directly.
      const newTagName = value?.replace(/[<>]/g, "") || "p";
      const newElement = iframeDoc.createElement(newTagName);
      newElement.innerHTML = element.innerHTML; // Use original element's innerHTML
      Array.from(element.attributes).forEach((attr) => { // Use original element's attributes
      newElement.setAttribute(attr.name, attr.value);
      });
      newElement.style.cssText = element.style.cssText; // Use original element's cssText
      element.parentNode?.replaceChild(newElement, element);
      // After replacement, 'element' variable refers to the old, detached node.
      // Future operations in this command execution might need to re-query if they target 'element'.
      // However, formatBlock is usually a terminal styling operation for the selected block.
      break;
      case "insertUnorderedList":
      modified = false; // Structural change
      createList(element, iframeDoc, "ul");
      break;
      case "insertOrderedList":
      modified = false; // Structural change
      createList(element, iframeDoc, "ol");
      break;
      case "insertHTML":
      modified = false; // Modifies innerHTML directly
      if (value) {
      const tempDiv = iframeDoc.createElement("div");
      tempDiv.innerHTML = value;
      const newElements = tempDiv.querySelectorAll("*");
      newElements.forEach((el, index) => {
      const uniqueId = `element-${Date.now()}-${index}`;
      el.setAttribute("data-editor-id", uniqueId);
      });
      element.innerHTML += tempDiv.innerHTML;
      }
      break;
      default:
      modified = false; // This command will use execCommand or other direct DOM manipulation
      try {
      const selection = iframeDoc.getSelection();
      // If there's an active, non-collapsed text selection, execCommand should act on it.
      // We assume this selection is within the 'element' context.
      if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      // Check if the current selection is actually within the target element.
      // This is a safeguard, though ideally selection management ensures this.
      if (element.contains(selection.anchorNode) && element.contains(selection.focusNode)) {
      iframeDoc.execCommand(command, false, value);
      } else {
      // Selection is outside the targeted element, fallback to whole element.
      // This case should ideally not happen if selection logic is correct.
      const range = iframeDoc.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
      iframeDoc.execCommand(command, false, value);
      console.warn(`Command "${command}" applied to whole element as selection was outside.`);
      }
      } else {
      // If selection is collapsed or no selection, select the whole element for the command.
      // This is for commands that should apply to the block or need a default target.
      const range = iframeDoc.createRange();
      range.selectNodeContents(element);
      if (selection) { // selection object should always exist from iframeDoc.getSelection()
      selection.removeAllRanges();
      selection.addRange(range);
      }
      // If for some reason selection was null (highly unlikely for iframeDoc.getSelection()),
      // execCommand would likely fail or act on document, so this path is safer.
      iframeDoc.execCommand(command, false, value);
      }
      } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      }
      break;
      }
      
      if (modified) {
      // 'element' is the original DOM node, 'clonedElement' is the modified detached node.
      // morphdom will update 'element' to match 'clonedElement'.
      morphdom(element, clonedElement, morphdomOptions);
      }
      
      get().addHistorySnapshot();
      }
      },

  addNewPage: () => {
    const { iframeDoc, currentEditor } = get()
    if (!iframeDoc || !currentEditor) return

    const body = iframeDoc.body
    const pageTemplate = currentEditor.newPageTemplate

    // ایجاد عنصر موقت برای تبدیل رشته HTML به DOM
    const tempDiv = iframeDoc.createElement("div")
    tempDiv.innerHTML = pageTemplate

    // اضافه کردن صفحه جدید به انتهای بدنه
    const newPage = tempDiv.firstElementChild
    if (!newPage) return

    body.appendChild(newPage)

    // خالی کردن محتوای بخش‌های مشخص شده
    if (currentEditor.contentRemovalSelectorsForNewPage) {
      currentEditor.contentRemovalSelectorsForNewPage.forEach((selector) => {
        const elements = newPage.querySelectorAll(selector)
        elements.forEach((el) => {
          el.innerHTML = ""
        })
      })
    }

    // اعمال شماره‌گذاری صفحات
    get().renumberPages()

    get().addHistorySnapshot()
  },

  renumberPages: () => {
    const { iframeDoc, currentEditor } = get()
    if (!iframeDoc || !currentEditor || !currentEditor.pageNumberElementSelector) return

    const pages = iframeDoc.querySelectorAll(currentEditor.pageStructureSelector)

    pages.forEach((page, index) => {
      const pageNumber = index + 1
      const pageNumberElement = page.querySelector(currentEditor.pageNumberElementSelector!)

      if (pageNumberElement) {
        const pattern = currentEditor.pageNumberPattern || { prefix: "صفحه ", suffix: "", numberSystem: "western" }

        let numberText = pageNumber.toString()
        if (pattern.numberSystem === "persian") {
          numberText = toPersianNumber(pageNumber)
        }

        pageNumberElement.textContent = `${pattern.prefix}${numberText}${pattern.suffix}`
      }
    })

    get().addHistorySnapshot()
  },

  moveElementToPage: (direction) => {
    const { iframeDoc, currentEditor, selectedElements } = get()
    if (!iframeDoc || !currentEditor || selectedElements.length === 0) return

    const elementId = selectedElements[0]
    const element = iframeDoc.querySelector(`[data-editor-id="${elementId}"]`)
    if (!element) return

    // پیدا کردن صفحه فعلی
    const currentPage = element.closest(currentEditor.pageStructureSelector)
    if (!currentPage) return

    let targetPage

    if (direction === "prev") {
      targetPage = currentPage.previousElementSibling
    } else {
      targetPage = currentPage.nextElementSibling
    }

    // اگر صفحه هدف وجود نداشت و جهت "next" بود، صفحه جدید ایجاد می‌کنیم
    if (!targetPage && direction === "next") {
      get().addNewPage()
      targetPage = iframeDoc.querySelector(currentEditor.pageStructureSelector + ":last-child")
    }

    if (!targetPage) return

    // انتقال عنصر به صفحه هدف
    targetPage.appendChild(element)

    get().addHistorySnapshot()
  },

  copyElementToPage: (direction) => {
    const { iframeDoc, currentEditor, selectedElements } = get()
    if (!iframeDoc || !currentEditor || selectedElements.length === 0) return

    const elementId = selectedElements[0]
    const element = iframeDoc.querySelector(`[data-editor-id="${elementId}"]`)
    if (!element) return

    // پیدا کردن صفحه فعلی
    const currentPage = element.closest(currentEditor.pageStructureSelector)
    if (!currentPage) return

    let targetPage

    if (direction === "prev") {
      targetPage = currentPage.previousElementSibling
    } else {
      targetPage = currentPage.nextElementSibling
    }

    // اگر صفحه هدف وجود نداشت و جهت "next" بود، صفحه جدید ایجاد می‌کنیم
    if (!targetPage && direction === "next") {
      get().addNewPage()
      targetPage = iframeDoc.querySelector(currentEditor.pageStructureSelector + ":last-child")
    }

    if (!targetPage) return

    // کپی عنصر به صفحه هدف
    const clonedElement = element.cloneNode(true) as Element

    // ایجاد شناسه جدید برای المان کپی شده
    const newId = `element-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    clonedElement.setAttribute("data-editor-id", newId)

    // اضافه کردن المان کپی شده به صفحه هدف
    targetPage.appendChild(clonedElement)

    get().addHistorySnapshot()
  },

  // اکشن‌های مربوط به قالب‌ها
  markPageAsTemplate: (pageIndex, name, editableElements, pageSelector) => {
    const { iframeDoc, currentEditor, templatePages } = get()
    if (!iframeDoc || !currentEditor) return

    // Use the provided pageSelector to get the specific page element for the template
    const templatePageElement = iframeDoc.querySelector(pageSelector);

    let elementForHTML: Element | null = null;

    if (templatePageElement) {
      elementForHTML = templatePageElement;
    } else {
      console.warn("Page element not found for template using pageSelector:", pageSelector, "Falling back to pageIndex.");
      // Fallback: Try to find the page element by index using currentEditor.pageStructureSelector
      if (currentEditor.pageStructureSelector) {
        const pages = iframeDoc.querySelectorAll(currentEditor.pageStructureSelector);
        if (pageIndex >= 0 && pageIndex < pages.length) {
          elementForHTML = pages[pageIndex];
        } else {
          console.error("Fallback pageIndex is out of bounds.");
          return;
        }
      } else {
        console.error("pageStructureSelector is not defined in currentEditor, cannot fallback for HTML.");
        return;
      }
    }
    
    if (!elementForHTML) {
        console.error("Could not determine page element for template HTML after attempting selector and fallback.");
        return;
    }

    // ایجاد یک شناسه منحصر به فرد برای قالب
    const templateId = `template-${Date.now()}`

    // ذخیره HTML صفحه
    const pageHtml = elementForHTML.outerHTML

    // ایجاد قالب جدید
    const newTemplate: TemplatePage = {
      id: templateId,
      name,
      pageIndex,
      html: pageHtml,
      editableElements,
      pageSelector, // Storing the pageSelector
    }

    // اضافه کردن قالب به لیست قالب‌ها
    set((state) => {
      const updatedTemplatePages = [...state.templatePages, newTemplate];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(EDITOR_TEMPLATES_KEY, JSON.stringify(updatedTemplatePages));
        } catch (error) {
          console.error("Error saving templates to localStorage:", error);
        }
      }
      return { templatePages: updatedTemplatePages };
    });
  },

  createPageFromTemplate: (templateId, elementContents = {}) => {
    const { iframeDoc, templatePages } = get()
    if (!iframeDoc) return

    // پیدا کردن قالب مورد نظر
    const template = templatePages.find((t) => t.id === templateId)
    if (!template) return

    // ایجاد عنصر موقت برای تبدیل رشته HTML به DOM
    const tempDiv = iframeDoc.createElement("div")
    tempDiv.innerHTML = template.html

    // اضافه کردن صفحه جدید به انتهای بدنه
    const newPage = tempDiv.firstElementChild
    if (!newPage) return

    // Ensure the new page (root element) itself gets a data-editor-id if it doesn't have one
    // This is crucial for the page itself to be selectable.
    // We assign it before processing children to ensure it's part of the idMap if it had an original ID.
    let newPageId = newPage.getAttribute("data-editor-id");
    if (!newPageId) {
      newPageId = `page-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      newPage.setAttribute("data-editor-id", newPageId);
    } else {
      // If it already had an ID (from template), remap it like other elements.
      const remappedPageId = `page-remap-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      // We don't need to put this in idMap unless children refer to parent's original ID, which is unlikely.
      newPage.setAttribute("data-editor-id", remappedPageId);
      newPageId = remappedPageId; // Use the new remapped ID
    }


    // اضافه کردن data-editor-id جدید به عناصر فرزند
    const allElements = newPage.querySelectorAll("*")
    const idMap = new Map<string, string>() // نگاشت شناسه‌های قدیم به جدید

    allElements.forEach((el, index) => {
      const currentId = el.getAttribute("data-editor-id")
      if (currentId && currentId !== newPageId) { // Avoid re-processing the pageId we just set/remapped
        const newId = `element-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`
        idMap.set(currentId, newId)
        el.setAttribute("data-editor-id", newId)
      } else if (!currentId) { // Element didn't have an ID from template
        el.setAttribute("data-editor-id", `element-new-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`)
      }
    })

    // اعمال محتوای جدید به عناصر قابل ویرایش
    template.editableElements.forEach((elementId) => {
      if (elementContents[elementId]) {
        // پیدا کردن عنصر متناظر در صفحه جدید با استفاده از نگاشت شناسه‌ها
        const newElementId = idMap.get(elementId)
        if (newElementId) {
          const element = newPage.querySelector(`[data-editor-id="${newElementId}"]`)
          if (element) {
            element.innerHTML = elementContents[elementId]
            element.classList.add("template-editable-element")
            element.setAttribute("data-template-editable", "true")
          }
        }
      }
    })

    iframeDoc.body.appendChild(newPage)

    // اعمال شماره‌گذاری صفحات
    get().renumberPages()

    get().addHistorySnapshot()
  },

  addHistorySnapshot: () => {
    set((state) => {
      const { iframeDoc, history, historyIndex, isUndoRedoOperation, isAiEditing, currentEditor, generateOutput } = state;
      if (!iframeDoc || isUndoRedoOperation || isAiEditing) return state;

      const newHistory = history.slice(0, historyIndex + 1) as HTMLElement[];
      const currentBodyClone = iframeDoc.body.cloneNode(true) as HTMLElement;

      if (newHistory.length > 0 && newHistory[newHistory.length - 1].outerHTML === currentBodyClone.outerHTML) {
        return state; // Do not add duplicate states
      }

      newHistory.push(currentBodyClone);
      const newHistoryIndex = newHistory.length - 1;

      // Save editor content to localStorage
      if (currentEditor && iframeDoc) {
        const content = generateOutput();
        localStorage.setItem(`editor-content-${currentEditor.id}`, content);
      }

      return {
        ...state,
        history: newHistory,
        historyIndex: newHistoryIndex,
        canUndo: newHistoryIndex > 0,
        canRedo: false,
      };
    });
  },

  // اضافه کردن تابع setMutationObserver به اکشن‌ها
  setMutationObserver: (observer: MutationObserver) => set({ mutationObserver: observer }),

  // اصلاح تابع undo
  undo: () => {
    set((state) => {
      const { iframeDoc, history, historyIndex, mutationObserver, selectedElements } = state;
      if (!iframeDoc || historyIndex <= 0) return state;

      if (mutationObserver) {
        mutationObserver.disconnect();
      }

      const newIndex = historyIndex - 1;
      const previousStateNode = history[newIndex].cloneNode(true) as HTMLElement;

      const scrollPosition = {
        x: iframeDoc.defaultView?.pageXOffset || 0,
        y: iframeDoc.defaultView?.pageYOffset || 0,
      };

      // Note: Selection restoration with morphdom can be complex.
      // The current approach might not perfectly restore selection across all scenarios.
      // For now, we rely on setupEventListeners and potential re-selection logic if needed.
      // const selection = iframeDoc.getSelection();
      // let rangeToRestore = null;
      // if (selection && selection.rangeCount > 0) {
      //   rangeToRestore = selection.getRangeAt(0).cloneRange();
      // }

      morphdom(iframeDoc.body, previousStateNode, {
        onBeforeElUpdated: function(fromEl: Element, toEl: Element) {
          if ((fromEl.tagName === 'INPUT' || fromEl.tagName === 'TEXTAREA') && fromEl === iframeDoc.activeElement) {
            const fromInputElement = fromEl as HTMLInputElement | HTMLTextAreaElement;
            const toInputElement = toEl as HTMLInputElement | HTMLTextAreaElement;
            if (fromInputElement.value !== toInputElement.value) {
              toInputElement.value = fromInputElement.value;
            }
          }
          return true;
        }
      });

      iframeDoc.defaultView?.scrollTo(scrollPosition.x, scrollPosition.y);
      setupEventListeners(iframeDoc);

      // if (rangeToRestore && iframeDoc.getSelection()) {
      //   const currentSelection = iframeDoc.getSelection();
      //   currentSelection?.removeAllRanges();
      //   try {
      //     currentSelection?.addRange(rangeToRestore);
      //   } catch (e) {
      //     console.warn("Could not restore selection range after undo:", e);
      //   }
      // }


      if (mutationObserver) {
        mutationObserver.observe(iframeDoc.body, {
          childList: true,
          subtree: true,
          attributes: true, // Consider observing attributes if necessary
          characterData: true, // Consider observing character data if necessary
        });
      }

      const newState = {
        ...state,
        historyIndex: newIndex,
        selectedElements: [], // Maintaining current behavior of clearing selection
        canUndo: newIndex > 0,
        canRedo: true,
      };

      // After morphdom and state update, explicitly update localStorage
      // to reflect the new current (undone) state.
      // This does not add to the history stack for navigation,
      // but ensures localStorage is in sync with the visual state.
      const { currentEditor: updatedEditor, iframeDoc: updatedIframeDoc, generateOutput: storeGenerateOutput } = { ...state, ...newState, iframeDoc: state.iframeDoc };
      if (updatedEditor && updatedIframeDoc) {
        const currentContent = storeGenerateOutput();
        localStorage.setItem(`editor-content-${updatedEditor.id}`, currentContent);
      }
      
      return newState;
    });
    // The isUndoRedoOperation flag's main purpose in addHistorySnapshot is to prevent snapshots
    // during an ongoing undo/redo. Disconnecting the MutationObserver achieves this for
    // observer-triggered snapshots. If other synchronous events could trigger addHistorySnapshot
    // during undo/redo, a more robust flag mechanism covering the DOM manipulation phase would be needed.
  },

  // اصلاح تابع redo
  redo: () => {
    set((state) => {
      const { iframeDoc, history, historyIndex, mutationObserver, selectedElements } = state;
      if (!iframeDoc || historyIndex >= history.length - 1) return state;

      if (mutationObserver) {
        mutationObserver.disconnect();
      }

      const newIndex = historyIndex + 1;
      const nextStateNode = history[newIndex].cloneNode(true) as HTMLElement;

      const scrollPosition = {
        x: iframeDoc.defaultView?.pageXOffset || 0,
        y: iframeDoc.defaultView?.pageYOffset || 0,
      };

      morphdom(iframeDoc.body, nextStateNode, {
        onBeforeElUpdated: function(fromEl: Element, toEl: Element) {
          if ((fromEl.tagName === 'INPUT' || fromEl.tagName === 'TEXTAREA') && fromEl === iframeDoc.activeElement) {
            const fromInputElement = fromEl as HTMLInputElement | HTMLTextAreaElement;
            const toInputElement = toEl as HTMLInputElement | HTMLTextAreaElement;
            if (fromInputElement.value !== toInputElement.value) {
              toInputElement.value = fromInputElement.value;
            }
          }
          return true;
        }
      });

      iframeDoc.defaultView?.scrollTo(scrollPosition.x, scrollPosition.y);
      setupEventListeners(iframeDoc);

      if (mutationObserver) {
        mutationObserver.observe(iframeDoc.body, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
      }

      const newState = {
        ...state,
        historyIndex: newIndex,
        selectedElements: [], // Maintaining current behavior
        canUndo: true,
        canRedo: newIndex < history.length - 1,
      };

      // After morphdom and state update, explicitly update localStorage
      const { currentEditor: updatedEditor, iframeDoc: updatedIframeDoc, generateOutput: storeGenerateOutput } = { ...state, ...newState, iframeDoc: state.iframeDoc };
      if (updatedEditor && updatedIframeDoc) {
        const currentContent = storeGenerateOutput();
        localStorage.setItem(`editor-content-${updatedEditor.id}`, currentContent);
      }

      return newState;
    });
  },

  startAiEditing: () => {
    const { selectedElements } = get()

    set({
      isAiEditing: true,
      aiTargetElement: selectedElements.length > 0 ? selectedElements[0] : null,
    })
  },

  applyAiChanges: (htmlContent) => {
    const { iframeDoc, aiTargetElement, aiEditScope } = get()
    if (!iframeDoc) return

    // ذخیره تاریخچه قبل از اعمال تغییرات
    get().addHistorySnapshot()

    if (aiEditScope === "element" && aiTargetElement) {
      const element = iframeDoc.querySelector(`[data-editor-id="${aiTargetElement}"]`)
      if (element) {
        // ایجاد عنصر موقت برای تبدیل رشته HTML به DOM
        const tempDiv = iframeDoc.createElement("div")
        tempDiv.innerHTML = htmlContent

        // جایگزینی عنصر
        if (tempDiv.firstElementChild) {
          element.replaceWith(tempDiv.firstElementChild)
        }
      }
    } else {
      // جایگزینی کل محتوای بدنه
      iframeDoc.body.innerHTML = htmlContent

      // راه‌اندازی مجدد event listener ها
      setupEventListeners(iframeDoc)
    }

    set({
      isAiEditing: false,
      aiTargetElement: null,
      selectedElements: [],
    })
  },

  cancelAiEditing: () => {
    set({
      isAiEditing: false,
      aiTargetElement: null,
    })
  },

  generateOutput: () => {
    const { iframeDoc } = get()
    if (!iframeDoc) return ""

    // ایجاد یک کپی از DOM برای پاکسازی
    const clone = iframeDoc.documentElement.cloneNode(true) as HTMLElement

    // حذف تمام کلاس‌های مخصوص ویرایشگر
    const allElements = clone.querySelectorAll("*")
    allElements.forEach((el) => {
      el.classList.remove("editor-highlight-hover", "editor-highlight-selected", "template-editable-element")
      el.removeAttribute("contenteditable")
      el.removeAttribute("draggable")
      el.removeAttribute("data-editor-id")
      el.removeAttribute("data-template-editable")

      // حذف صفات خالی
      if (el.getAttribute("style") === "") el.removeAttribute("style")
      if (el.getAttribute("class") === "") el.removeAttribute("class")
    })

    // تولید خروجی HTML
    return "<!DOCTYPE html>\n" + clone.outerHTML
  },

  // محاسبه‌های مشتق شده
  get canUndo() {
    return get().historyIndex > 0
  },

  get canRedo() {
    return get().historyIndex < get().history.length - 1
  },

  setupKeyboardShortcuts: () => {
    const { iframeWin } = get()
    if (!iframeWin) return

    iframeWin.document.addEventListener("keydown", (e) => {
      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault()
        get().undo()
      }

      // Ctrl+Y for redo
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault()
        get().redo()
      }
    })
  },

  // Add this implementation to the store
  updateElementContent: (elementId, content) => {
    const { iframeDoc } = get()
    if (!iframeDoc) return

    const element = iframeDoc.querySelector(`[data-editor-id="${elementId}"]`)
    if (!element) return

    // Update the element's content
    element.innerHTML = content

    get().addHistorySnapshot()
  },
}});

// تابع کمکی برای تبدیل اعداد به فارسی
function toPersianNumber(num: number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
  return num.toString().replace(/\d/g, (digit) => persianDigits[Number.parseInt(digit)])
}

// تابع کمکی برای ایجاد لیست
function createList(element: HTMLElement, doc: Document, listType: "ul" | "ol") {
  // بررسی اینکه آیا عنصر قبلاً یک لیست است
  if (element.tagName.toLowerCase() === listType) {
    // اگر عنصر قبلاً یک لیست است، آن را به پاراگراف تبدیل می‌کنیم
    const items = element.querySelectorAll("li")
    const parent = element.parentNode

    if (parent) {
      items.forEach((item) => {
        const p = doc.createElement("p")
        p.innerHTML = item.innerHTML
        p.setAttribute("data-editor-id", `element-${Date.now()}-${Math.floor(Math.random() * 1000)}`)
        parent.insertBefore(p, element)
      })

      parent.removeChild(element)
    }
  } else if (element.tagName.toLowerCase() === "ol" || element.tagName.toLowerCase() === "ul") {
    // تبدیل نوع لیست
    const newList = doc.createElement(listType)
    newList.innerHTML = element.innerHTML
    newList.setAttribute("data-editor-id", element.getAttribute("data-editor-id") || `element-${Date.now()}`)
    element.parentNode?.replaceChild(newList, element)
  } else {
    // ایجاد یک لیست جدید
    const list = doc.createElement(listType)
    list.setAttribute("data-editor-id", `element-${Date.now()}`)

    // تبدیل محتوای عنصر به آیتم‌های لیست
    const content = element.innerHTML.trim()

    if (content) {
      // اگر محتوا شامل تگ p یا br است، هر کدام را به یک آیتم لیست تبدیل می‌کنیم
      if (content.includes("<p>") || content.includes("<br>")) {
        const parts = content.split(/<\/?p>|<br\s*\/?>/g).filter((part) => part.trim())
        parts.forEach((part) => {
          const li = doc.createElement("li")
          li.innerHTML = part.trim()
          li.setAttribute("data-editor-id", `element-${Date.now()}-${Math.floor(Math.random() * 1000)}`)
          list.appendChild(li)
        })
      } else {
        // اگر محتوا ساده است، آن را به یک آیتم لیست تبدیل می‌کنیم
        const li = doc.createElement("li")
        li.innerHTML = content
        li.setAttribute("data-editor-id", `element-${Date.now()}-${Math.floor(Math.random() * 1000)}`)
        list.appendChild(li)
      }
    } else {
      // اگر محتوا خالی است, یک آیتم لیست خالی ایجاد می‌کنیم
      const li = doc.createElement("li")
      li.innerHTML = "آیتم جدید"
      li.setAttribute("data-editor-id", `element-${Date.now()}-${Math.floor(Math.random() * 1000)}`)
      list.appendChild(li)
    }

    // جایگزینی عنصر با لیست
    element.parentNode?.replaceChild(list, element)
  }
}

// تابع کمکی برای راه‌اندازی event listener ها
// Handler storage for document events to prevent duplication
let currentClickHandler: ((e: Event) => void) | null = null;
let currentMouseOverHandler: ((e: Event) => void) | null = null;
let currentMouseOutHandler: (() => void) | null = null;
let currentDblClickHandler: ((e: Event) => void) | null = null;

function setupEventListeners(doc: Document) {
  const { selectElement, hoverElement, clearHover, clearSelection, startInlineEditing } = useEditorStore.getState();

  // Remove previous listeners if they exist
  if (currentClickHandler) doc.removeEventListener("click", currentClickHandler as EventListener);
  if (currentMouseOverHandler) doc.removeEventListener("mouseover", currentMouseOverHandler as EventListener);
  if (currentMouseOutHandler) doc.removeEventListener("mouseout", currentMouseOutHandler as EventListener);
  if (currentDblClickHandler) doc.removeEventListener("dblclick", currentDblClickHandler as EventListener);

  // Define new handlers and assign them to the module-scoped variables
  currentClickHandler = (e: Event) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const editorId = target.getAttribute("data-editor-id");
    if (editorId) {
      selectElement(editorId);
    } else {
      clearSelection();
    }
  };

  currentMouseOverHandler = (e: Event) => {
    const target = e.target as HTMLElement;
    const editorId = target.getAttribute("data-editor-id");
    if (editorId) {
      hoverElement(editorId);
    }
  };

  currentMouseOutHandler = () => {
    clearHover();
  };

  currentDblClickHandler = (e: Event) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const editorId = target.getAttribute("data-editor-id");
    if (editorId) {
      startInlineEditing(editorId); // startInlineEditing is now destructured at the top
    }
  };

  // Add new listeners
  doc.addEventListener("click", currentClickHandler as EventListener);
  doc.addEventListener("mouseover", currentMouseOverHandler as EventListener);
  doc.addEventListener("mouseout", currentMouseOutHandler as EventListener);
  doc.addEventListener("dblclick", currentDblClickHandler as EventListener);
}
