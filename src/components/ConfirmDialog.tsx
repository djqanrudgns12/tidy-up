import { useEffect, useRef } from "react";
export type Confirmation = {
  text: string;
  button: string;
  onConfirm: () => void;
};
export function ConfirmDialog({
  value,
  onClose,
}: {
  value: Confirmation | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (value) ref.current?.showModal();
    else ref.current?.close();
  }, [value]);
  return (
    <dialog
      className="confirm-dialog"
      ref={ref}
      onCancel={onClose}
      aria-labelledby="confirm-title"
    >
      <h2 id="confirm-title">활동을 바꿀까요?</h2>
      <p>{value?.text}</p>
      <div className="dialog-actions">
        <button className="button secondary" onClick={onClose} autoFocus>
          취소
        </button>
        <button
          className="button"
          onClick={() => {
            value?.onConfirm();
            onClose();
          }}
        >
          {value?.button}
        </button>
      </div>
    </dialog>
  );
}
