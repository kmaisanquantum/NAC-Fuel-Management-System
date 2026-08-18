import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "./index";

export function ensureBootstrapAccounts() {
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@dspng.tech";
  const userEmail = process.env.BOOTSTRAP_USER_EMAIL || "user@dspng.tech";
  const rawPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin@123!";

  // Ensure default roles exist
  const rolesToEnsure = [
    { name: "nac_admin", desc: "NAC Administrator" },
    { name: "fuel_operator", desc: "Fuel Operator" },
  ];

  const roleMap: Record<string, string> = {};

  for (const role of rolesToEnsure) {
    const existing = db.prepare("SELECT id FROM roles WHERE name = ?").get(role.name) as { id: string } | undefined;
    if (existing) {
      roleMap[role.name] = existing.id;
    } else {
      const id = uuid();
      db.prepare("INSERT INTO roles (id, name, description) VALUES (?, ?, ?)").run(id, role.name, role.desc);
      roleMap[role.name] = id;
    }
  }

  const passwordHash = bcrypt.hashSync(rawPassword, 10);

  // Ensure admin user exists
  const existingAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role_id, status)
      VALUES (?, ?, ?, 'Admin User', ?, 'active')
    `).run(uuid(), adminEmail, passwordHash, roleMap["nac_admin"]);
  }

  // Ensure operator user exists
  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(userEmail);
  if (!existingUser) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role_id, status)
      VALUES (?, ?, ?, 'Standard User', ?, 'active')
    `).run(uuid(), userEmail, passwordHash, roleMap["fuel_operator"]);
  }
}
