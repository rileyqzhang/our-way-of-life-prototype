"use client";

import { useEffect, useRef } from "react";
import { set, useFormValue, type ObjectInputProps } from "sanity";

export function StoryCodeTitleInput(props: ObjectInputProps) {
  const code = String(useFormValue(["participantCode"]) ?? "").trim();
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (seen.current === null) {
      seen.current = code;
      return;
    }
    if (!code || seen.current === code) return;
    seen.current = code;
    props.onChange(set({ _type: "localeString", en: code, es: code, zh: code }, ["title"]));
  }, [code, props]);

  return props.renderDefault(props);
}
