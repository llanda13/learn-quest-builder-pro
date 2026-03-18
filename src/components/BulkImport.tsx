import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CircleCheck as CheckCircle, CircleAlert as AlertCircle, X, Download, Brain, Sparkles, Eye, Save, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Questions } from '@/services/db/questions';
import { classifyQuestions } from '@/services/edgeFunctions';
import { classifyBloom, detectKnowledgeDimension, inferDifficulty } from '@/services/ai/classify';
import { useTaxonomyClassification } from '@/hooks/useTaxonomyClassification';
import { resolveSubjectMetadata } from '@/services/ai/subjectMetadataResolver';
import { CATEGORY_CONFIG, getSpecializations, getSubjectCodes } from '@/config/questionBankFilters';

interface BulkImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedQuestion {
  topic: string;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'essay' | 'short_answer';
  choices?: Record<string, string>;
  correct_answer?: string;
  bloom_level?: string;
  difficulty?: string;
  knowledge_dimension?: string;
  created_by: 'teacher' | 'admin' | 'ai';
  approved: boolean;
  needs_review: boolean;
  ai_confidence_score?: number;
  quality_score?: number;
  readability_score?: number;
  classification_confidence?: number;
  validation_status?: string;
  subject?: string;
  grade_level?: string;
  term?: string;
  tags?: string[];
  category?: string;
  specialization?: string;
  subject_code?: string;
  subject_description?: string;
}

interface ImportStats {
  total: number;
  processed: number;
  approved: number;
  needsReview: number;
  byBloom: Record<string, number>;
  byDifficulty: Record<string, number>;
  byTopic: Record<string, number>;
}

type ImportStep = 'upload' | 'preview' | 'verification' | 'processing' | 'results';

