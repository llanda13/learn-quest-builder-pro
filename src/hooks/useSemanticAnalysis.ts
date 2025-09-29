import { useState, useCallback, useEffect } from 'react';
import { semanticAnalyzer, type SimilarityResult, type ClusterResult } from '@/services/ai/semanticAnalyzer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SemanticAnalysisState {
  similarities: SimilarityResult[];
  clusters: ClusterResult[];
  loading: boolean;
  error: string | null;
  redundancyReport: {
    duplicatesFound: number;
    similarPairs: Array<{ id1: string; id2: string; similarity: number }>;
    recommendations: string[];
  } | null;
}

export interface UseSemanticAnalysisOptions {
  similarityThreshold?: number;
  clusteringEnabled?: boolean;
  autoDetectRedundancy?: boolean;
  storeResults?: boolean;
}

export function useSemanticAnalysis(options: UseSemanticAnalysisOptions = {}) {
  const {
    similarityThreshold = 0.7,
    clusteringEnabled = true,
    autoDetectRedundancy = true,
    storeResults = true
  } = options;

  const [state, setState] = useState<SemanticAnalysisState>({
    similarities: [],
    clusters: [],
    loading: false,
    error: null,
    redundancyReport: null
  });

  const findSimilarQuestions = useCallback(async (
    questionText: string,
    excludeIds: string[] = []
  ): Promise<SimilarityResult[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const similarities = await semanticAnalyzer.findSimilarQuestions(
        questionText,
        similarityThreshold
      );

      // Filter out excluded questions
      const filteredSimilarities = similarities.filter(sim => 
        !excludeIds.includes(sim.questionId2)
      );

      setState(prev => ({
        ...prev,
        similarities: filteredSimilarities,
        loading: false
      }));

      // Store similarity results if requested
      if (storeResults && filteredSimilarities.length > 0) {
        await storeSimilarityResults(filteredSimilarities);
      }

      return filteredSimilarities;
    } catch (error) {
      console.error('Similarity analysis error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Similarity analysis failed'
      }));
      return [];
    }
  }, [similarityThreshold, storeResults]);

  const clusterQuestions = useCallback(async (
    questions: Array<{ id: string; text: string; topic: string }>
  ): Promise<ClusterResult[]> => {
    if (!clusteringEnabled) return [];

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const clusters = await semanticAnalyzer.clusterQuestions(questions);

      setState(prev => ({
        ...prev,
        clusters,
        loading: false
      }));

      return clusters;
    } catch (error) {
      console.error('Clustering error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Clustering failed'
      }));
      return [];
    }
  }, [clusteringEnabled]);

  const detectRedundancy = useCallback(async (
    newQuestionText: string,
    existingQuestions: Array<{ id: string; text: string }>
  ): Promise<{
    isRedundant: boolean;
    similarQuestions: Array<{ id: string; text: string; similarity: number }>;
    recommendation: string;
  }> => {
    try {
      const existingTexts = existingQuestions.map(q => q.text);
      const redundancyResult = await semanticAnalyzer.detectRedundancy(
        newQuestionText,
        existingTexts,
        similarityThreshold
      );

      // Map back to include IDs
      const similarQuestions = redundancyResult.similarQuestions.map(similar => {
        const question = existingQuestions.find(q => q.text === similar.text);
        return {
          id: question?.id || '',
          text: similar.text,
          similarity: similar.similarity
        };
      });

      return {
        isRedundant: redundancyResult.isRedundant,
        similarQuestions,
        recommendation: redundancyResult.recommendation
      };
    } catch (error) {
      console.error('Redundancy detection error:', error);
      return {
        isRedundant: false,
        similarQuestions: [],
        recommendation: 'Unable to check for redundancy'
      };
    }
  }, [similarityThreshold]);

  const analyzeQuestionBank = useCallback(async (
    questions: Array<{ id: string; text: string; topic: string; bloom_level: string; knowledge_dimension: string }>
  ): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Run clustering analysis
      const clusters = await clusterQuestions(questions);

      // Detect redundancy across all questions
      const redundancyPairs: Array<{ id1: string; id2: string; similarity: number }> = [];
      let duplicatesFound = 0;

      for (let i = 0; i < questions.length; i++) {
        for (let j = i + 1; j < questions.length; j++) {
          const similarity = await semanticAnalyzer.calculateSimilarity(
            questions[i].text,
            questions[j].text
          );

          if (similarity >= similarityThreshold) {
            redundancyPairs.push({
              id1: questions[i].id,
              id2: questions[j].id,
              similarity
            });
            duplicatesFound++;
          }
        }
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (duplicatesFound > 0) {
        recommendations.push(`Found ${duplicatesFound} potentially redundant question pairs`);
        recommendations.push('Review similar questions for consolidation opportunities');
      }

      if (clusters.length > 0) {
        const lowCoherenceClusters = clusters.filter(c => c.coherence < 0.6);
        if (lowCoherenceClusters.length > 0) {
          recommendations.push(`${lowCoherenceClusters.length} question clusters have low coherence`);
        }
      }

      const redundancyReport = {
        duplicatesFound,
        similarPairs: redundancyPairs,
        recommendations
      };

      setState(prev => ({
        ...prev,
        redundancyReport,
        loading: false
      }));

      // Store analysis results
      if (storeResults) {
        await storeAnalysisResults(redundancyPairs, clusters);
      }

    } catch (error) {
      console.error('Question bank analysis error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      }));
    }
  }, [clusterQuestions, similarityThreshold, storeResults]);

  const buildTaxonomyMatrix = useCallback(async (questions: any[]): Promise<TaxonomyMatrix> => {
    try {
      const matrix = TaxonomyMatrixService.buildMatrix(questions);
      setState(prev => ({ ...prev, matrix }));
      return matrix;
    } catch (error) {
      console.error('Matrix building error:', error);
      throw error;
    }
  }, []);

  const validateClassification = useCallback(async (
    questionId: string,
    originalResult: MLClassificationResult,
    validatedResult: Partial<MLClassificationResult>,
    notes?: string
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Store validation
      await supabase.from('classification_validations').insert({
        question_id: questionId,
        original_classification: originalResult,
        validated_classification: validatedResult,
        validator_id: user.id,
        validation_confidence: 0.95,
        notes
      });

      // Update question
      await supabase.from('questions').update({
        bloom_level: validatedResult.bloom_level || originalResult.bloom_level,
        knowledge_dimension: validatedResult.knowledge_dimension || originalResult.knowledge_dimension,
        difficulty: validatedResult.difficulty || originalResult.difficulty,
        validation_status: 'validated',
        validated_by: user.id,
        validation_timestamp: new Date().toISOString()
      }).eq('id', questionId);

      toast.success('Classification validated successfully');
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate classification');
      throw error;
    }
  }, []);

  return {
    ...state,
    classifyQuestion,
    batchClassify,
    findSimilarQuestions,
    clusterQuestions,
    detectRedundancy,
    analyzeQuestionBank,
    buildTaxonomyMatrix,
    validateClassification,
    isHighConfidence: state.confidence ? state.confidence.overallConfidence >= 0.8 : false,
    needsReview: state.confidence ? state.confidence.needsReview : false
  };
}

