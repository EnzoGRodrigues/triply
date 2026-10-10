import { ExternalLink } from "lucide-react";

interface ExternalSourceProps {
  name: string;
  href?: string | null;
}

/** Nome do provedor da API externa, com link de atribuição quando houver. */
export function ExternalSource({ name, href }: ExternalSourceProps) {
  if (!href) return <>{name}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
    >
      {name}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}
