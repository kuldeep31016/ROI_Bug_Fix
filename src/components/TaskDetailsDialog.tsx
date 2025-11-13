import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from '@mui/material';
import { daysBetween } from '@/utils/logic';
import { Task } from '@/types';
import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Task>) => void;
}

export default function TaskDetailsDialog({ open, task, onClose, onSave }: Props) {
  const [revenue, setRevenue] = useState<number | ''>('');
  const [timeTaken, setTimeTaken] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const validateTaskInput = (rev: number | '', time: number | ''): boolean => {
    if (typeof rev !== 'number' || rev <= 0) {
      alert('Revenue must be greater than 0');
      return false;
    }
    if (typeof time !== 'number' || time <= 0) {
      alert('Time taken must be greater than 0');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!open || !task) return;
    setRevenue(task.revenue);
    setTimeTaken(task.timeTaken);
    setNotes(task.notes ?? '');
  }, [open, task]);

  if (!task) return null;

  const handleSave = () => {
    if (!validateTaskInput(revenue, timeTaken)) {
      return;
    }
    const safeRevenue = typeof revenue === 'number' ? revenue : task.revenue;
    const safeTimeTaken = typeof timeTaken === 'number' ? timeTaken : task.timeTaken;
    if (import.meta.env.DEV) {
      console.log('[TaskDetailsDialog] save', { id: task.id, revenue: safeRevenue, timeTaken: safeTimeTaken });
    }
    onSave(task.id, {
      revenue: safeRevenue,
      timeTaken: safeTimeTaken,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Task Details</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography variant="h6" fontWeight={700}>{task.title}</Typography>
          <Divider />
          <Typography variant="body2" color="text.secondary">
            Created: {new Date(task.createdAt).toLocaleString()} {task.completedAt ? `• Completed: ${new Date(task.completedAt).toLocaleString()} • Cycle: ${daysBetween(task.createdAt, task.completedAt)}d` : ''}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Revenue"
              type="number"
              value={revenue}
              onChange={e => setRevenue(e.target.value === '' ? '' : Number(e.target.value))}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />
            <TextField
              label="Time Taken (h)"
              type="number"
              value={timeTaken}
              onChange={e => setTimeTaken(e.target.value === '' ? '' : Number(e.target.value))}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />
          </Stack>
          <TextField label="Notes" value={notes} onChange={e => setNotes(e.target.value)} multiline minRows={3} />
          <Typography variant="body2" color="text.secondary">Priority: {task.priority} • Status: {task.status}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}


