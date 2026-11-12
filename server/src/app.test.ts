import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

const app = createApp();
let agent: ReturnType<typeof request.agent>;
let token = "";

function authed(r: request.Test) {
  return r.set("Authorization", `Bearer ${token}`);
}

beforeAll(() => {
  agent = request.agent(app);
});

async function login() {
  const res = await agent.post("/api/auth/login").send({
    correo: "sandra.a@mail.com",
    contrasena: "EmpleoNow123!",
  });
  expect(res.status).toBe(200);
  token = res.body.accessToken;
  return res;
}

describe("health y auth", () => {
  it("GET /api/health responde ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("login con credenciales incorrectas => 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ correo: "sandra.a@mail.com", contrasena: "incorrecta" });
    expect(res.status).toBe(401);
  });

  it("login correcto => 200 + accessToken + cookie refresh", async () => {
    const res = await login();
    expect(res.body.accessToken).toBeTruthy();
    const setCookie = (res.headers["set-cookie"] as unknown as string[]) ?? [];
    expect(setCookie.some((c: string) => c.includes("en_refresh"))).toBe(true);
  });

  it("GET /api/auth/me devuelve el usuario", async () => {
    await login();
    const res = await authed(agent.get("/api/auth/me"));
    expect(res.status).toBe(200);
    expect(res.body.user.correo).toBe("sandra.a@mail.com");
  });
});

describe("vacantes", () => {
  it("exige autenticación", async () => {
    const res = await request(app).get("/api/vacancies");
    expect(res.status).toBe(401);
  });

  it("lista vacantes con forma correcta", async () => {
    await login();
    const res = await authed(agent.get("/api/vacancies"));
    expect(res.status).toBe(200);
    expect(res.body.vacancies).toHaveLength(5);
    const first = res.body.vacancies[0];
    expect(typeof first.title).toBe("string");
    expect(Array.isArray(first.requirements)).toBe(true);
    expect(typeof first.saved).toBe("boolean");
  });

  it("filtra por búsqueda", async () => {
    await login();
    const res = await authed(agent.get("/api/vacancies")).query({ search: "mesero" });
    expect(res.body.vacancies.length).toBeGreaterThanOrEqual(1);
    expect(res.body.vacancies[0].title).toContain("Mesero");
  });

  it("lista favoritos de la postulante", async () => {
    await login();
    const res = await authed(agent.get("/api/favorites"));
    expect(res.status).toBe(200);
    expect(res.body.favorites).toHaveLength(2);
    expect(res.body.favorites.every((v: { saved: boolean }) => v.saved)).toBe(true);
  });
});

describe("postulaciones", () => {
  it("postularse crea y duplica => 409", async () => {
    await login();
    const { body } = await authed(agent.get("/api/vacancies"));
    const disenador = body.vacancies.find((v: { title: string }) => v.title.includes("Diseñador"));
    expect(disenador).toBeTruthy();

    const created = await authed(agent.post("/api/applications")).send({ vacancyId: disenador.id });
    expect(created.status).toBe(201);
    expect(created.body.application.status).toBe("En revisión");

    const dup = await authed(agent.post("/api/applications")).send({ vacancyId: disenador.id });
    expect(dup.status).toBe(409);

    const withdrawn = await authed(agent.post(`/api/applications/${created.body.application.id}/withdraw`));
    expect(withdrawn.status).toBe(204);

    const mine = await authed(agent.get("/api/applications/mine"));
    expect(mine.body.applications.some((a: { id: number }) => a.id === created.body.application.id)).toBe(false);
  });
});

describe("perfil y notificaciones", () => {
  it("GET /api/profile con datos seed", async () => {
    await login();
    const res = await authed(agent.get("/api/profile"));
    expect(res.status).toBe(200);
    expect(res.body.profile.nombres).toBe("Sandra");
    expect(res.body.profile.experiences.length).toBeGreaterThanOrEqual(1);
    expect(res.body.profile.technicalSkills.length).toBeGreaterThanOrEqual(1);
  });

  it("PATCH /api/profile actualiza contacto", async () => {
    await login();
    const res = await authed(agent.patch("/api/profile")).send({ telefono: "3001234567" });
    expect(res.status).toBe(200);
    expect(res.body.profile.telefono).toBe("3001234567");
  });

  it("GET /api/notifications", async () => {
    await login();
    const res = await authed(agent.get("/api/notifications"));
    expect(res.status).toBe(200);
    expect(res.body.notifications.length).toBeGreaterThanOrEqual(4);
    expect(res.body.notifications[0].title).toBeTruthy();
  });
});