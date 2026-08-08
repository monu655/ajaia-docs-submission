import "./setup";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app";

const ASHA = "u_asha";
const BEN = "u_ben";
const CHEN = "u_chen";

describe("documents API", () => {
  it("rejects requests without a user header", async () => {
    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(401);
  });

  it("creates a document owned by the requesting user", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("x-user-id", ASHA)
      .send({ title: "Roadmap" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Roadmap");
    expect(res.body.isOwner).toBe(true);
    expect(res.body.ownerId).toBe(ASHA);
  });

  it("rejects a document with an empty title", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("x-user-id", ASHA)
      .send({ title: "   " });
    expect(res.status).toBe(400);
  });

  it("does not let another user read a document that hasn't been shared", async () => {
    const create = await request(app)
      .post("/api/documents")
      .set("x-user-id", ASHA)
      .send({ title: "Private notes" });
    const docId = create.body.id;

    const readAsBen = await request(app)
      .get(`/api/documents/${docId}`)
      .set("x-user-id", BEN);
    expect(readAsBen.status).toBe(404);
  });

  it("lets the owner share a document, after which the recipient can read it", async () => {
    const create = await request(app)
      .post("/api/documents")
      .set("x-user-id", ASHA)
      .send({ title: "Shared plan" });
    const docId = create.body.id;

    const share = await request(app)
      .post(`/api/documents/${docId}/share`)
      .set("x-user-id", ASHA)
      .send({ userId: BEN });
    expect(share.status).toBe(200);
    expect(share.body.sharedWith.map((u: any) => u.userId)).toContain(BEN);

    const readAsBen = await request(app)
      .get(`/api/documents/${docId}`)
      .set("x-user-id", BEN);
    expect(readAsBen.status).toBe(200);
    expect(readAsBen.body.isOwner).toBe(false);

    // A non-owner cannot share it further.
    const shareAsBen = await request(app)
      .post(`/api/documents/${docId}/share`)
      .set("x-user-id", BEN)
      .send({ userId: CHEN });
    expect(shareAsBen.status).toBe(404);
  });

  it("separates a user's owned documents from documents shared with them", async () => {
    const create = await request(app)
      .post("/api/documents")
      .set("x-user-id", ASHA)
      .send({ title: "For Ben" });
    await request(app)
      .post(`/api/documents/${create.body.id}/share`)
      .set("x-user-id", ASHA)
      .send({ userId: BEN });

    const list = await request(app).get("/api/documents").set("x-user-id", BEN);
    expect(list.status).toBe(200);
    expect(list.body.shared.some((d: any) => d.id === create.body.id)).toBe(true);
    expect(list.body.owned.some((d: any) => d.id === create.body.id)).toBe(false);
  });

  it("imports a .md file into a new formatted document", async () => {
    const res = await request(app)
      .post("/api/documents/import")
      .set("x-user-id", ASHA)
      .attach("file", Buffer.from("# Title\n\nSome **bold** text\n- one\n- two"), {
        filename: "notes.md",
        contentType: "text/markdown",
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("notes");
    expect(res.body.content).toContain("<h1>Title</h1>");
    expect(res.body.content).toContain("<strong>bold</strong>");
    expect(res.body.content).toContain("<li>one</li>");
  });

  it("rejects unsupported file types on import", async () => {
    const res = await request(app)
      .post("/api/documents/import")
      .set("x-user-id", ASHA)
      .attach("file", Buffer.from("binary-ish content"), {
        filename: "notes.docx",
        contentType: "application/octet-stream",
      });
    expect(res.status).toBe(400);
  });
});
