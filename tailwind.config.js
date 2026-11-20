/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Tokens oficiais extraídos de medfacil-pwa-main/src/index.css
      colors: {
        brand: {
          DEFAULT: "#0e706f", // verde-petroleo: acoes principais
          dark: "#004959", // azul-petroleo escuro: titulos, logo
          light: "#29a4b4", // turquesa: foco, detalhes
          cream: "#fef7e5", // creme: fundo das telas
        },
        accent: "#fec93f", // amarelo: destaques
        surface: "#fef7e5", // creme: fundo das telas
        ink: "#1f2d33", // texto principal
        muted: "#5f6b6f", // texto secundário
        line: "#d9d4c7", // bordas de campos
        danger: "#d64545",
        success: "#2e9e6b",
      },
    },
  },
  plugins: [],
};