export default function BulkImport({
  onClose,
  onImportComplete,
}: BulkImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<ImportStats | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('General');
  const [classificationResults, setClassificationResults] = useState<any[]>([]);
  const [showClassificationDetails, setShowClassificationDetails] = useState(false);
  
  // New: verification step state
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [verificationData, setVerificationData] = useState<ParsedQuestion[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { batchClassify, buildTaxonomyMatrix } = useTaxonomyClassification({
    useMLClassifier: true,
    storeResults: true,
    checkSimilarity: true
  });

  const resetState = () => {
    setPreviewData([]);
    setShowPreview(false);
    setVerificationData([]);
    setClassificationResults([]);
    setResults(null);
    setErrors([]);
    setProgress(0);
    setCurrentStep('');
    setEditingIndex(null);
    setImportStep('upload');
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const droppedFile = acceptedFiles[0];
    if (!droppedFile) return;

    const isCSV = droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv');
    const isPDF = droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf');

    // Reset all state before processing new file
    resetState();

    if (isCSV) {
      setFile(droppedFile);
      console.log('[BulkImport] CSV file received:', droppedFile.name, droppedFile.size, 'bytes');
      previewCSV(droppedFile);
    } else if (isPDF) {
      setFile(droppedFile);
      console.log('[BulkImport] PDF file received:', droppedFile.name, droppedFile.size, 'bytes');
      previewPDF(droppedFile);
    } else {
      toast.error('Please upload a CSV or PDF file');
    }
  }, [selectedTopic]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    maxSize: 50 * 1024 * 1024,
  });

  // --- Flexible column detection helpers ---
  const normalizeColumnName = (name: string): string =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\s]+/g, ' ').trim();

  const findColumnKey = (headers: string[], possibleNames: string[]): string | null => {
    const normalizedNames = possibleNames.map(normalizeColumnName);
    for (const header of headers) {
      const nh = normalizeColumnName(header);
      if (normalizedNames.includes(nh)) return header;
    }
    for (const header of headers) {
      const nh = normalizeColumnName(header);
      if (normalizedNames.some(n => nh.startsWith(n))) return header;
    }
    for (const header of headers) {
      const nh = normalizeColumnName(header);
      if (normalizedNames.some(n => nh.includes(n))) return header;
    }
    return null;
  };

  /** Detect whether a row looks like an actual question vs a title/header row */
  const isValidQuestionRow = (row: any, headers: string[]): boolean => {
    const questionKey = findColumnKey(headers, ['question', 'question text']);
    const text = questionKey ? String(row[questionKey] || '').trim() : '';
    if (!text || text.length < 10) return false;
    // Skip title/header rows (e.g. "Question Bank – IT101: Introduction...")
    if (/^question\s*bank/i.test(text)) return false;
    if (/^(#|no\.?|number|question\s*#)$/i.test(text)) return false;
    return true;
  };

  const previewCSV = (csvFile: File) => {
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        console.log('[BulkImport] CSV parsed:', results.data.length, 'rows, headers:', headers);
        const validRows = (results.data as any[]).filter(row => isValidQuestionRow(row, headers));
        console.log('[BulkImport] Valid question rows:', validRows.length);

        // Build preview with mapped columns for display
        const previewRows = validRows.slice(0, 5).map(row => {
          const questionKey = findColumnKey(headers, ['question', 'question text']);
          const typeKey = findColumnKey(headers, ['type', 'question type']);
          const correctKey = findColumnKey(headers, ['correct answer', 'correct', 'answer', 'answer key']);
          const topicKey = findColumnKey(headers, ['topic']);
          return {
            Question: questionKey ? String(row[questionKey] || '').substring(0, 100) + (String(row[questionKey] || '').length > 100 ? '...' : '') : '',
            Type: typeKey ? String(row[typeKey] || '') : 'mcq',
            Correct: correctKey ? String(row[correctKey] || '') : '',
            Topic: topicKey ? String(row[topicKey] || '') : selectedTopic,
          };
        });

        setPreviewData(previewRows);
        setShowPreview(true);
        setImportStep('preview');
        if (validRows.length < (results.data as any[]).length) {
          const skipped = (results.data as any[]).length - validRows.length;
          toast.info(`Skipped ${skipped} non-question row(s) (titles/headers).`);
        }
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`);
      },
    });
  };

  const extractQuestionsFromPDF = async (pdfFile: File): Promise<any[]> => {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // Preserve line breaks by checking Y positions
        let lastY: number | null = null;
        const pageLines: string[] = [];
        let currentLine = '';
        for (const item of textContent.items as any[]) {
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageLines.push(currentLine);
            currentLine = '';
          }
          currentLine += (currentLine ? ' ' : '') + item.str;
          lastY = item.transform[5];
        }
        if (currentLine) pageLines.push(currentLine);
        fullText += pageLines.join('\n') + '\n';
      }

      console.log('[BulkImport] PDF text extracted, length:', fullText.length);

      const questions: any[] = [];
      // Split by numbered questions: "1.", "2.", etc. at start of line
      const questionBlocks = fullText.split(/\n\s*(\d+)\.\s+/).filter(b => b.trim());
      
      // Process pairs: [number, content, number, content, ...]
      for (let i = 0; i < questionBlocks.length; i++) {
        const block = questionBlocks[i].trim();
        // Skip pure numbers (the question number captured by split)
        if (/^\d+$/.test(block)) continue;
        
        // Skip title/header blocks
        if (/^question\s*bank/i.test(block)) continue;
        if (block.length < 10) continue;

        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;

        // First line (or first part before choices) is the question text
        let questionText = '';
        const choices: Record<string, string> = {};
        let correctAnswer = '';

        // Try to find choices in lines
        for (const line of lines) {
          const choiceMatch = line.match(/^([A-D])\.\s*(.+)/i);
          if (choiceMatch) {
            const letter = choiceMatch[1].toUpperCase();
            choices[letter] = choiceMatch[2].trim().replace(/[*✓]+$/, '').trim();
            if (line.includes('*') || line.includes('✓')) {
              correctAnswer = letter;
            }
          } else if (Object.keys(choices).length === 0) {
            questionText += (questionText ? ' ' : '') + line;
          }
        }

        // If no choices found from lines, try inline pattern: "A. text B. text C. text D. text"
        if (Object.keys(choices).length === 0 && questionText) {
          const inlinePattern = /([A-D])\.\s+/gi;
          if (inlinePattern.test(questionText)) {
            const parts = questionText.split(/\s*([A-D])\.\s+/i);
            questionText = parts[0].trim();
            for (let j = 1; j < parts.length - 1; j += 2) {
              choices[parts[j].toUpperCase()] = parts[j + 1].trim();
            }
          }
        }

        if (!questionText || questionText.length < 10) continue;

        // Try to find correct answer from "Answer:" or "Correct:" line
        for (const line of lines) {
          const ansMatch = line.match(/(?:answer|correct)[:\s]+([A-D])/i);
          if (ansMatch) {
            correctAnswer = ansMatch[1].toUpperCase();
          }
        }

        let questionType: 'mcq' | 'true_false' | 'essay' | 'short_answer' = 'mcq';
        if (Object.keys(choices).length === 0) {
          questionType = 'essay';
        } else if (Object.keys(choices).length === 2 &&
                   (choices.A?.toLowerCase().includes('true') ||
                    choices.A?.toLowerCase().includes('false'))) {
          questionType = 'true_false';
        }

        questions.push({
          Question: questionText,
          Type: questionType,
          A: choices.A || '',
          B: choices.B || '',
          C: choices.C || '',
          D: choices.D || '',
          Correct: correctAnswer || '',
          Topic: selectedTopic,
        });
      }

      console.log('[BulkImport] PDF questions extracted:', questions.length);
      return questions;
    } catch (error) {
      console.error('[BulkImport] PDF parsing error:', error);
      throw new Error('Failed to parse PDF content');
    }
  };

  const previewPDF = async (pdfFile: File) => {
    try {
      setCurrentStep('Extracting text from PDF...');
      const questions = await extractQuestionsFromPDF(pdfFile);
      if (questions.length === 0) {
        toast.error('No valid questions found in the PDF. Ensure questions are numbered (1., 2., etc.).');
        return;
      }
      setPreviewData(questions.slice(0, 5));
      setShowPreview(true);
      setImportStep('preview');
      console.log('[BulkImport] PDF preview set with', questions.length, 'questions');
      toast.success(`Extracted ${questions.length} questions from PDF`);
    } catch (error) {
      toast.error(`PDF parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getField = (row: any, headers: string[], possibleNames: string[]): string => {
    const key = findColumnKey(headers, possibleNames);
    return key ? String(row[key] || '').trim() : '';
  };

  const validateRow = (row: any, index: number, headers: string[]): string[] => {
    const errors: string[] = [];
    const questionText = getField(row, headers, ['question', 'question text']);
    if (!questionText) {
      errors.push(`Row ${index + 1}: Missing question text`);
    }
    return errors;
  };

  const normalizeRow = (row: any, headers: string[]): Partial<ParsedQuestion> | null => {
    const questionText = getField(row, headers, ['question', 'question text']);
    if (!questionText) return null;

    const topic = getField(row, headers, ['topic']) || selectedTopic || 'General';
    const type = (getField(row, headers, ['type', 'question type']) || 'mcq').toLowerCase();

    let question_type: ParsedQuestion['question_type'] = 'mcq';
    if (type.includes('true') || type.includes('false') || type === 'tf') {
      question_type = 'true_false';
    } else if (type.includes('essay')) {
      question_type = 'essay';
    } else if (type.includes('short') || type.includes('fill')) {
      question_type = 'short_answer';
    }

    // Flexible option detection
    let choices: Record<string, string> | undefined;
    if (question_type === 'mcq') {
      choices = {};
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach((letter) => {
        const val = getField(row, headers, [
          `option ${letter.toLowerCase()}`,
          `choice ${letter.toLowerCase()}`,
          letter,
          `choice_${letter.toLowerCase()}`,
        ]);
        if (val) choices![letter] = val;
      });

      // If no choices found via columns, try to extract inline choices from question text
      if (Object.keys(choices).length === 0) {
        const inlineMatch = questionText.match(/[A-D]\.\s+/);
        if (inlineMatch) {
          const parts = questionText.split(/\s*([A-D])\.\s+/);
          // parts: [questionPart, 'A', choiceA, 'B', choiceB, ...]
          for (let i = 1; i < parts.length - 1; i += 2) {
            choices[parts[i]] = parts[i + 1].trim();
          }
        }
      }

      // Determine question_type based on actual choices found
      if (Object.keys(choices).length === 0) {
        question_type = 'essay';
        choices = undefined;
      } else if (Object.keys(choices).length < 2) {
        // Not enough options for MCQ
        question_type = 'short_answer';
        choices = undefined;
      }
    }

    // --- Correct answer: read from CSV, DO NOT default to 'A' ---
    const rawCorrect = getField(row, headers, ['correct answer', 'correct', 'answer', 'answer key']);
    let correctAnswer: string | undefined;
    if (rawCorrect) {
      const upper = rawCorrect.toUpperCase().trim();
      if (/^[A-F]$/.test(upper)) {
        correctAnswer = upper;
      } else {
        correctAnswer = rawCorrect; // essay/short answer
      }
    }

    // Read metadata columns from CSV
    const csvCategory = getField(row, headers, ['category']);
    const csvSpecialization = getField(row, headers, ['specialization']);
    const csvSubjectCode = getField(row, headers, ['subject code', 'subjectcode']);
    const csvSubjectDescription = getField(row, headers, ['subject description', 'subjectdescription']);

    return {
      topic: topic.trim(),
      question_text: questionText,
      question_type,
      choices,
      correct_answer: correctAnswer,
      bloom_level: getField(row, headers, ['bloom', 'bloom level']) || undefined,
      difficulty: getField(row, headers, ['difficulty']) || undefined,
      knowledge_dimension: getField(row, headers, ['knowledge dimension', 'knowledgedimension']) || undefined,
      subject: getField(row, headers, ['subject']) || undefined,
      grade_level: getField(row, headers, ['grade level']) || undefined,
      term: getField(row, headers, ['term']) || undefined,
      tags: (() => {
        const t = getField(row, headers, ['tags']);
        return t ? t.split(',').map(s => s.trim()) : undefined;
      })(),
      category: csvCategory || undefined,
      specialization: csvSpecialization || undefined,
      subject_code: csvSubjectCode || undefined,
      subject_description: csvSubjectDescription || undefined,
    };
  };

  /** Step 1: Parse, classify, resolve metadata, then show verification */
  const analyzeAndClassify = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setErrors([]);

    try {
      let rawData: any[];
      let csvHeaders: string[] = [];

      if (file.name.endsWith('.pdf')) {
        setCurrentStep('Extracting text from PDF...');
        console.log('[BulkImport] Re-parsing PDF file for classification:', file.name);
        rawData = await extractQuestionsFromPDF(file);
        console.log('[BulkImport] PDF re-parse produced', rawData.length, 'rows');
        setProgress(20);
      } else {
        setCurrentStep('Parsing CSV file...');
        console.log('[BulkImport] Re-parsing CSV file for classification:', file.name);
        const parseResult = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
          Papa.parse(file, { header: true, skipEmptyLines: true, complete: resolve, error: reject });
        });
        rawData = parseResult.data;
        csvHeaders = parseResult.meta.fields || [];
        console.log('[BulkImport] CSV re-parse produced', rawData.length, 'rows, headers:', csvHeaders);
        setProgress(20);
      }

      setCurrentStep('Validating data...');
      const validationErrors: string[] = [];
      const normalizedData: ParsedQuestion[] = [];
      const headers = csvHeaders.length > 0 ? csvHeaders : (rawData.length > 0 ? Object.keys(rawData[0]) : []);
      let skippedRows = 0;

      rawData.forEach((row, index) => {
        // Skip non-question rows (titles, headers, empty)
        if (!isValidQuestionRow(row, headers)) {
          skippedRows++;
          return;
        }
        const rowErrors = validateRow(row, index, headers);
        if (rowErrors.length > 0) {
          validationErrors.push(...rowErrors);
          return;
        }
        const normalized = normalizeRow(row, headers);
        if (!normalized) {
          skippedRows++;
          return;
        }
        normalizedData.push({
          ...normalized,
          created_by: 'teacher',
          approved: false,
          needs_review: true,
        } as ParsedQuestion);
      });

      if (skippedRows > 0) {
        toast.info(`Skipped ${skippedRows} invalid/non-question row(s).`);
      }

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setIsProcessing(false);
        return;
      }

      setProgress(40);
      setCurrentStep('Classifying questions with AI...');

      // AI classification
      try {
        const classificationInput = normalizedData.map(q => ({
          text: q.question_text,
          type: q.question_type,
          topic: q.topic
        }));

        const classifications = await classifyQuestions(classificationInput);
        normalizedData.forEach((question, index) => {
          const classification = classifications[index];
          if (classification) {
            question.bloom_level = question.bloom_level || classification.bloom_level;
            question.difficulty = question.difficulty || classification.difficulty;
            question.knowledge_dimension = question.knowledge_dimension || classification.knowledge_dimension;
            question.ai_confidence_score = classification.confidence;
            question.needs_review = classification.needs_review;
            if (classification.confidence >= 0.85) {
              question.approved = true;
              question.needs_review = false;
            }
          }
        });
        setClassificationResults(classifications);
        toast.success('AI classification completed');
      } catch (aiError) {
        console.warn('AI classification unavailable, using rule-based:', aiError);
        toast.info('Using rule-based classification (AI unavailable)');
        normalizedData.forEach((question) => {
          if (!question.bloom_level) question.bloom_level = classifyBloom(question.question_text);
          if (!question.knowledge_dimension) question.knowledge_dimension = detectKnowledgeDimension(question.question_text, question.question_type);
          if (!question.difficulty) question.difficulty = inferDifficulty(question.bloom_level as any, question.question_text, question.question_type);
          question.ai_confidence_score = 0.6;
          question.needs_review = true;
        });
      }

      setProgress(70);
      setCurrentStep('Resolving subject metadata...');

      // Resolve metadata for each question
      normalizedData.forEach((q) => {
        const resolved = resolveSubjectMetadata({
          subject: q.subject,
          topic: q.topic,
          subject_code: q.subject_code,
          subject_description: q.subject_description,
          category: q.category,
          specialization: q.specialization,
        });
        q.category = resolved.category;
        q.specialization = resolved.specialization;
        q.subject_code = resolved.subject_code;
        q.subject_description = resolved.subject_description;
      });

      setProgress(100);
      setCurrentStep('Analysis complete');
      setVerificationData(normalizedData);
      setImportStep('verification');
      toast.success(`Analyzed ${normalizedData.length} questions. Please verify before saving.`);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setErrors([error instanceof Error ? error.message : 'Unknown error occurred']);
    } finally {
      setIsProcessing(false);
    }
  };

  /** Step 2: After admin verifies, save to database */
  const saveVerifiedQuestions = async () => {
    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Saving to database...');
    setImportStep('processing');

    try {
      const validKnowledgeDimensions = ['factual', 'conceptual', 'procedural', 'metacognitive'];
      const normalizeKD = (val: string | undefined): string => {
        const n = (val || 'conceptual').toLowerCase().trim();
        return validKnowledgeDimensions.includes(n) ? n : 'conceptual';
      };

      const questionsWithDefaults = verificationData.map(q => ({
        topic: q.topic || 'General',
        question_text: q.question_text || '',
        question_type: (q.question_type as 'mcq' | 'true_false' | 'essay' | 'short_answer') || 'mcq',
        choices: q.choices || {},
        correct_answer: q.correct_answer || '',
        bloom_level: (q.bloom_level || 'understanding').toLowerCase(),
        difficulty: (q.difficulty || 'average').toLowerCase(),
        knowledge_dimension: normalizeKD(q.knowledge_dimension),
        created_by: 'teacher' as const,
        approved: false,
        ai_confidence_score: q.ai_confidence_score || 0.5,
        needs_review: (q.needs_review !== false),
        category: q.category || '',
        specialization: q.specialization || '',
        subject_code: q.subject_code || '',
        subject_description: q.subject_description || '',
      }));

      setProgress(40);

      try {
        await buildTaxonomyMatrix(questionsWithDefaults);
      } catch (matrixError) {
        console.warn('Failed to build taxonomy matrix:', matrixError);
      }

      setProgress(60);
      await Questions.bulkInsert(questionsWithDefaults);
      setProgress(100);
      setCurrentStep('Import completed!');

      const stats: ImportStats = {
        total: verificationData.length,
        processed: verificationData.length,
        approved: verificationData.filter(q => q.approved).length,
        needsReview: verificationData.filter(q => q.needs_review).length,
        byBloom: {},
        byDifficulty: {},
        byTopic: {},
      };
      verificationData.forEach((q) => {
        stats.byBloom[q.bloom_level!] = (stats.byBloom[q.bloom_level!] || 0) + 1;
        stats.byDifficulty[q.difficulty!] = (stats.byDifficulty[q.difficulty!] || 0) + 1;
        stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;
      });

      setResults(stats);
      setImportStep('results');
      toast.success(`Successfully imported ${verificationData.length} questions!`);
      onImportComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setErrors([error instanceof Error ? error.message : 'Unknown error occurred']);
      setImportStep('verification');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateVerificationField = (index: number, field: keyof ParsedQuestion, value: string) => {
    setVerificationData(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;

      // When category changes, reset specialization/subject
      if (field === 'category') {
        updated[index].specialization = '';
        updated[index].subject_code = '';
        updated[index].subject_description = '';
      }
      // When specialization changes, reset subject
      if (field === 'specialization') {
        updated[index].subject_code = '';
        updated[index].subject_description = '';
      }
      // When subject_code changes, auto-fill description
      if (field === 'subject_code' && updated[index].category && updated[index].specialization) {
        const subjects = getSubjectCodes(updated[index].category!, updated[index].specialization!);
        const match = subjects.find(s => s.code === value);
        if (match) {
          updated[index].subject_description = match.description;
        }
      }
      return updated;
    });
  };

  const downloadTemplate = () => {
    const template = [
      {
        Topic: 'Requirements Engineering',
        Question: 'Define what a functional requirement is in software development.',
        Type: 'mcq',
        A: 'A requirement that specifies what the system should do',
        B: 'A requirement that specifies how the system should perform',
        C: 'A requirement that specifies system constraints',
        D: 'A requirement that specifies user interface design',
        Correct: 'A',
        Bloom: 'remembering',
        Difficulty: 'easy',
        KnowledgeDimension: 'factual',
        Category: 'Major',
        Specialization: 'IT',
        SubjectCode: '101',
        SubjectDescription: 'Introduction to Computing',
      },
      {
        Topic: 'Data Modeling',
        Question: 'Explain the difference between conceptual and logical data models.',
        Type: 'essay',
        A: '',
        B: '',
        C: '',
        D: '',
        Correct: 'Conceptual models show high-level entities and relationships, while logical models include detailed attributes and constraints.',
        Bloom: 'understanding',
        Difficulty: 'average',
        KnowledgeDimension: 'conceptual',
        Category: 'Major',
        Specialization: 'IS',
        SubjectCode: '102',
        SubjectDescription: 'Systems Analysis and Design',
      },
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'question_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully!');
  };

  const categories = Object.keys(CATEGORY_CONFIG);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Import Questions</h2>
          <p className="text-muted-foreground">
            Import questions from CSV with AI-powered classification
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'preview', 'verification', 'results'] as const).map((step, i) => (
          <React.Fragment key={step}>
            {i > 0 && <span className="text-muted-foreground">→</span>}
            <Badge variant={importStep === step ? 'default' : 'outline'} className="capitalize">
              {step === 'verification' ? 'Verify & Edit' : step}
            </Badge>
          </React.Fragment>
        ))}
      </div>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            CSV Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Download our CSV template to ensure your data is formatted correctly. The template includes columns for <strong>Category</strong>, <strong>Specialization</strong>, <strong>Subject Code</strong>, and <strong>Subject Description</strong>.
          </p>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      {(importStep === 'upload' || importStep === 'preview') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg">Drop the CSV file here...</p>
              ) : (
                <div>
                  <p className="text-lg mb-2">Drag & drop a CSV or PDF file here, or click to select</p>
                  <p className="text-sm text-muted-foreground">Supports .csv and .pdf files up to 50MB</p>
                </div>
              )}
            </div>

            {file && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{file.name}</span>
                  <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Preview */}
      {showPreview && previewData.length > 0 && importStep === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="text-left p-2 font-medium">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-b">
                      {Object.values(row).map((value: any, cellIndex) => (
                        <td key={cellIndex} className="p-2 max-w-xs truncate">{String(value)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Showing first 5 rows. Click "Analyze & Classify" to process all questions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Topic Selection for PDF */}
      {file && file.name.endsWith('.pdf') && importStep === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Topic Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Topic for All Questions</label>
              <input
                type="text"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
                placeholder="Enter topic name"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Import errors found:</p>
              <ul className="list-disc list-inside space-y-1">
                {errors.slice(0, 10).map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
              {errors.length > 10 && <p className="text-sm">... and {errors.length - 10} more errors</p>}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Processing */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 animate-pulse" />
              {importStep === 'processing' ? 'Saving Questions' : 'Analyzing & Classifying'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== VERIFICATION STEP ===== */}
      {importStep === 'verification' && verificationData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Verify Classification ({verificationData.length} questions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Review the auto-resolved metadata below. Click any row to edit Category, Specialization, Subject Code, or Subject Description before saving.
            </p>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium w-8">#</th>
                    <th className="text-left p-2 font-medium min-w-[200px]">Question</th>
                    <th className="text-left p-2 font-medium">Topic</th>
                    <th className="text-left p-2 font-medium">Bloom</th>
                    <th className="text-left p-2 font-medium">Difficulty</th>
                    <th className="text-left p-2 font-medium">Answer</th>
                    <th className="text-left p-2 font-medium">Category</th>
                    <th className="text-left p-2 font-medium">Specialization</th>
                    <th className="text-left p-2 font-medium">Subject Code</th>
                    <th className="text-left p-2 font-medium min-w-[180px]">Subject Description</th>
                    <th className="text-left p-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {verificationData.map((q, idx) => {
                    const isEditing = editingIndex === idx;
                    const availableSpecs = q.category ? getSpecializations(q.category) : [];
                    const availableSubjects = q.category && q.specialization ? getSubjectCodes(q.category, q.specialization) : [];

                    return (
                      <tr key={idx} className={`border-b ${isEditing ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                        <td className="p-2 text-muted-foreground">{idx + 1}</td>
                        <td className="p-2 max-w-[250px] truncate" title={q.question_text}>{q.question_text}</td>
                        <td className="p-2">{q.topic}</td>
                        <td className="p-2 capitalize">{q.bloom_level}</td>
                        <td className="p-2 capitalize">{q.difficulty}</td>
                        <td className="p-2 font-medium">{q.correct_answer || '—'}</td>
                        <td className="p-2">
                          {isEditing ? (
                            <Select value={q.category || ''} onValueChange={(v) => updateVerificationField(idx, 'category', v)}>
                              <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">{q.category || '—'}</Badge>
                          )}
                        </td>
                        <td className="p-2">
                          {isEditing ? (
                            <Select value={q.specialization || ''} onValueChange={(v) => updateVerificationField(idx, 'specialization', v)}>
                              <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {availableSpecs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">{q.specialization || '—'}</Badge>
                          )}
                        </td>
                        <td className="p-2">
                          {isEditing ? (
                            <Select value={q.subject_code || ''} onValueChange={(v) => updateVerificationField(idx, 'subject_code', v)}>
                              <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {availableSubjects.map(s => <SelectItem key={s.code} value={s.code}>{s.code} - {s.description}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            q.subject_code || '—'
                          )}
                        </td>
                        <td className="p-2 max-w-[180px] truncate" title={q.subject_description}>
                          {q.subject_description || '—'}
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && importStep === 'results' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Import Results
              </div>
              <Button onClick={() => setShowClassificationDetails(!showClassificationDetails)} variant="outline" size="sm">
                {showClassificationDetails ? 'Hide' : 'Show'} Classification Details
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{results.total}</div>
                <div className="text-sm text-muted-foreground">Total Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{results.approved}</div>
                <div className="text-sm text-muted-foreground">Auto-Approved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{results.needsReview}</div>
                <div className="text-sm text-muted-foreground">Need Review</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{Object.keys(results.byTopic).length}</div>
                <div className="text-sm text-muted-foreground">Topics</div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2">By Bloom Level</h4>
                <div className="space-y-1">
                  {Object.entries(results.byBloom).map(([level, count]) => (
                    <div key={level} className="flex justify-between text-sm">
                      <span className="capitalize">{level}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">By Difficulty</h4>
                <div className="space-y-1">
                  {Object.entries(results.byDifficulty).map(([difficulty, count]) => (
                    <div key={difficulty} className="flex justify-between text-sm">
                      <span className="capitalize">{difficulty}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">By Topic</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Object.entries(results.byTopic).map(([topic, count]) => (
                    <div key={topic} className="flex justify-between text-sm">
                      <span className="truncate">{topic}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>

          {showClassificationDetails && classificationResults.length > 0 && (
            <CardContent className="border-t">
              <div className="space-y-4">
                <h4 className="font-semibold">AI Classification Analysis</h4>
                <div className="text-sm space-y-2">
                  <p><strong>Average Confidence:</strong> {(classificationResults.reduce((sum, c) => sum + c.confidence, 0) / classificationResults.length * 100).toFixed(1)}%</p>
                  <p><strong>Questions Needing Review:</strong> {classificationResults.filter(c => c.needs_review).length}</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {importStep === 'preview' && file && !isProcessing && (
          <Button onClick={analyzeAndClassify} className="flex-1">
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze & Classify
          </Button>
        )}

        {importStep === 'verification' && !isProcessing && (
          <>
            <Button variant="outline" onClick={() => { setImportStep('preview'); setVerificationData([]); }}>
              Back
            </Button>
            <Button onClick={saveVerifiedQuestions} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save {verificationData.length} Questions to Question Bank
            </Button>
          </>
        )}

        {importStep === 'results' && (
          <Button onClick={onClose} className="flex-1">
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete
          </Button>
        )}
      </div>
    </div>
  );
}
