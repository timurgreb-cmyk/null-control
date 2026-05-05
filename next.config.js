/** @type {import('next').NextConfig} */
const nextConfig = {};

let withPWA;
try {
  withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    register: true,
    skipWaiting: true,
  });
} catch (e) {
  // Фолбэк, если пакет не установлен
  console.warn("PWA plugin not found. Skipping PWA configuration.");
  withPWA = (config) => config;
}

module.exports = withPWA(nextConfig);
