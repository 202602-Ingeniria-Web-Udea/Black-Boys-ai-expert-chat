"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/lib/client/api";
import type { ConversationSummary } from "@/lib/types";

/** Los diálogos se montan solo mientras hay una conversación seleccionada (así su estado siempre empieza limpio). */
export function RenameDialog({
  conversation,
  onClose,
  onSave,
}: {
  conversation: ConversationSummary | null;
  onClose: () => void;
  onSave: (id: string, title: string) => Promise<void>;
}) {
  if (!conversation) return null;
  return <RenameForm key={conversation.id} conversation={conversation} onClose={onClose} onSave={onSave} />;
}

function RenameForm({
  conversation,
  onClose,
  onSave,
}: {
  conversation: ConversationSummary;
  onClose: () => void;
  onSave: (id: string, title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(conversation.title);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value) {
      setError("El título no puede estar vacío");
      return;
    }
    if (value === conversation.title) {
      onClose();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave(conversation.id, value);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Renombrar conversación">
      <form onSubmit={submit} noValidate className="space-y-4">
        {error ? <Alert kind="error">{error}</Alert> : null}
        <TextField
          id="rename-title"
          label="Título"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          data-autofocus
          onFocus={(event) => event.currentTarget.select()}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteDialog({
  conversation,
  onClose,
  onConfirm,
}: {
  conversation: ConversationSummary | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}) {
  if (!conversation) return null;
  return <DeleteConfirm key={conversation.id} conversation={conversation} onClose={onClose} onConfirm={onConfirm} />;
}

function DeleteConfirm({
  conversation,
  onClose,
  onConfirm,
}: {
  conversation: ConversationSummary;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(conversation.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="¿Eliminar esta conversación?"
      description={`«${conversation.title}» y todos sus mensajes se borrarán de forma permanente.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} data-autofocus>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirm} loading={loading}>
            Eliminar
          </Button>
        </>
      }
    >
      {error ? <Alert kind="error">{error}</Alert> : null}
    </Modal>
  );
}
