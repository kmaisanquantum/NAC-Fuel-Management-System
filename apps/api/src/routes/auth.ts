import { Router } from "express";
import { z } from "zod";
import { login, refresh } from "../services/authService";
import { requireAuth } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post("/login", (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = login(email, password, req.ip);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post("/refresh", (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    res.json(refresh(refreshToken));
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
