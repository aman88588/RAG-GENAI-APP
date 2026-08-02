const express = require("express");

const authRouter = require("./auth.router");
const callsRouter = require("../calls.router");

const v1Router = express.Router();

// ── Auth routes (no JWT required — signup/signin are public) ──
v1Router.use("/auth", authRouter);

// ── Call analysis routes (JWT required per route) ──
v1Router.use("/calls", callsRouter);

module.exports = v1Router;
