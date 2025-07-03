import React, { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

interface AuthModalProps {
  mode: "signin" | "signup" | null;
  onClose: () => void;
  onSignup: (e: React.FormEvent<HTMLFormElement>) => void;
  onSignin: (e: React.FormEvent<HTMLFormElement>) => void;
  loading?: boolean;
  error?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({
  mode,
  onClose,
  onSignup,
  onSignin,
  loading,
  error,
}) => {
  const [currentMode, setCurrentMode] = useState<"signin" | "signup">(mode || "signin");

  if (!mode) return null;

  const toggleMode = () => {
    setCurrentMode(currentMode === "signin" ? "signup" : "signin");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
        <button
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">
          {currentMode === "signin" ? "Sign In" : "Create Account"}
        </h2>

        {currentMode === "signin" ? (
          <>
            <form onSubmit={onSignin}>
              <LoginForm loading={loading} error={error} />
            </form>
            <div className="mt-4 text-center text-slate-400">
              <p>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="text-blue-400 hover:underline"
                  onClick={toggleMode}
                >
                  Sign up
                </button>
              </p>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={onSignup}>
              <SignupForm loading={loading} error={error} />
            </form>
            <div className="mt-4 text-center text-slate-400">
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-blue-400 hover:underline"
                  onClick={toggleMode}
                >
                  Sign in
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
