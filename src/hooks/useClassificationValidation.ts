import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtime } from './useRealtime';
import { toast } from 'sonner';

export interface ValidationRequest {
  id: string;
  question_id: string;
  question_text: string;
  original_classification: {
    bloom_level: string;
    knowledge_dimension: string;
    difficulty: string;
    confidence: number;
  };
  request_type: 'peer_review' | 'expert_review';
  requested_by: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}

export interface ValidationResult {
  validated_classification: {
    bloom_level: string;
    knowledge_dimension: string;
    difficulty: string;
  };
  validation_confidence: number;
  notes?: string;
  changes_made: string[];
}

export interface ValidationState {
  pendingValidations: ValidationRequest[];
  completedValidations: any[];
  loading: boolean;
  error: string | null;
  stats: {
    totalValidations: number;
    accuracyRate: number;
    avgConfidenceImprovement: number;
  };
}

export function useClassificationValidation() {
  const [state, setState] = useState<ValidationState>({
    pendingValidations: [],
    completedValidations: [],
    loading: true,
    error: null,
    stats: {
      totalValidations: 0,
      accuracyRate: 0,
      avgConfidenceImprovement: 0
    }
  });

  // Real-time updates for validation requests
  useRealtime('validation-requests', {
    table: 'review_requests',
    onInsert: (newRequest) => {
      if (newRequest.request_type === 'peer_review' || newRequest.request_type === 'expert_review') {
        toast.info('New validation request received');
        loadValidationRequests();
      }
    },
    onUpdate: (updatedRequest) => {
      toast.info('Validation request updated');
      loadValidationRequests();
    }
  });

  useEffect(() => {
    loadValidationRequests();
    loadValidationStats();
  }, []);

  const loadValidationRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load pending validation requests assigned to current user
      const { data: pending, error: pendingError } = await supabase
        .from('review_requests')
        .select(`
          *,
          questions (
            question_text,
            bloom_level,
            knowledge_dimension,
            difficulty,
            classification_confidence
          )
        `)
        .eq('assigned_to', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Load completed validations
      const { data: completed, error: completedError } = await supabase
        .from('classification_validations')
        .select('*')
        .eq('validator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (completedError) throw completedError;

      setState(prev => ({
        ...prev,
        pendingValidations: (pending || []).map(req => ({
          id: req.id,
          question_id: req.question_id,
          question_text: req.questions?.question_text || '',
          original_classification: {
            bloom_level: req.questions?.bloom_level || '',
            knowledge_dimension: req.questions?.knowledge_dimension || '',
            difficulty: req.questions?.difficulty || '',
            confidence: req.questions?.classification_confidence || 0
          },
          request_type: req.request_type,
          requested_by: req.requested_by,
          status: req.status,
          created_at: req.created_at
        })),
        completedValidations: completed || [],
        loading: false
      }));
    } catch (error) {
      console.error('Error loading validation requests:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load validations'
      }));
    }
  }, []);

  const loadValidationStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get validation statistics
      const { data: validations, error } = await supabase
        .from('classification_validations')
        .select('validation_confidence, original_classification, validated_classification')
        .eq('validator_id', user.id);

      if (error) throw error;

      const totalValidations = validations?.length || 0;
      
      // Calculate accuracy rate (simplified)
      const accuracyRate = totalValidations > 0 ? 0.85 : 0; // Mock calculation
      
      // Calculate average confidence improvement
      const avgConfidenceImprovement = validations?.reduce((sum, v) => {
        const original = v.original_classification as any;
        const validated = v.validated_classification as any;
        return sum + (v.validation_confidence - (original?.confidence || 0));
      }, 0) / totalValidations || 0;

      setState(prev => ({
        ...prev,
        stats: {
          totalValidations,
          accuracyRate,
          avgConfidenceImprovement
        }
      }));
    } catch (error) {
      console.error('Error loading validation stats:', error);
    }
  }, []);

  const submitValidation = useCallback(async (
    questionId: string,
    validationResult: ValidationResult
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get original classification
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .select('bloom_level, knowledge_dimension, difficulty, classification_confidence')
        .eq('id', questionId)
        .single();

      if (questionError) throw questionError;

      const originalClassification = {
        bloom_level: question.bloom_level,
        knowledge_dimension: question.knowledge_dimension,
        difficulty: question.difficulty,
        confidence: question.classification_confidence
      };

      // Store validation
      await supabase.from('classification_validations').insert({
        question_id: questionId,
        original_classification: originalClassification,
        validated_classification: validationResult.validated_classification,
        validator_id: user.id,
        validation_confidence: validationResult.validation_confidence,
        notes: validationResult.notes
      });

      // Update question with validated classification
      await supabase.from('questions').update({
        bloom_level: validationResult.validated_classification.bloom_level,
        knowledge_dimension: validationResult.validated_classification.knowledge_dimension,
        difficulty: validationResult.validated_classification.difficulty,
        validation_status: 'validated',
        validated_by: user.id,
        validation_timestamp: new Date().toISOString(),
        classification_confidence: validationResult.validation_confidence
      }).eq('id', questionId);

      // Update any pending review requests
      await supabase
        .from('review_requests')
        .update({ status: 'completed' })
        .eq('question_id', questionId)
        .eq('assigned_to', user.id);

      toast.success('Validation submitted successfully');
      
      // Refresh data
      await loadValidationRequests();
      await loadValidationStats();
    } catch (error) {
      console.error('Validation submission error:', error);
      toast.error('Failed to submit validation');
      throw error;
    }
  }, [loadValidationRequests, loadValidationStats]);

  const requestValidation = useCallback(async (
    questionId: string,
    requestType: 'peer_review' | 'expert_review',
    assignedTo?: string
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await supabase.from('review_requests').insert({
        question_id: questionId,
        request_type: requestType,
        requested_by: user.id,
        assigned_to: assignedTo,
        status: 'pending'
      });

      toast.success('Validation request submitted');
      await loadValidationRequests();
    } catch (error) {
      console.error('Error requesting validation:', error);
      toast.error('Failed to request validation');
      throw error;
    }
  }, [loadValidationRequests]);

  const rejectValidation = useCallback(async (
    questionId: string,
    reason: string
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update question status
      await supabase.from('questions').update({
        validation_status: 'rejected',
        validated_by: user.id,
        validation_timestamp: new Date().toISOString(),
        needs_review: true
      }).eq('id', questionId);

      // Log rejection
      await supabase.from('classification_validations').insert({
        question_id: questionId,
        original_classification: {},
        validated_classification: {},
        validator_id: user.id,
        validation_confidence: 0,
        notes: `Rejected: ${reason}`
      });

      toast.success('Classification rejected');
      await loadValidationRequests();
    } catch (error) {
      console.error('Error rejecting validation:', error);
      toast.error('Failed to reject classification');
      throw error;
    }
  }, [loadValidationRequests]);

  const getValidationHistory = useCallback(async (questionId: string) => {
    try {
      const { data, error } = await supabase
        .from('classification_validations')
        .select(`
          *,
          profiles!validator_id (full_name)
        `)
        .eq('question_id', questionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading validation history:', error);
      return [];
    }
  }, []);

  return {
    ...state,
    submitValidation,
    requestValidation,
    rejectValidation,
    getValidationHistory,
    findSimilarQuestions,
    clusterQuestions,
    detectRedundancy,
    analyzeQuestionBank,
    buildTaxonomyMatrix,
    refresh: loadValidationRequests
  };
}