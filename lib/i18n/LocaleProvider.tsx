"use client";

import { createContext, useContext, useState } from "react";
import { messages, type Locale, type Messages } from "./messages";

const COOKIE = "beshaped-locale";
const ONE_YEAR = 60 * 60 * 24 * 365;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = (next: Locale) => {
    document.cookie = `${COOKIE}=${next};path=/;max-age=${ONE_YEAR};samesite=lax`;
    document.documentElement.lang = next;
    setLocaleState(next);
  };

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        toggleLocale: () => setLocale(locale === "en" ? "af" : "en"),
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used within LocaleProvider");
  return value;
}

export function useMessages(): Messages {
  return messages[useLocale().locale];
}
