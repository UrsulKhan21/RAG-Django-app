export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-4">
        AI Knowledge Chat
      </h1>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        Upload your sources. Ask questions. Get answers only from your data.
      </p>
      <a
        href="/login"
        className="bg-black text-white px-6 py-3 rounded-lg hover:opacity-80"
      >
        Get Started
      </a>
    </main>
  );
}
