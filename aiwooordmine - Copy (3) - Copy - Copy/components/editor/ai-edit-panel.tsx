"use client"

import { useState, useEffect } from "react"
import { useEditorStore } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wand2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Groq from "groq-sdk";
import { toast } from "sonner"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// تعریف انواع مدل‌های هوش مصنوعی
type AIModel = "openai" | "groq" | "gemini"
type GroqModel = "llama-3.3-70b-versatile" | "qwen-qwq-32b" | "mixtral-8x7b-32768" | "gemma-7b-it"

export function AiEditPanel({ inline = false }: { inline?: boolean }) {
  const { selectedElements, isAiEditing, startAiEditing, applyAiChanges, cancelAiEditing, setAiEditScope: setStoreAiEditScope } = useEditorStore()
  const [apiKey, setApiKey] = useState("")
  const [prompt, setPrompt] = useState("")
  const [editScope, setEditScope] = useState<"element" | "wholeFile">("element")
  const [isLoading, setIsLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<AIModel>("groq")
  const [selectedGroqModel, setSelectedGroqModel] = useState<GroqModel>("qwen-qwq-32b")
  const [showCode, setShowCode] = useState(false)

  useEffect(() => {
    const storedApiKey = localStorage.getItem("aiApiKey")
    if (storedApiKey) {
      setApiKey(storedApiKey)
    }
  }, [])

  const handleApiKeyChange = (newApiKey: string) => {
    setApiKey(newApiKey)
    localStorage.setItem("aiApiKey", newApiKey)
  }

  // تشخیص زبان فارسی
  const isPersian = (text: string) => /[\u0600-\u06FF]/.test(text)

  const handleGenerateChanges = async () => {
    if (!apiKey || !prompt) return

    setIsLoading(true)
    console.log("Starting AI edit with scope:", editScope, "and model:", selectedModel)

    try {
      const { iframeDoc, selectedElements } = useEditorStore.getState()
      if (!iframeDoc) return

      let contextHtml = ""
      let truncatedParentHtml = ""
      let systemPrompt = ""

      if (editScope === "element" && selectedElements.length > 0) {
        const element = iframeDoc.querySelector(`[data-editor-id="${selectedElements[0]}"]`)
        if (!element) return

        contextHtml = element.outerHTML

        // Get parent context for reference, aiming for more complete context
        const MAX_PARENT_CONTEXT_LENGTH = 2500; // Increased budget for more context
        let combinedParentHtml = "";

        const parentEl = element.parentElement;
        if (parentEl) {
          combinedParentHtml = parentEl.outerHTML;

          const grandParentEl = parentEl.parentElement;
          if (grandParentEl) {
            // Try to add grandparent context if the parent context isn't too large already
            // and there's meaningful space remaining.
            if (combinedParentHtml.length < MAX_PARENT_CONTEXT_LENGTH * 0.75) {
              const grandParentHtml = grandParentEl.outerHTML;
              // Calculate remaining space, accounting for the separator and ellipsis
              const separator = "\n\n<!-- Broader Context: Grandparent Element (for reference) -->\n";
              const availableSpaceForGrandparentAndSeparator = MAX_PARENT_CONTEXT_LENGTH - combinedParentHtml.length;

              if (availableSpaceForGrandparentAndSeparator > separator.length + 50) { // Ensure at least 50 chars for grandparent content
                let grandParentContextToAdd = separator + grandParentHtml;
                if (grandParentContextToAdd.length > availableSpaceForGrandparentAndSeparator) {
                  // Truncate grandparent context if it overflows the remaining space
                  const truncationPoint = availableSpaceForGrandparentAndSeparator - 3; // for "..."
                  grandParentContextToAdd = grandParentContextToAdd.substring(0, truncationPoint) + "...";
                }
                combinedParentHtml += grandParentContextToAdd;
              }
            }
          }
        }

        if (combinedParentHtml.length > MAX_PARENT_CONTEXT_LENGTH) {
          truncatedParentHtml = combinedParentHtml.substring(0, MAX_PARENT_CONTEXT_LENGTH - 3) + "...";
        } else if (combinedParentHtml) {
          truncatedParentHtml = combinedParentHtml;
        }
        // If combinedParentHtml is empty (e.g., no parent), truncatedParentHtml remains its initial value ("")

        // Check if the content is in Persian
        const isPersianContent = isPersian(contextHtml) || isPersian(prompt)
        const languageInstruction = isPersianContent
          ? "The user's request is likely in Persian. Respond in Persian if appropriate, but keep the code format the same."
          : "The user's request is in English."

        systemPrompt = `You are an expert HTML editor AI. Your task is to modify a given HTML element based on a user's request.
You MUST ONLY provide the modified HTML code for the *target element* itself.
CRITICAL: Wrap the *entire* modified HTML code block within '@&file' start and end markers like this:
@&file
<!-- Your modified HTML code for the target element goes EXACTLY here -->
@&file
Do NOT include any other text, explanations, or markdown formatting outside these markers.
Do NOT modify the parent element unless absolutely necessary for the requested change and explicitly implied.
Focus ONLY on the user's request for the target element. Preserve existing attributes and structure unless the request requires changing them.
${languageInstruction}

Parent Element Context (for reference only, do not modify directly unless essential):
\`\`\`html
${truncatedParentHtml}
\`\`\`

Original Target Element HTML (The element to modify):
\`\`\`html
${contextHtml}
\`\`\`
-----------------------------------
User's Request: ${prompt}
-----------------------------------
Now, provide the modified HTML for the target element, wrapped ONLY in @&file markers:`
      } else {
        // wholeFile scope
        contextHtml = iframeDoc.documentElement.outerHTML // Get the whole document

        // Check if the content is in Persian
        const isPersianContent = isPersian(contextHtml) || isPersian(prompt)
        const languageInstruction = isPersianContent
          ? "The user's request is likely in Persian. Respond in Persian if appropriate, but keep the code format the same."
          : "The user's request is in English."

        systemPrompt = `You are an expert HTML editor AI. Your task is to rewrite an entire HTML document based on a user's request.
You MUST provide the complete, valid, modified HTML source code for the *entire document* (from <!DOCTYPE html> to </html>).
CRITICAL: Wrap the *entire* modified HTML document source code within '@&file' start and end markers like this:
@&file
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- ... modified head content ... -->
</head>
<body>
    <!-- ... modified body content ... -->
</body>
</html>
@&file
Do NOT include any other text, explanations, or markdown formatting outside these markers.
Ensure the output is a single, complete, and valid HTML document. Preserve essential structure and scripts unless the request requires changing them.
${languageInstruction}

Original HTML Document:
\`\`\`html
${contextHtml}
\`\`\`
-----------------------------------
User's Request: ${prompt}
-----------------------------------
Now, provide the complete modified HTML document, wrapped ONLY in @&file markers:`
      }

      // در یک پروژه واقعی، اینجا با API مدل‌های مختلف ارتباط برقرار می‌کنیم
      let response = ""

      // شبیه‌سازی ارتباط با API Groq
      if (selectedModel === "groq") {
        console.log(`Using Groq API with model: ${selectedGroqModel}`)
        console.log(`API Key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`)
        console.log(`System Prompt: ${systemPrompt.substring(0, 100)}...`)

        // در یک پروژه واقعی، کد زیر استفاده می‌شود:
        const groq = new Groq({ apiKey: apiKey, dangerouslyAllowBrowser: true });
        
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          model: selectedGroqModel,
        });
        
        response = completion.choices[0]?.message?.content || "";

        // شبیه‌سازی پاسخ
      } else if (selectedModel === "gemini") {
        console.log(`Using Gemini API with model: gemini-2.5-pro-exp`);
        // API Key logging is helpful but ensure it's not too verbose in production if sensitive
        console.log(`API Key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`);
        // Corrected model name based on user-provided image.
        const modelName = "gemini-2.5-pro-exp-03-25";

        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          // Using the model name "gemini-2.5-pro-exp" as specifically requested by the user.
          // This could be an experimental, custom, or yet-to-be-released model identifier.
          // If this exact ID is not found, the API will likely return an error, which is handled below.
          const model = genAI.getGenerativeModel({ model: modelName });

          // The systemPrompt contains detailed instructions for the AI, including response formatting.
          // Gemini's `generateContent` API takes a combined prompt in the 'user' role for straightforward tasks.
          const combinedPrompt = `${systemPrompt}\n\nUser Request: ${prompt}`;

          // Basic safety settings to block harmful content. These can be adjusted.
          const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          ];

          // Optional generation configuration. Defaults are often sufficient.
          const generationConfig = {
            // temperature: 0.9, // Example: Controls randomness. Higher is more creative.
            // maxOutputTokens: 8192, // Example: Max length of the generated response.
          };

          const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: combinedPrompt }] }],
            safetySettings,
            generationConfig,
          });

          const geminiApiResponse = result.response;

          // Check for blocks due to safety settings or other reasons in promptFeedback
          if (geminiApiResponse.promptFeedback && geminiApiResponse.promptFeedback.blockReason) {
            const blockReason = geminiApiResponse.promptFeedback.blockReason;
            const blockMessage = geminiApiResponse.promptFeedback.blockReasonMessage || "No specific message provided.";
            console.error(`Gemini API call blocked: ${blockReason}`, blockMessage);
            toast.error(`Gemini API: Request blocked (${blockReason}). ${blockMessage}`);
            response = `<!-- Gemini API request blocked: ${blockReason} -->`;
          } else if (geminiApiResponse.candidates && geminiApiResponse.candidates.length > 0) {
            const candidate = geminiApiResponse.candidates[0];
            // Check if generation stopped for reasons other than normal completion
            if (candidate.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
              console.warn(`Gemini API generation finished with reason: ${candidate.finishReason}`);
              toast.warning(`Gemini generation issue: ${candidate.finishReason}`);
            }

            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0 && candidate.content.parts[0].text) {
              response = candidate.content.parts[0].text;
            } else {
              console.error("Gemini API response: No text content found in the first candidate's part.");
              console.log("Full candidate details:", JSON.stringify(candidate, null, 2));
              response = "<!-- Gemini API: No text content in response part -->";
              toast.error("Gemini API: No text content in response.");
            }
          } else {
            console.error("Gemini API response: No candidates found or unexpected structure.");
            console.log("Full Gemini API response:", JSON.stringify(geminiApiResponse, null, 2));
            response = "<!-- Gemini API: No candidates or unexpected structure -->";
            toast.error("Gemini API: No candidates or unexpected response structure.");
          }
        } catch (e: any) {
          console.error("Error during Gemini API call:", e);
          let userMessage = `Gemini API Error: ${e.message || "Unknown error"}`;
          if (e.message) {
            if (e.message.includes("API key not valid") || e.message.includes("permission_denied")) {
              userMessage = "Gemini API Error: API key not valid or lacks permissions. Please check your key.";
            } else if (e.message.includes("quota") || e.message.includes("billing")) {
              userMessage = "Gemini API Error: Quota exceeded or billing issue. Please check your Google Cloud account.";
            } else if (e.message.toLowerCase().includes("model") && e.message.toLowerCase().includes("not found")) {
              userMessage = `Gemini API Error: Model '${modelName}' not found or not accessible. Please verify the model name.`;
            } else if (e.message.includes("Invalid JSON payload")) {
                userMessage = "Gemini API Error: Invalid request format. The prompt might be too large or malformed.";
            }
          }
          toast.error(userMessage);
          response = `<!-- Error calling Gemini API: ${e.message} -->`;
        }
      } else {
        // Fallback for other unimplemented models (e.g., OpenAI if it's selected)
        // The original TODO comment is preserved.
        // TODO: Implement API calls for other models (OpenAI, etc.)
        console.error("API call for selected model not implemented yet:", selectedModel);
        response = `<!-- API call for ${selectedModel} not implemented -->`;
        // The artificial delay is removed as it's not essential for a non-functional path.
      }

      // Improved AI response parsing
      let extractedContent = "";
      // 1. Try to match the primary @&file markers
      const primaryMatch = response.match(/@&file\s*([\s\S]*?)\s*@&file/);

      if (primaryMatch && primaryMatch[1]) {
        extractedContent = primaryMatch[1].trim();
      } else {
        // 2. If primary markers fail, try to match common Markdown code blocks
        const markdownMatch = response.match(/```(?:html|xml)?\s*([\s\S]*?)\s*```/i);
        if (markdownMatch && markdownMatch[1]) {
          extractedContent = markdownMatch[1].trim();
          console.warn("AI response: Parsed using Markdown code block fallback.");
          toast.warning("پاسخ هوش مصنوعی با استفاده از قالب جایگزین تجزیه شد. لطفاً خروجی را بررسی کنید.");
        } else {
          // 3. If all parsing fails, set to empty and notify
          extractedContent = "";
          console.error("AI response: Failed to parse content. Raw response:", response);
          toast.error("تجزیه پاسخ هوش مصنوعی با شکست مواجه شد. هیچ محتوایی استخراج نشد.");
        }
      }
      setAiResponse(extractedContent);
      startAiEditing()
      if (inline) {
        setIsDialogOpen(true)
      }
    } catch (error) {
      console.error("خطا در ارتباط با API هوش مصنوعی:", error)
      // نمایش پیام خطا به کاربر
      if (error instanceof Error) {
        // بررسی نوع خطا برای پیام‌های خاص‌تر
        if (error.message.includes("API key")) {
          toast.error("کلید API نامعتبر است. لطفاً کلید خود را بررسی کنید.")
        } else if (error.message.includes("rate limit")) {
          toast.error("محدودیت تعداد درخواست‌ها به API رسیده است. لطفاً بعداً تلاش کنید.")
        } else if (error.message.includes("insufficient_quota")) {
          toast.error("اعتبار حساب شما برای استفاده از API کافی نیست.")
        } else {
          toast.error(`خطا در ارتباط با سرور هوش مصنوعی: ${error.message}`)
        }
      } else {
        toast.error("یک خطای ناشناخته در ارتباط با API هوش مصنوعی رخ داد.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // نمایش انتخاب مدل Groq اگر Groq انتخاب شده باشد
  const renderModelSelection = () => {
    if (selectedModel === "groq") {
      return (
        <div className="grid gap-1.5">
          <Label htmlFor="groq-model">مدل Groq</Label>
          <Select value={selectedGroqModel} onValueChange={(value) => setSelectedGroqModel(value as GroqModel)}>
            <SelectTrigger>
              <SelectValue placeholder="انتخاب مدل Groq" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="qwen-qwq-32b">Qwen QWQ 32B</SelectItem>
              <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B</SelectItem>
              <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
              <SelectItem value="gemma-7b-it">Gemma 7B</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    }
    return null
  }

  if (inline) {
    return (
      <>
        <Button
          variant="ghost"
          className="h-8"
          onClick={() => setIsDialogOpen(true)}
          disabled={selectedElements.length === 0 && editScope === "element"}
        >
          <Wand2 className="h-4 w-4 ml-2" />
          ویرایش با هوش مصنوعی
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ویرایش با هوش مصنوعی</DialogTitle>
            </DialogHeader>

            {!isAiEditing ? (
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="ai-model-inline">مدل هوش مصنوعی</Label>
                  <Select value={selectedModel} onValueChange={(value) => setSelectedModel(value as AIModel)}>
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب مدل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="groq">Groq</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="gemini">Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {renderModelSelection()}

                <div className="grid gap-1.5">
                  <Label htmlFor="ai-api-key-inline">کلید API</Label>
                  <Input
                    id="ai-api-key-inline"
                    type="password"
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="کلید API هوش مصنوعی را وارد کنید"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="ai-prompt-inline">دستورالعمل</Label>
                  <Textarea
                    id="ai-prompt-inline"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="توضیح دهید چه تغییراتی می‌خواهید"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-scope-inline">ویرایش کل فایل</Label>
                  <Switch
                    id="edit-scope-inline"
                    checked={editScope === "wholeFile"}
                    onCheckedChange={(checked) => {
                      const newScope = checked ? "wholeFile" : "element"
                      console.log("Switching edit scope to:", newScope)
                      setEditScope(newScope)
                      setStoreAiEditScope(newScope)
                    }}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleGenerateChanges}
                  disabled={
                    isLoading ||
                    !apiKey ||
                    !prompt ||
                    (editScope === "element" && selectedElements.length === 0 && !isAiEditing)
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      در حال تولید...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      تولید پیشنهاد کد
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {showCode ? (
                  <Textarea value={aiResponse} readOnly className="font-mono text-xs h-40 overflow-auto" />
                ) : (
                  <div className="border rounded-md overflow-hidden bg-white h-40">
                    <iframe
                      srcDoc={aiResponse}
                      className="w-full h-full border-0"
                      title="پیش‌نمایش خروجی هوش مصنوعی"
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}
                <div className="flex justify-end mt-1">
                  <Button variant="ghost" size="sm" onClick={() => setShowCode(!showCode)} className="text-xs">
                    {showCode ? "نمایش پیش‌نمایش" : "نمایش کد"}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={cancelAiEditing}>
                    لغو
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      applyAiChanges(aiResponse)
                      setIsDialogOpen(false)
                    }}
                  >
                    اعمال تغییرات
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium">ویرایش با هوش مصنوعی</CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        {!isAiEditing ? (
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ai-model">مدل هوش مصنوعی</Label>
              <Select value={selectedModel} onValueChange={(value) => setSelectedModel(value as AIModel)}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب مدل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="groq">Groq</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {renderModelSelection()}

            <div className="grid gap-1.5">
              <Label htmlFor="ai-api-key">کلید API</Label>
              <Input
                id="ai-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="کلید API هوش مصنوعی را وارد کنید"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ai-prompt">دستورالعمل</Label>
              <Textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="توضیح دهید چه تغییراتی می‌خواهید"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-scope">ویرایش کل فایل</Label>
              <Switch
                id="edit-scope"
                checked={editScope === "wholeFile"}
                onCheckedChange={(checked) => {
                  const newScope = checked ? "wholeFile" : "element"
                  console.log("Switching edit scope to:", newScope)
                  setEditScope(newScope)
                  setStoreAiEditScope(newScope)
                }}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleGenerateChanges}
              disabled={
                isLoading ||
                !apiKey ||
                !prompt ||
                (editScope === "element" && selectedElements.length === 0 && !isAiEditing)
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  در حال تولید...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  تولید پیشنهاد کد
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {showCode ? (
              <Textarea value={aiResponse} readOnly className="font-mono text-xs h-40 overflow-auto" />
            ) : (
              <div className="border rounded-md overflow-hidden bg-white h-40">
                <iframe
                  srcDoc={aiResponse}
                  className="w-full h-full border-0"
                  title="پیش‌نمایش خروجی هوش مصنوعی"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
            <div className="flex justify-end mt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowCode(!showCode)} className="text-xs">
                {showCode ? "نمایش پیش‌نمایش" : "نمایش کد"}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={cancelAiEditing}>
                لغو
              </Button>
              <Button className="flex-1" onClick={() => applyAiChanges(aiResponse)}>
                اعمال تغییرات
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
