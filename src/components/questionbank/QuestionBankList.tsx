import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2, Bot, User, Filter } from "lucide-react";

// Mock data - replace with Supabase integration
const mockQuestions = [
  {
    id: "1",
    topic: "Requirements Engineering",
    text: "Define the primary purpose of requirements elicitation in software development.",
    type: "mcq",
    choices: {
      A: "To test system performance",
      B: "To analyze user interface design", 
      C: "To gather user needs and expectations",
      D: "To write code for development"
    },
    correct_answer: "C",
    bloom_level: "Remembering",
    difficulty: "Easy",
    knowledge_dimension: "Factual",
    created_by: "ai",
    used_history: [],
    created_at: "2024-07-18T10:00:00Z"
  },
  {
    id: "2",
    topic: "Data and Process Modeling",
    text: "Analyze the effectiveness of using data flow diagrams versus entity relationship diagrams for system documentation.",
    type: "essay",
    correct_answer: "Sample rubric: Should compare strengths/weaknesses, appropriate use cases...",
    bloom_level: "Analyzing",
    difficulty: "Difficult",
    knowledge_dimension: "Conceptual",
    created_by: "teacher",
    used_history: ["test_1", "test_3"],
    created_at: "2024-07-17T14:30:00Z"
  },
  {
    id: "3",
    topic: "Object Modeling",
    text: "A class diagram should always include inheritance relationships.",
    type: "tf",
    correct_answer: "False",
    bloom_level: "Understanding",
    difficulty: "Average",
    knowledge_dimension: "Factual",
    created_by: "teacher",
    used_history: [],
    created_at: "2024-07-16T09:15:00Z"
  },
];

export function QuestionBankList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [bloomFilter, setBloomFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const filteredQuestions = mockQuestions.filter(question => {
    const matchesSearch = question.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = topicFilter === "all" || question.topic === topicFilter;
    const matchesBloom = bloomFilter === "all" || question.bloom_level === bloomFilter;
    const matchesDifficulty = difficultyFilter === "all" || question.difficulty === difficultyFilter;
    const matchesSource = sourceFilter === "all" || question.created_by === sourceFilter;

    return matchesSearch && matchesTopic && matchesBloom && matchesDifficulty && matchesSource;
  });

  const getTypeDisplay = (type: string) => {
    const types = {
      mcq: "Multiple Choice",
      essay: "Essay",
      tf: "True/False",
      fill: "Fill in the Blank"
    };
    return types[type as keyof typeof types] || type;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800";
      case "Average": return "bg-yellow-100 text-yellow-800";
      case "Difficult": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getBloomColor = (level: string) => {
    const colors = {
      "Remembering": "bg-blue-100 text-blue-800",
      "Understanding": "bg-green-100 text-green-800",
      "Applying": "bg-yellow-100 text-yellow-800",
      "Analyzing": "bg-orange-100 text-orange-800",
      "Evaluating": "bg-red-100 text-red-800",
      "Creating": "bg-purple-100 text-purple-800"
    };
    return colors[level as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                <SelectItem value="Requirements Engineering">Requirements Engineering</SelectItem>
                <SelectItem value="Data and Process Modeling">Data and Process Modeling</SelectItem>
                <SelectItem value="Object Modeling">Object Modeling</SelectItem>
              </SelectContent>
            </Select>

            <Select value={bloomFilter} onValueChange={setBloomFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Bloom's Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Remembering">Remembering</SelectItem>
                <SelectItem value="Understanding">Understanding</SelectItem>
                <SelectItem value="Applying">Applying</SelectItem>
                <SelectItem value="Analyzing">Analyzing</SelectItem>
                <SelectItem value="Evaluating">Evaluating</SelectItem>
                <SelectItem value="Creating">Creating</SelectItem>
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Average">Average</SelectItem>
                <SelectItem value="Difficult">Difficult</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="ai">AI Generated</SelectItem>
                <SelectItem value="teacher">Teacher Added</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Question Bank ({filteredQuestions.length} questions)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bloom's Level</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell className="max-w-md">
                    <div className="space-y-1">
                      <p className="text-sm font-medium line-clamp-2">
                        {question.text}
                      </p>
                      {question.type === "mcq" && question.choices && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          {Object.entries(question.choices).map(([key, value]) => (
                            <div key={key} className={`${question.correct_answer === key ? 'font-medium text-green-600' : ''}`}>
                              {key}. {value}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {question.topic}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {getTypeDisplay(question.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getBloomColor(question.bloom_level)}`}>
                      {question.bloom_level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                      {question.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {question.created_by === "ai" ? (
                        <Bot className="h-4 w-4 text-blue-500" />
                      ) : (
                        <User className="h-4 w-4 text-green-500" />
                      )}
                      <span className="text-xs capitalize">{question.created_by}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      Used {question.used_history?.length || 0} times
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredQuestions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No questions found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}