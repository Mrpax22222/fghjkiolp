import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// لیست کلاس‌های مخصوص ویرایشگر که باید از سلکتور حذف شوند
const EDITOR_CLASSES = [
  "editor-highlight-hover",
  "editor-highlight-selected",
  "template-calibrate-page",
  "template-calibrate-element",
  "template-selected-element",
  "template-selectable-element",
  "template-editable-element",
]

/**
 * استخراج سلکتور CSS برای یک عنصر
 * @param element عنصر DOM
 * @returns سلکتور CSS
 */
export function deriveSelectorForSingleElement(element: Element | null): string {
  if (!element || !element.tagName) return ""

  const tagName = element.tagName.toLowerCase()
  const doc = element.ownerDocument

  // 1. استفاده از ID اگر وجود داشته باشد و منحصر به فرد باشد
  if (element.id) {
    const id = element.id
    // بررسی اعتبار فرمت ID
    if (/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(id)) {
      try {
        // بررسی منحصر به فرد بودن ID
        if (doc && doc.querySelectorAll(`#${CSS.escape(id)}`).length === 1) {
          return `#${CSS.escape(id)}`
        }
      } catch (e) {
        console.error("خطا در بررسی منحصر به فرد بودن ID:", e)
      }
    }
  }

  // 2. استفاده از تگ + کلاس‌ها (با فیلتر کردن کلاس‌های ویرایشگر)
  const classes = Array.from(element.classList).filter((c) => !EDITOR_CLASSES.includes(c) && c.trim() !== "")

  if (classes.length > 0) {
    const classSelector = `.${classes.map((c) => CSS.escape(c)).join(".")}`
    const fullClassSelector = `${tagName}${classSelector}`
    // مطابق با رفتار اصلی، اگر کلاس‌ها وجود دارند، این سلکتور را برمی‌گردانیم.
    // این تضمین می‌کند که عملکرد برای مواردی که کلاس‌های مناسب وجود دارد، مختل نمی‌شود.
    return fullClassSelector
  }

  // اگر ID یا کلاس‌های مناسب پیدا نشد، سعی در ایجاد سلکتورهای دقیق‌تر می‌کنیم.

  // 3. تلاش برای استفاده از سلکتورهای ویژگی منحصر به فرد
  const attributesToTry: string[] = ['name', 'type', 'role', 'title', 'alt', 'for', 'href', 'src', 'placeholder', 'value'];
  // اضافه کردن ویژگی‌های data-* به صورت پویا
  if (element instanceof HTMLElement && element.dataset) {
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name.startsWith('data-')) {
        attributesToTry.push(attr.name);
      }
    }
  }

  for (const attrName of attributesToTry) {
    const attrValue = element.getAttribute(attrName);
    if (attrValue && attrValue.trim() !== "") {
      const selector = `${tagName}[${attrName}="${CSS.escape(attrValue)}"]`;
      try {
        if (doc && doc.querySelectorAll(selector).length === 1) {
          return selector; // سلکتور مبتنی بر ویژگی منحصر به فرد پیدا شد
        }
      } catch (e) {
        // console.warn(`خطا یا سلکتور نامعتبر برای ویژگی: ${selector}`, e);
      }
    }
  }

  // 4. تلاش برای استفاده از سلکتورهای موقعیتی (:nth-of-type)، با احتمال ترکیب با ID والد
  if (element.parentElement) {
    const parent = element.parentElement;
    let calculatedNthOfTypeIndex = 0;
    let currentChildForNthOfType = parent.firstElementChild;
    let countSoFar = 0;
    while (currentChildForNthOfType) {
      if (currentChildForNthOfType.tagName === tagName) {
        countSoFar++;
      }
      if (currentChildForNthOfType === element) {
        calculatedNthOfTypeIndex = countSoFar;
        break;
      }
      currentChildForNthOfType = currentChildForNthOfType.nextElementSibling;
    }

    if (calculatedNthOfTypeIndex > 0) {
      const childrenOfSameTypeCount = Array.from(parent.children).filter(child => child.tagName === tagName).length;
      const nthOfTypeSelector = `${tagName}:nth-of-type(${calculatedNthOfTypeIndex})`;

      // سناریو الف: ترکیب با ID والد منحصر به فرد
      if (parent.id) {
        const parentIdSelector = `#${CSS.escape(parent.id)}`;
        try {
          if (doc && doc.querySelectorAll(parentIdSelector).length === 1) { // ID والد منحصر به فرد است
            // الف1: ParentID > tag:nth-of-type(idx)
            const combinedNthSelector = `${parentIdSelector} > ${nthOfTypeSelector}`;
            if (doc.querySelectorAll(combinedNthSelector).length === 1) {
              return combinedNthSelector;
            }

            // الف2: اگر تنها فرزند از این نوع باشد، ParentID > tag ممکن است منحصر به فرد باشد
            if (childrenOfSameTypeCount === 1) {
              const combinedTagSelector = `${parentIdSelector} > ${tagName}`;
              if (doc.querySelectorAll(combinedTagSelector).length === 1) {
                return combinedTagSelector;
              }
            }
          }
        } catch (e) { /* نادیده گرفتن خطاها در طول تست سلکتور */ }
      }

      // سناریو ب: استفاده از tag:nth-of-type(idx) اگر معنادار باشد
      // (یعنی برای تمایز از خواهر و برادرهای دیگر) و سلکتورهای دقیق‌تر دیگری پیدا نشده باشند.
      // این از tagName به تنهایی دقیق‌تر است اگر چندین خواهر و برادر از یک نوع وجود داشته باشند.
      if (childrenOfSameTypeCount > 1) {
        return nthOfTypeSelector;
      }
    }
  }

  // 5. استفاده از نام تگ به عنوان آخرین راه حل
  return tagName
}

/**
 * بررسی اعتبار سلکتور CSS
 * @param selector سلکتور CSS
 * @param doc سند DOM
 * @returns آیا سلکتور معتبر است
 */
export function isValidSelector(selector: string, doc: Document | null): boolean {
  if (!doc || !selector) return false

  try {
    doc.querySelector(selector)
    return true
  } catch (e) {
    return false
  }
}
