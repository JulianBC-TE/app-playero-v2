/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./App.{js,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],

	presets: [require("nativewind/preset")],
	theme: {
		extend: {
			colors: {
				teColorPrincipal: "#307FE2",
				teColorPrincipalMedio: "#6BA4EA",
				teColorPrincipalClaro: "#AED2FF",
				teColorSecundario: "#A7A8A9",
				teColorSecundarioMedio: "#DADCDD",
				teColorSecundarioClaro: "#E2E2E2",
				teColorTurnoAbierto: "#30B950",
				teColorTurnoPendiente: "##E34A4A",
				teColorTurnoCierreEspecial: "##E34A4A",
				teColorTurnoCerrado: "##6BA4EA",
				teColorTurnoAbrir: "##AED2FF",
			},
		},
	},
	plugins: [],
};
