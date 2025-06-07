"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileCode, Code, FileText } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [htmlContent, setHtmlContent] = useState("")
  const [activeTab, setActiveTab] = useState("direct-input")

  const handleStartEditing = () => {
    // در یک پروژه واقعی، محتوای HTML را به سرور ارسال می‌کنیم
    // و یک شناسه برای آن دریافت می‌کنیم
    const editorId = "new-editor-" + Date.now()

    // ذخیره محتوا در localStorage برای استفاده در صفحه ویرایشگر
    if (htmlContent) {
      localStorage.setItem(`editor-content-${editorId}`, htmlContent)
    }

    router.push(`/editor/${editorId}`)
  }

  const handleStartEmpty = () => {
    const editorId = "new-editor-" + Date.now()
    router.push(`/editor/${editorId}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-5xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">ویرایشگر پیشرفته HTML</h1>
          <p className="text-muted-foreground">کد HTML خود را وارد کنید یا از صفر شروع کنید</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>شروع ویرایش</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="direct-input">
                  <Code className="ml-2 h-4 w-4" />
                  ورود مستقیم کد
                </TabsTrigger>
                <TabsTrigger value="start-empty">
                  <FileText className="ml-2 h-4 w-4" />
                  شروع از صفر
                </TabsTrigger>
              </TabsList>

              <TabsContent value="direct-input" className="space-y-4">
                <Textarea
                  placeholder="کد HTML خود را اینجا وارد کنید..."
                  className="min-h-[300px] font-mono text-sm"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button onClick={handleStartEditing} className="gap-2">
                    <FileCode className="h-4 w-4" />
                    شروع ویرایش
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="start-empty" className="space-y-4">
                <div className="bg-muted/50 rounded-md p-8 flex flex-col items-center justify-center min-h-[300px]">
                  <FileText className="h-16 w-16 text-muted-foreground/70 mb-4" />
                  <h3 className="text-lg font-medium mb-2">شروع از صفر</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    با یک صفحه خالی شروع کنید و عناصر مورد نیاز خود را اضافه کنید.
                  </p>
                  <Button onClick={handleStartEmpty}>شروع ویرایشگر</Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            می‌توانید بعداً صفحات را به عنوان قالب ذخیره کنید و از آن‌ها مجدداً استفاده کنید.
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
