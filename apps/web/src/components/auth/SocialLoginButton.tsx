"use client";

import React, { useTransition } from "react";
import { signInWithProvider } from "@/app/(auth)/actions";
import { FaGoogle, FaMicrosoft, FaApple } from "react-icons/fa";

type Provider = "google" | "microsoft" | "apple";

interface SocialLoginButtonProps {
  provider: Provider;
  label: string;
}

export function SocialLoginButton({ provider, label }: SocialLoginButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      // Trigger server action for OAuth flow
      signInWithProvider(provider);
    });
  };

  const getIcon = () => {
    switch (provider) {
      case "google":
        return <FaGoogle className="h-5 w-5 mr-2" />;
      case "microsoft":
        return <FaMicrosoft className="h-5 w-5 mr-2" />;
      case "apple":
        return <FaApple className="h-5 w-5 mr-2" />;
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {getIcon()}
      {label}
    </button>
  );
}

