"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/cn";

interface CoverImageProps {
  src: string | null | undefined;
  alt: string;
  /** Classes do contêiner (defina altura/proporção aqui). */
  className?: string;
  /** Classes aplicadas à imagem (ex.: zoom no hover do cartão pai). */
  imageClassName?: string;
  /** Imagem acima da dobra (candidata a LCP): carrega já, com prioridade alta. */
  eager?: boolean;
}

/**
 * Capa de viagem, servida direto do navegador (`unoptimized`): o otimizador do Next buscaria a
 * imagem no servidor e o Wikimedia responde 429 a esse tipo de acesso (além de gastar a cota de
 * otimização da Vercel). Sem imagem — ou se ela falhar — mostra um gradiente na cor primária.
 */
export function CoverImage({ src, alt, className, imageClassName, eager }: CoverImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[linear-gradient(135deg,#e8def8_0%,#cdbdff_55%,#b7a2ff_100%)]",
        className,
      )}
    >
      {showImage && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          unoptimized
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          onError={() => setFailedSrc(src)}
          className={cn("object-cover", imageClassName)}
        />
      ) : (
        <MapPin
          aria-hidden
          className="absolute right-[12%] top-1/2 size-16 -translate-y-1/2 text-white/45"
          strokeWidth={1.4}
        />
      )}
    </div>
  );
}
