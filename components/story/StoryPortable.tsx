import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { StoryBlock } from "@/lib/content/story-segments";

const components: PortableTextComponents = {
  marks: {
    link: ({ children, value }) => {
      const href = typeof value?.href === "string" ? value.href : "";
      if (!href) return <>{children}</>;
      const external = /^https?:/i.test(href);
      return (
        <a href={href} {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}>
          {children}
        </a>
      );
    },
  },
};

export function StoryPortable({ value }: { value: StoryBlock[] }) {
  if (!value.length) return null;
  return (
    <div className="storyPortable">
      <PortableText components={components} onMissingComponent={false} value={value} />
    </div>
  );
}
