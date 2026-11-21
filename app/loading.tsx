export default function Loading() {
  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="skeleton h-16 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="skeleton h-96 w-full rounded-xl" />
          <div className="space-y-4">
            <div className="skeleton h-64 w-full rounded-xl" />
            <div className="skeleton h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
