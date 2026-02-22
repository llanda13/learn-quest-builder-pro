import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Save, X, Filter, ArrowUpDown, Archive, FolderTree, ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Questions, type Question } from "@/services/db/questions";

type SortField = 'created_at' | 'used_count' | 'question_text' | 'difficulty';
type SortDir = 'asc' | 'desc';

export default function QuestionBankManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list');
  const queryClient = useQueryClient();

  // Filters
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterBloom, setFilterBloom] = useState<string>('all');

  const [formData, setFormData] = useState({
    question_text: "",
    question_type: "mcq" as const,
    choices: [] as any[],
    correct_answer: "",
    topic: "",
    bloom_level: "",
    difficulty: "",
    subject: "",
    grade_level: "",
    cognitive_level: "",
    knowledge_dimension: ""
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ['admin-questions'],
    queryFn: async () => {
      return await Questions.getAll({});
    }
  });

  // Derive unique filter values
  const filterOptions = useMemo(() => {
    if (!questions) return { subjects: [], topics: [], difficulties: [], types: [], blooms: [] };
    return {
      subjects: [...new Set(questions.map(q => q.subject).filter(Boolean))] as string[],
      topics: [...new Set(questions.map(q => q.topic).filter(Boolean))] as string[],
      difficulties: [...new Set(questions.map(q => q.difficulty).filter(Boolean))] as string[],
      types: [...new Set(questions.map(q => q.question_type).filter(Boolean))] as string[],
      blooms: [...new Set(questions.map(q => q.bloom_level).filter(Boolean))] as string[],
    };
  }, [questions]);

  // Filter + search + sort
  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    let result = [...questions];

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.question_text.toLowerCase().includes(q) ||
        item.topic?.toLowerCase().includes(q) ||
        item.subject?.toLowerCase().includes(q) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Filters
    if (filterSubject !== 'all') result = result.filter(q => q.subject === filterSubject);
    if (filterTopic !== 'all') result = result.filter(q => q.topic === filterTopic);
    if (filterDifficulty !== 'all') result = result.filter(q => q.difficulty === filterDifficulty);
    if (filterType !== 'all') result = result.filter(q => q.question_type === filterType);
    if (filterBloom !== 'all') result = result.filter(q => q.bloom_level === filterBloom);

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortField === 'used_count') cmp = (a.used_count || 0) - (b.used_count || 0);
      else if (sortField === 'question_text') cmp = a.question_text.localeCompare(b.question_text);
      else if (sortField === 'difficulty') {
        const order: Record<string, number> = { easy: 1, average: 2, medium: 2, hard: 3 };
        cmp = (order[a.difficulty || ''] || 0) - (order[b.difficulty || ''] || 0);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [questions, searchQuery, filterSubject, filterTopic, filterDifficulty, filterType, filterBloom, sortField, sortDir]);

  // Hierarchy grouping
  const hierarchyData = useMemo(() => {
    const grouped: Record<string, Record<string, Question[]>> = {};
    filteredQuestions.forEach(q => {
      const subj = q.subject || 'Uncategorized';
      const topic = q.topic || 'No Topic';
      if (!grouped[subj]) grouped[subj] = {};
      if (!grouped[subj][topic]) grouped[subj][topic] = [];
      grouped[subj][topic].push(q);
    });
    return grouped;
  }, [filteredQuestions]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await Questions.create({
        ...data,
        created_by: 'admin',
        approved: true,
        status: 'approved'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      toast.success('Question created successfully');
      resetForm();
    },
    onError: () => toast.error('Failed to create question')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<typeof formData> }) => {
      return await Questions.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      toast.success('Question updated');
      setEditingId(null);
      resetForm();
    },
    onError: () => toast.error('Failed to update question')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => Questions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      toast.success('Question deleted');
    },
    onError: () => toast.error('Failed to delete question')
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => Questions.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      setSelectedIds(new Set());
      toast.success(`Deleted ${selectedIds.size} questions`);
    },
    onError: () => toast.error('Bulk delete failed')
  });

  const resetForm = () => {
    setFormData({
      question_text: "", question_type: "mcq", choices: [], correct_answer: "",
      topic: "", bloom_level: "", difficulty: "", subject: "", grade_level: "",
      cognitive_level: "", knowledge_dimension: ""
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleEdit = (question: Question) => {
    setEditingId(question.id);
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type as any,
      choices: question.choices as any[] || [],
      correct_answer: question.correct_answer || "",
      topic: question.topic,
      bloom_level: question.bloom_level || "",
      difficulty: question.difficulty || "",
      subject: question.subject || "",
      grade_level: question.grade_level || "",
      cognitive_level: question.cognitive_level || "",
      knowledge_dimension: question.knowledge_dimension || ""
    });
  };

  const handleSubmit = () => {
    if (editingId) updateMutation.mutate({ id: editingId, data: formData });
    else createMutation.mutate(formData);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
  };

  const toggleSubject = (subj: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      next.has(subj) ? next.delete(subj) : next.add(subj);
      return next;
    });
  };

  const clearFilters = () => {
    setFilterSubject('all');
    setFilterTopic('all');
    setFilterDifficulty('all');
    setFilterType('all');
    setFilterBloom('all');
    setSearchQuery('');
  };

  const activeFilterCount = [filterSubject, filterTopic, filterDifficulty, filterType, filterBloom].filter(f => f !== 'all').length;

  const renderQuestionCard = (q: Question) => (
    <div key={q.id} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
      <Checkbox
        checked={selectedIds.has(q.id)}
        onCheckedChange={() => toggleSelect(q.id)}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-relaxed">{q.question_text}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {q.subject && <Badge variant="outline" className="text-xs">{q.subject}</Badge>}
          <Badge variant="secondary" className="text-xs">{q.topic}</Badge>
          {q.bloom_level && <Badge variant="secondary" className="text-xs capitalize">{q.bloom_level}</Badge>}
          {q.difficulty && <Badge variant="secondary" className="text-xs capitalize">{q.difficulty}</Badge>}
          <Badge variant="secondary" className="text-xs">{q.question_type}</Badge>
          <Badge variant="outline" className="text-xs">Used: {q.used_count || 0}</Badge>
          <Badge variant="outline" className="text-xs">{new Date(q.created_at).toLocaleDateString()}</Badge>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="icon" variant="ghost" onClick={() => handleEdit(q)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(q.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Bank Manager</h1>
          <p className="text-muted-foreground">Full CRUD access to master question repository</p>
        </div>
        <Button onClick={() => setIsCreating(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Question' : 'Create New Question'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea value={formData.question_text} onChange={(e) => setFormData({ ...formData, question_text: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Topic</Label>
                <Input value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Bloom's Level</Label>
                <Select value={formData.bloom_level} onValueChange={(v) => setFormData({ ...formData, bloom_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Remembering','Understanding','Applying','Analyzing','Evaluating','Creating'].map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(v) => setFormData({ ...formData, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Update' : 'Create'}
              </Button>
              <Button onClick={resetForm} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Filter Panel */}
        <div className="w-full lg:w-64 shrink-0 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-xs">{activeFilterCount}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Subject</Label>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {filterOptions.subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Topic</Label>
                <Select value={filterTopic} onValueChange={setFilterTopic}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {filterOptions.topics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Difficulty</Label>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    {filterOptions.difficulties.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {filterOptions.types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Bloom's Level</Label>
                <Select value={filterBloom} onValueChange={setFilterBloom}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {filterOptions.blooms.map(b => <SelectItem key={b} value={b} className="capitalize">{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-3">
          {/* Search + Sort Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions, topics, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={`${sortField}-${sortDir}`} onValueChange={(v) => {
                const [f, d] = v.split('-') as [SortField, SortDir];
                setSortField(f); setSortDir(d);
              }}>
                <SelectTrigger className="w-44 border-border bg-card text-foreground">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Newest First</SelectItem>
                  <SelectItem value="created_at-asc">Oldest First</SelectItem>
                  <SelectItem value="used_count-desc">Most Used</SelectItem>
                  <SelectItem value="question_text-asc">Alphabetical</SelectItem>
                  <SelectItem value="difficulty-asc">Easiest First</SelectItem>
                  <SelectItem value="difficulty-desc">Hardest First</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={viewMode === 'hierarchy' ? 'default' : 'secondary'}
                size="icon"
                onClick={() => setViewMode(viewMode === 'list' ? 'hierarchy' : 'list')}
                title="Toggle hierarchy view"
                className="border border-border"
              >
                <FolderTree className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Separator orientation="vertical" className="h-5" />
              <Button variant="destructive" size="sm" onClick={() => bulkDeleteMutation.mutate([...selectedIds])}>
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {/* Results count + select all */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filteredQuestions.length > 0 && selectedIds.size === filteredQuestions.length}
                onCheckedChange={toggleSelectAll}
              />
              <span>{filteredQuestions.length} questions</span>
            </div>
          </div>

          {/* Questions Display */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading questions...</div>
          ) : filteredQuestions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No questions found. {activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Create your first question!'}
              </CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-2 pr-4">
                {filteredQuestions.map(renderQuestionCard)}
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-2 pr-4">
                {Object.entries(hierarchyData).map(([subject, topics]) => (
                  <div key={subject} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSubject(subject)}
                      className="w-full flex items-center gap-2 p-3 hover:bg-accent transition-colors text-left"
                    >
                      {expandedSubjects.has(subject) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-semibold flex-1">{subject}</span>
                      <Badge variant="secondary">{Object.values(topics).flat().length}</Badge>
                    </button>
                    {expandedSubjects.has(subject) && (
                      <div className="border-t">
                        {Object.entries(topics).map(([topic, qs]) => (
                          <div key={topic} className="border-b last:border-b-0">
                            <div className="px-6 py-2 bg-muted/50 text-sm font-medium flex items-center justify-between">
                              <span>{topic}</span>
                              <Badge variant="outline" className="text-xs">{qs.length}</Badge>
                            </div>
                            <div className="px-4 space-y-1 py-1">
                              {qs.map(renderQuestionCard)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