async function storeSimilarityResults(similarities: SimilarityResult[]): Promise<void> {
  try {
    const similarityInserts = similarities.map(sim => ({
      question1_id: sim.questionId1,
      question2_id: sim.questionId2,
      similarity_score: sim.similarity,
      algorithm_used: sim.algorithm
    }));

    await supabase.from('question_similarities').insert(similarityInserts);
  } catch (error) {
    console.error('Error storing similarity results:', error);
  }
}

async function storeAnalysisResults(
  similarityPairs: Array<{ id1: string; id2: string; similarity: number }>,
  clusters: ClusterResult[]
): Promise<void> {
  try {
    // Store similarity pairs
    if (similarityPairs.length > 0) {
      const similarityInserts = similarityPairs.map(pair => ({
        question1_id: pair.id1,
        question2_id: pair.id2,
        similarity_score: pair.similarity,
        algorithm_used: 'semantic_analyzer'
      }));

      await supabase.from('question_similarities').insert(similarityInserts);
    }

    // Store cluster information as quality metrics
    for (const cluster of clusters) {
      await supabase.from('quality_metrics').insert({
        entity_type: 'question',
        characteristic: 'clustering',
        metric_name: 'cluster_coherence',
        value: cluster.coherence,
        unit: 'ratio',
        measurement_method: 'semantic_clustering',
        automated: true
      });
    }
  } catch (error) {
    console.error('Error storing analysis results:', error);
  }
}