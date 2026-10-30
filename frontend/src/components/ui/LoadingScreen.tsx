export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solar-500 border-t-transparent" aria-label="Loading" />
        <p className="mt-4 text-gray-600">Loading…</p>
      </div>
    </div>
  )
}