import { PortableText, type PortableTextComponents } from "@portabletext/react";

const components: PortableTextComponents = {
  marks: {
    link: ({ children, value }) => {
      const href = typeof value?.href === "string" ? value.href : "";
      if (!href || !/^https?:|^mailto:/i.test(href)) return <>{children}</>;
      const external = /^https?:/i.test(href);
      return (
        <a href={href} {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}>
          {children}
        </a>
      );
    },
  },
};

export function ResearchText({ value }: { value: unknown[] }) {
  if (!value.length) return null;
  return (
    <div className="researchRich">
      <PortableText components={components} onMissingComponent={false} value={value as never[]} />
    </div>
  );
}
