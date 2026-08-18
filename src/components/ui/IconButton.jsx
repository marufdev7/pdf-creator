export default function IconButton({
  label,
  children,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center border border-transparent text-muted transition hover:border-line hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
