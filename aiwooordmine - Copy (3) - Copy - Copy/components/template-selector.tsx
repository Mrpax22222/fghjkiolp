"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"

export function TemplateSelector() {
  const router = useRouter()

  const templates = [
    {
      id: "report-template",
      name: "قالب گزارش نقشه برداری",
      description: "قالب گزارش کار عملیات نقشه برداری با طراحی خاکستری",
      pages: 3,
    },
    {
      id: "article-template",
      name: "قالب مقاله علمی",
      description: "قالب مقاله علمی با بخش‌های مختلف و فرمت استاندارد",
      pages: 5,
    },
    {
      id: "resume-template",
      name: "قالب رزومه",
      description: "قالب رزومه حرفه‌ای با بخش‌های مختلف",
      pages: 2,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card key={template.id} className="overflow-hidden transition-all hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle>{template.name}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </CardHeader>
          <CardContent className="bg-muted/50 dark:bg-muted/20 aspect-[4/3] flex items-center justify-center">
            <FileText className="h-16 w-16 text-muted-foreground/70" />
          </CardContent>
          <CardFooter className="flex justify-between pt-4">
            <div className="text-sm text-muted-foreground">{template.pages} صفحه</div>
            <Button onClick={() => router.push(`/editor/${template.id}`)}>انتخاب و ویرایش</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
