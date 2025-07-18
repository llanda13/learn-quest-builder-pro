import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { QuestionBankForm } from "@/components/questionbank/QuestionBankForm";
import { QuestionBankList } from "@/components/questionbank/QuestionBankList";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Database, Upload } from "lucide-react";

export default function QuestionBank() {
  const [activeTab, setActiveTab] = useState("view");

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Question Bank</h1>
            <p className="text-muted-foreground">
              Manage your test questions repository
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setActiveTab("bulk")}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Bulk Import
            </Button>
            <Button 
              onClick={() => setActiveTab("add")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="view" className="gap-2">
              <Database className="h-4 w-4" />
              View Questions
            </TabsTrigger>
            <TabsTrigger value="add" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Question
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Upload className="h-4 w-4" />
              Bulk Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="mt-6">
            <QuestionBankList />
          </TabsContent>

          <TabsContent value="add" className="mt-6">
            <QuestionBankForm onSuccess={() => setActiveTab("view")} />
          </TabsContent>

          <TabsContent value="bulk" className="mt-6">
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Bulk Import Questions</h3>
              <p className="text-muted-foreground mb-4">
                Upload a CSV file to import multiple questions at once.
              </p>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <Button variant="outline" className="mt-4">
                    Choose File
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-2">CSV Format:</p>
                  <code className="bg-muted p-2 rounded text-xs block">
                    Topic,Question Text,Choice A,Choice B,Choice C,Choice D,Correct Answer,Bloom Level,Difficulty
                  </code>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}