"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Documentação interativa (Scalar API Reference) carregada de CDN com versão EXATA
 * fixada e Subresource Integrity: se o arquivo mudar, o navegador recusa executá-lo.
 * Para atualizar: troque a versão e gere o hash
 *   curl -sL <SCALAR_SRC> | openssl dgst -sha384 -binary | openssl base64 -A
 */
const SCALAR_VERSION = "1.71.0";
const SCALAR_SRC = `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}/dist/browser/standalone.js`;
const SCALAR_INTEGRITY =
  "sha384-I7aSmSxf06vl5HT10vzNOAryO+PFCAVHIGwhZerHn6yM/O0642381S3kw9o7fFQd";

interface ScalarInstance {
  destroy: () => void;
}

declare global {
  interface Window {
    Scalar?: {
      createApiReference: (target: Element, config: Record<string, unknown>) => ScalarInstance;
    };
  }
}

/** Tema alinhado ao design system do Triply (SPEC §3). */
const CUSTOM_CSS = `
  :root { --scalar-custom-header-height: 56px; }
  .light-mode, .dark-mode {
    --scalar-font: var(--font-roboto), system-ui, sans-serif;
    --scalar-font-code: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    --scalar-color-accent: #3300ff;
    --scalar-button-1: #3300ff;
    --scalar-button-1-hover: #2900cc;
    --scalar-button-1-color: #ffffff;
  }
  .scalar-app h1, .scalar-app h2 { font-family: var(--font-lexend), var(--font-roboto), system-ui, sans-serif; }
`;

const SCALAR_CONFIG = {
  // Mesma origem: o "Try it" chama /api/* direto, e o navegador envia o cookie de sessão.
  url: "/api/openapi.json",
  proxyUrl: "",
  theme: "default",
  layout: "modern",
  forceDarkModeState: "light",
  hideDarkModeToggle: true,
  defaultHttpClient: { targetKey: "shell", clientKey: "curl" },
  persistAuth: false,
  // Sem chamadas a serviços de terceiros além do CDN do próprio script.
  withDefaultFonts: false,
  telemetry: false,
  hideClientButton: true,
  agent: { disabled: true },
  mcp: { disabled: true },
  // Sem a barra de ferramentas do Scalar (Configure/Share/Deploy levam à plataforma deles).
  showDeveloperTools: "never",
  metaData: { title: "Triply API" },
  customCss: CUSTOM_CSS,
};

let scalarLoading: Promise<void> | undefined;

function loadScalar(): Promise<void> {
  if (window.Scalar) return Promise.resolve();
  scalarLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCALAR_SRC;
    script.integrity = SCALAR_INTEGRITY;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      scalarLoading = undefined; // permite tentar de novo
      reject(new Error("Falha ao carregar o Scalar"));
    };
    document.head.appendChild(script);
  });
  return scalarLoading;
}

export function ApiReference() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let instance: ScalarInstance | undefined;
    let cancelled = false;

    loadScalar()
      .then(() => {
        const container = containerRef.current;
        if (cancelled || !container || !window.Scalar) return;
        instance = window.Scalar.createApiReference(container, SCALAR_CONFIG);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, []);

  if (failed) {
    return (
      <div className="mx-auto max-w-xl flex-1 px-6 py-16 text-center">
        <h1 className="font-[family-name:var(--font-lexend)] text-2xl text-primary">
          Não foi possível carregar a documentação interativa
        </h1>
        <p className="mt-3 text-text-muted">
          O componente da documentação é carregado de um CDN e ele não respondeu. Tente
          recarregar a página ou use a especificação diretamente em{" "}
          <a className="text-primary underline" href="/api/openapi.json">
            /api/openapi.json
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="flex-1" />
      <noscript>
        <p className="px-6 py-10 text-center text-text-muted">
          A documentação interativa precisa de JavaScript. A especificação está em{" "}
          <a className="text-primary underline" href="/api/openapi.json">
            /api/openapi.json
          </a>
          .
        </p>
      </noscript>
    </>
  );
}
