import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, RotateCcw, Trash2, FileQuestion, Users } from 'lucide-react';

interface DeletedQuestion {
  id: string;
  question_text: string;
  topic: string;
  bloom_level: string | null;
  question_type: string;
  updated_at: string;
}

export default function RecentlyDeleted() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<{ type: 'restore' | 'permanentDelete'; entity: 'question'; id: string; label: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: deletedQuestions, isLoading: loadingQuestions } = useQuery({
    queryKey: ['deleted-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, topic, bloom_level, question_type, updated_at')
        .eq('deleted', true)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as DeletedQuestion[];
    }
  });

  const handleRestore = async () => {
    if (!confirmAction || confirmAction.type !== 'restore') return;
    try {
      setSaving(true);
      if (confirmAction.entity === 'question') {
        const { error } = await supabase
          .from('questions')
          .update({ deleted: false })
          .eq('id', confirmAction.id);
        if (error) throw error;
      }
      toast({ title: 'Restored', description: `${confirmAction.entity === 'question' ? 'Question' : 'User'} has been restored.` });
      queryClient.invalidateQueries({ queryKey: ['deleted-questions'] });
    } catch (error) {
      console.error('Restore error:', error);
      toast({ title: 'Error', description: 'Failed to restore item.', variant: 'destructive' });
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmAction || confirmAction.type !== 'permanentDelete') return;
    try {
      setSaving(true);
      if (confirmAction.entity === 'question') {
        const { error } = await supabase
          .from('questions')
          .delete()
          .eq('id', confirmAction.id);
        if (error) throw error;
      }
      toast({ title: 'Permanently Deleted', description: 'Item has been permanently removed.' });
      queryClient.invalidateQueries({ queryKey: ['deleted-questions'] });
    } catch (error) {
      console.error('Permanent delete error:', error);
      toast({ title: 'Error', description: 'Failed to permanently delete item.', variant: 'destructive' });
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Archive className="h-8 w-8" />
          Recently Deleted
        </h1>
        <p className="text-muted-foreground">Recover deleted items or remove them permanently</p>
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <FileQuestion className="h-4 w-4" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Deleted Questions</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingQuestions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : deletedQuestions && deletedQuestions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Bloom's Level</TableHead>
                      <TableHead>Deleted At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedQuestions.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="max-w-[300px] truncate">{q.question_text}</TableCell>
                        <TableCell>{q.topic}</TableCell>
                        <TableCell><Badge variant="secondary">{q.question_type}</Badge></TableCell>
                        <TableCell>{q.bloom_level || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(q.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmAction({ type: 'restore', entity: 'question', id: q.id, label: q.question_text.slice(0, 40) })}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" /> Restore
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmAction({ type: 'permanentDelete', entity: 'question', id: q.id, label: q.question_text.slice(0, 40) })}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Delete Permanently
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No deleted questions found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Deleted Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                User deletion is permanent. Deleted users are removed from the authentication system and cannot be recovered here. 
                Use the Update function in User Management to deactivate accounts instead.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'restore' ? 'Restore Item' : 'Delete Permanently'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'restore'
                ? `Are you sure you want to restore "${confirmAction?.label}..."? It will be available in the system again.`
                : `Are you sure you want to permanently delete "${confirmAction?.label}..."? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction?.type === 'restore' ? handleRestore : handlePermanentDelete}
              className={confirmAction?.type === 'permanentDelete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {saving ? 'Processing...' : confirmAction?.type === 'restore' ? 'Restore' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
