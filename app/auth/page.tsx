"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data?.message || "Something went wrong");
        return;
      }

      window.localStorage.setItem(
        "liveblocks-user",
        JSON.stringify({
          userId: data.id,
          name: data.info?.name || username,
          avatar: data.info?.avatar || "",
          color: data.info?.color || "#85BBF0",
        })
      );
      window.location.assign("/");
    } catch (error) {
      setMessage("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = window.localStorage.getItem("liveblocks-user");

    if (stored) {
      router.replace("/");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-8 shadow-xl shadow-black/20">
        <h1 className="text-2xl font-semibold text-white">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter a username to sign in or create a new account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-300">
            Username
            <input
              className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-slate-500"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Your username"
              autoCapitalize="none"
              autoComplete="username"
            />
          </label>

          {message ? <div className="text-sm text-rose-400">{message}</div> : null}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
