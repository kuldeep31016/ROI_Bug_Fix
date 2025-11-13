import { Snackbar, Button, SnackbarCloseReason } from '@mui/material';
import { SyntheticEvent } from 'react';

interface Props {
  open: boolean;
  onClose: (event: SyntheticEvent | Event, reason?: SnackbarCloseReason) => void;
  onUndo: () => void;
}

export default function UndoSnackbar({ open, onClose, onUndo }: Props) {
  const handleUndoClick = () => {
    if (import.meta.env.DEV) {
      console.log('[UndoSnackbar] undo click');
    }
    onUndo();
  };

  return (
    <Snackbar
      open={open}
      onClose={onClose}
      autoHideDuration={4000}
      message="Task deleted"
      action={<Button color="secondary" size="small" onClick={handleUndoClick}>Undo</Button>}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    />
  );
}


