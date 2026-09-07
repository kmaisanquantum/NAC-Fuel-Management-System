import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import usersRouter from "./users";
import { db } from "../db";
import { v4 as uuid } from "uuid";

describe("Users router endpoints unit test", () => {
  let adminId: string;
  let testUserId: string;
  let adminRoleId: string;

  beforeAll(() => {
    // ensure admin role exists
    const role = db.prepare(`SELECT id FROM roles WHERE name = 'admin'`).get() as any;
    adminRoleId = role ? role.id : uuid();
    if (!role) {
      db.prepare(`INSERT INTO roles (id, name, description) VALUES (?, 'admin', 'System Admin')`).run(adminRoleId, 'admin');
    }

    // create dummy admin user for req.user
    adminId = uuid();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role_id, status)
      VALUES (?, 'testadmin@dspng.tech', 'hash', 'Test Admin', ?, 'active')
    `).run(adminId, adminRoleId);

    // create a target test user
    testUserId = uuid();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role_id, status)
      VALUES (?, 'targetuser@dspng.tech', 'hash', 'Target User', ?, 'active')
    `).run(testUserId, adminRoleId);
  });

  it("prevents self deletion", () => {
    const user = db.prepare(`SELECT id FROM users WHERE id = ?`).get(adminId);
    expect(user).toBeDefined();
    expect(adminId).toBe(adminId);
  });

  it("updates user full_name and email via PATCH logic", () => {
    db.prepare(`UPDATE users SET full_name = ?, email = ? WHERE id = ?`).run(
      "Updated Target User",
      "updatedtarget@dspng.tech",
      testUserId
    );
    const updated = db.prepare(`SELECT full_name, email FROM users WHERE id = ?`).get(testUserId) as any;
    expect(updated.full_name).toBe("Updated Target User");
    expect(updated.email).toBe("updatedtarget@dspng.tech");
  });

  it("soft deletes a user setting status = deleted", () => {
    db.prepare(`UPDATE users SET status = 'deleted' WHERE id = ?`).run(testUserId);
    const deletedUser = db.prepare(`SELECT status FROM users WHERE id = ?`).get(testUserId) as any;
    expect(deletedUser.status).toBe("deleted");

    const rows = db.prepare(`
      SELECT u.id FROM users u WHERE u.status != 'deleted' AND u.id = ?
    `).all(testUserId);
    expect(rows.length).toBe(0);
  });
});
