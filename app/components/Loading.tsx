export function Loading() {
  return (
    <div className="flex w-full h-full items-center justify-center flex-1 p-4">
      <div
        className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-20"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
