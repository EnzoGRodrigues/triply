import { exampleSessionCookie, exampleUser } from "../examples";
import { errorResponse, responseRef } from "../responses";
import { ref, type JsonObject } from "../types";

const setCookieHeader = {
  "Set-Cookie": {
    description:
      "Cookie de sessão `triply_session` (JWT HS256, 7 dias, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` em produção).",
    schema: { type: "string" },
    example: exampleSessionCookie,
  },
};

const json = (schemaName: string, example?: unknown): JsonObject => ({
  "application/json": { schema: ref(schemaName), ...(example !== undefined ? { example } : {}) },
});

export const authPaths: Record<string, JsonObject> = {
  "/api/auth/register": {
    post: {
      tags: ["Autenticação"],
      operationId: "registerUser",
      summary: "Criar conta",
      description:
        "Cria a conta e já abre a sessão (devolve o cookie `triply_session`). O e-mail é normalizado (`trim` + minúsculas) e é único.",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: ref("RegisterInput"),
            example: {
              name: "Sarah Alves Soares",
              email: "sarah@triply.app",
              password: "triply123",
              confirmPassword: "triply123",
            },
          },
        },
      },
      responses: {
        "201": { description: "Conta criada e sessão aberta.", headers: setCookieHeader, content: json("AuthResponse", { user: exampleUser }) },
        "400": {
          ...errorResponse("Dados inválidos.", {
            senhasDiferentes: {
              summary: "Senhas diferentes",
              code: "VALIDATION_ERROR",
              message: "Dados inválidos. Revise os campos informados.",
              fields: { confirmPassword: "As senhas não coincidem." },
            },
            camposVazios: {
              summary: "Campos obrigatórios",
              code: "VALIDATION_ERROR",
              message: "Dados inválidos. Revise os campos informados.",
              fields: {
                name: "Informe seu nome.",
                email: "Informe o e-mail.",
                password: "Informe a senha.",
                confirmPassword: "Confirme a senha.",
              },
            },
          }),
        },
        "409": errorResponse("E-mail já cadastrado (a comparação ignora maiúsculas/minúsculas).", {
          emailEmUso: {
            summary: "E-mail em uso",
            code: "EMAIL_IN_USE",
            message: "Este e-mail já está cadastrado. Tente entrar na sua conta.",
            fields: { email: "Este e-mail já está cadastrado." },
          },
        }),
        "500": responseRef("InternalError"),
      },
    },
  },

  "/api/auth/login": {
    post: {
      tags: ["Autenticação"],
      operationId: "loginUser",
      summary: "Entrar",
      description:
        "Valida e-mail e senha e abre a sessão (cookie `triply_session`). Depois de executar este endpoint na própria documentação, o navegador envia o cookie automaticamente nas demais requisições (mesma origem). A resposta de erro não revela qual dos dois campos estava errado. Depois de **10 falhas em 15 minutos** (mesmo e-mail e IP) o login é bloqueado com `429` e `Retry-After`.\n\n**Usuária de demonstração:** `sarah@triply.app` / `triply123`.",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: ref("LoginInput"),
            example: { email: "sarah@triply.app", password: "triply123" },
          },
        },
      },
      responses: {
        "200": { description: "Sessão aberta.", headers: setCookieHeader, content: json("AuthResponse", { user: exampleUser }) },
        "400": responseRef("ValidationError"),
        "401": errorResponse("E-mail ou senha incorretos.", {
          credenciais: { summary: "Credenciais inválidas", code: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." },
        }),
        "429": responseRef("TooManyRequests"),
        "500": responseRef("InternalError"),
      },
    },
  },

  "/api/auth/logout": {
    post: {
      tags: ["Autenticação"],
      operationId: "logoutUser",
      summary: "Sair",
      description: "Expira o cookie de sessão. Idempotente: funciona mesmo sem sessão.",
      security: [],
      responses: {
        "204": {
          description: "Sessão encerrada (cookie expirado com `Max-Age=0`).",
          headers: {
            "Set-Cookie": {
              description: "Expira o cookie `triply_session`.",
              schema: { type: "string" },
              example: "triply_session=; Path=/; Max-Age=0; HttpOnly; SameSite=lax",
            },
          },
        },
        "500": responseRef("InternalError"),
      },
    },
  },

  "/api/auth/me": {
    get: {
      tags: ["Autenticação"],
      operationId: "getCurrentUser",
      summary: "Usuário logado",
      description: "Retorna o usuário da sessão atual. Útil para o front saber se há sessão válida.",
      responses: {
        "200": { description: "Usuário da sessão.", content: json("AuthResponse", { user: exampleUser }) },
        "401": responseRef("Unauthorized"),
        "500": responseRef("InternalError"),
      },
    },
  },
};
