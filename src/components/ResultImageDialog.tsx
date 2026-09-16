import { useEffect, useRef } from "react";

export function ResultImageDialog({
  open,
  src,
  alt,
  onClose,
}: {
  open: boolean;
  src?: string;
  alt: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && src && !dialog.open) dialog.showModal();
    else if ((!open || !src) && dialog.open) dialog.close();
  }, [open, src]);

  return (
    <dialog
      className="result-lightbox"
      ref={ref}
      aria-labelledby="result-lightbox-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <h2 id="result-lightbox-title" className="visually-hidden">
        결과 이미지 크게 보기
      </h2>
      {src && <img src={src} alt={alt} />}
      <button
        className="result-lightbox-close"
        type="button"
        onClick={onClose}
        aria-label="큰 이미지 닫기"
      >
        <span aria-hidden="true">×</span>
      </button>
    </dialog>
  );
}
