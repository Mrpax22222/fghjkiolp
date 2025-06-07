"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ElementInspector } from "@/components/editor/element-inspector"
import { PageManager } from "@/components/editor/page-manager"
import { DocumentTools } from "@/components/editor/document-tools"
import { AiEditPanel } from "@/components/editor/ai-edit-panel"
import { useEditorStore } from "@/store/editor-store"
import { ScrollArea } from "@/components/ui/scroll-area"

export function ControlPanel() {
  const { selectedElements } = useEditorStore()
  const hasSelection = selectedElements.length > 0

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        <Tabs defaultValue="inspector">
          <TabsList className="w-full">
            <TabsTrigger value="inspector" className="flex-1">
              بازرسی عنصر
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex-1">
              مدیریت صفحات
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex-1">
              ابزارها
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inspector" className="mt-4">
            {hasSelection ? (
              <ElementInspector />
            ) : (
              <div className="text-center py-8 text-muted-foreground">یک عنصر را در پیش‌نمایش انتخاب کنید</div>
            )}
          </TabsContent>

          <TabsContent value="pages" className="mt-4">
            <PageManager />
          </TabsContent>

          <TabsContent value="tools" className="mt-4">
            <DocumentTools />
          </TabsContent>
        </Tabs>

        <AiEditPanel />
      </div>
    </ScrollArea>
  )
}
