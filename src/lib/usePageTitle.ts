import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title === "Overview" ? "SkinStory" : `${title} · SkinStory`;
  }, [title]);
}
