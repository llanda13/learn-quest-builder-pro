import { useState, useEffect, useCallback } from 'react';
import { mlClassifier, type MLClassificationResult, type QuestionInput } from '@/services/ai/mlClassifier';
import { semanticAnalyzer } from '@/services/ai/semanticAnalyzer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClassificationState {
  result: MLClassificationResult | null;
  loading: boolean;
  error: string | null;
  similarQuestions: Array<{
    id: string;
    text: string;
    similarity: number;
  }>;
  validationStatus: 'pending' | 'validated' | 'rejected';
  qualityIssues: string[];
}

export interface UseEnhancedClassificationOptions {
  autoClassify?: boolean;
  checkSimilarity?: boolean;
  similarityThreshold?: number;
  qualityThreshold?: number;
}

export function useEnhancedClassification(
  question: QuestionInput | null,
  options: UseEnhancedClassificationOptions = {}
) {
  const {
    autoClassify = true,
    checkSimilarity = true,
    similarityThreshold = 0.7,
    qualityThreshold = 0.6
  } = options;

  const [state, setState] = useState<ClassificationState>({
    result: null,
    loading: false,
    error: null,
    similarQuestions: [],
    validationStatus: 'pending',
    qualityIssues: []
  });

  const classifyQuestion = useCallback(async (questionInput: QuestionInput) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Step 1: ML Classification
      const classification = await mlClassifier.classifyQuestion(questionInput);
      
      // Step 2: Quality Assessment
      const qualityIssues = [];
      if (classification.quality_score < qualityThreshold) {
        qualityIssues.push('Question quality below threshold');
      }
      if (classification.readability_score > 12) {
        qualityIssues.push('Question may be too complex for target audience');
      }
      if (classification.confidence < 0.7) {
        qualityIssues.push('Low classification confidence - needs human review');
      }

      // Step 3: Similarity Check
      let similarQuestions: any[] = [];
      if (checkSimilarity) {
        const similarities = await semanticAnalyzer.findSimilarQuestions(
          questionInput.text,
          similarityThreshold
        );
        
        similarQuestions = await Promise.all(
          similarities.slice(0, 5).map(async (sim) => {
            const { data } = await supabase
              .from('questions')
              .select('id, question_text')
              .eq('id', sim.questionId2)
              .single();
            
            return {
              id: sim.questionId2,
              text: data?.question_text || '',
              similarity: sim.similarity
            };
          })
        );

        if (similarQuestions.length > 0) {
          qualityIssues.push(`Found ${similarQuestions.length} similar questions`);
        }
      }

      // Step 4: Determine validation status
      const validationStatus = classification.needs_review || qualityIssues.length > 0 
        ? 'needs_review' as const
        : 'validated' as const;

      setState({
        result: classification,
        loading: false,
        error: null,
        similarQuestions,
        validationStatus,
        qualityIssues
      });

      // Step 5: Store classification results
      await storeClassificationResult(questionInput, classification, qualityIssues);

    } catch (error) {
      console.error('Classification error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Classification failed'
      }));
      toast.error('Failed to classify question');
    }
  }, [checkSimilarity, similarityThreshold, qualityThreshold]);

  const validateClassification = useCallback(async (
    validatedResult: Partial<MLClassificationResult>,
    notes?: string
  ) => {
    if (!state.result || !question) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Store validation
      await supabase.from('classification_validations').insert({
        question_id: 'temp', // Would be actual question ID
        original_classification: state.result,
        validated_classification: validatedResult,
        validator_id: user.id,
        validation_confidence: 0.9,
        notes
      });

      setState(prev => ({
        ...prev,
        validationStatus: 'validated',
        result: { ...prev.result!, ...validatedResult }
      }));

      toast.success('Classification validated successfully');
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate classification');
    }
  }, [state.result, question]);

  const rejectClassification = useCallback(async (reason: string) => {
    setState(prev => ({ ...prev, validationStatus: 'rejected' }));
    toast.info('Classification rejected - manual review required');
  }, []);

  const checkQuestionSimilarity = useCallback(async (questionText: string) => {
    try {
      const similarities = await semanticAnalyzer.findSimilarQuestions(questionText, 0.5);
      
      const similarQuestions = await Promise.all(
        similarities.slice(0, 10).map(async (sim) => {
          const { data } = await supabase
            .from('questions')
            .select('id, question_text, topic, bloom_level')
            .eq('id', sim.questionId2)
            .single();
          
          return {
            id: sim.questionId2,
            text: data?.question_text || '',
            similarity: sim.similarity,
            topic: data?.topic,
            bloomLevel: data?.bloom_level
          };
        })
      );

      return similarQuestions;
    } catch (error) {
      console.error('Similarity check error:', error);
      return [];
    }
  }, []);

  const storeClassificationResult = async (
    questionInput: QuestionInput,
    result: MLClassificationResult,
    issues: string[]
  ) => {
    try {
      // Store quality metrics
      await supabase.from('quality_metrics').insert({
        entity_type: 'question',
        characteristic: 'classification_quality',
        metric_name: 'ml_confidence',
        value: result.confidence,
        unit: 'ratio',
        measurement_method: 'ml_classifier_v1'
      });

      await supabase.from('quality_metrics').insert({
        entity_type: 'question',
        characteristic: 'content_quality',
        metric_name: 'quality_score',
        value: result.quality_score,
        unit: 'ratio',
        measurement_method: 'quality_assessor_v1'
      });

      // Store similarity data if similar questions found
      if (state.similarQuestions.length > 0) {
        const similarityInserts = state.similarQuestions.map(sim => ({
          question1_id: 'temp', // Would be actual question ID
          question2_id: sim.id,
          similarity_score: sim.similarity,
          algorithm_used: 'semantic_analyzer_v1'
        }));

        await supabase.from('question_similarities').insert(similarityInserts);
      }

    } catch (error) {
      console.error('Error storing classification result:', error);
    }
  };

  // Auto-classify when question changes
  useEffect(() => {
    if (question && autoClassify) {
      classifyQuestion(question);
    }
  }, [question, autoClassify, classifyQuestion]);

  return {
    ...state,
    classifyQuestion,
    validateClassification,
    rejectClassification,
    checkQuestionSimilarity,
    isHighQuality: state.result ? state.result.quality_score >= qualityThreshold : false,
    isHighConfidence: state.result ? state.result.confidence >= 0.8 : false,
    hasIssues: state.qualityIssues.length > 0,
    needsReview: state.result?.needs_review || state.qualityIssues.length > 0
  };
}