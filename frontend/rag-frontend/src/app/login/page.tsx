"use client";
 
export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/login/`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="p-8 border rounded-xl shadow-sm text-center">
        <h2 className="text-2xl font-semibold mb-6">
          Login
        </h2>
        <button
          onClick={handleLogin}
          className="bg-black text-white px-6 py-3 rounded-lg hover:opacity-80"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
