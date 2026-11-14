import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/auth/redirect";

describe("safeNext (evita «open redirects» tras iniciar sesión)", () => {
  it.each(["/chat", "/chat/6f1b1c3e-0000-4000-8000-000000000000", "/account", "/admin", "/admin/usuarios?x=1", "/chat#abajo", "/account?tab=clave", "/pastillero", "/pastillero?vista=semana", "/chat?q=%C2%BFPara%20qu%C3%A9%20sirve%3F"])(
    "acepta la ruta interna %s",
    (path) => {
      expect(safeNext(path)).toBe(path);
    },
  );

  it.each([
    "//evil.example",
    "https://evil.example/chat",
    "http://localhost/chat",
    "javascript:alert(1)",
    "/\\evil.example",
    "/chat\\..\\..",
    "/login",
    "/api/auth/logout",
    "/chatty",
    "/administrador",
    "/pastilleroo",
    "chat",
    "",
    "/chat\n/evil",
    "/chat\u0000",
    `/chat/${"a".repeat(400)}`,
  ])("rechaza %j", (path) => {
    expect(safeNext(path)).toBeNull();
  });

  it("maneja null, undefined y arreglos (query string repetido)", () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext(["/chat", "//evil.example"])).toBe("/chat");
    expect(safeNext(["//evil.example", "/chat"])).toBeNull();
  });
});
