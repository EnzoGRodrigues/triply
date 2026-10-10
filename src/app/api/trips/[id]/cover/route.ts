import { requireUser } from "@/server/auth/session";
import { apiRoute } from "@/server/http/route";
import { getTripCover } from "@/server/trips/service";

export const GET = apiRoute<RouteContext<"/api/trips/[id]/cover">>(
  async (request, { params }) => {
    const user = await requireUser();
    const { id } = await params;

    const { mime, bytes } = await getTripCover(user.id, id);

    // A URL de capa carrega `?v=<updatedAt>`: com ele o conteúdo é imutável.
    const versioned = request.nextUrl.searchParams.has("v");

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(bytes.length),
        "Cache-Control": versioned
          ? "private, max-age=31536000, immutable"
          : "private, no-cache",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  },
);
