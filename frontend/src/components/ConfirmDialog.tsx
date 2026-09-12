import React from 'react';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';

interface Props {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  confirming = false,
  onConfirm,
  onCancel,
}: Props) => (
  <Modal isOpen={isOpen} toggle={onCancel}>
    <ModalHeader toggle={onCancel}>{title}</ModalHeader>
    <ModalBody>
      <p className="text-muted-theme mb-4">{message}</p>
      <div className="d-flex gap-2">
        <button
          type="button"
          className={`btn ${danger ? 'btn-danger' : 'btn-theme-primary'}`}
          onClick={onConfirm}
          disabled={confirming}
        >
          {confirming ? 'Working...' : confirmLabel}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={confirming}>
          {cancelLabel}
        </button>
      </div>
    </ModalBody>
  </Modal>
);

export default ConfirmDialog;
