import { type Config } from "tailwindcss";

export default {
    content: ["./src/**/*.tsx"],
    plugins: [],
    theme: {
        extend: {
            animation: {
                spin: 'spin 0.5s linear infinite',
            },
            boxShadow: {
                'color': '0px 0px 9px 0px #FFBFA7A6',
                'sm': '0px 4px 5px 0px rgba(0, 0, 0, 0.25)',
            },
            colors: {
                "brd-clr": "#00000017",
                primary: "#FF4700",
                "primary-light": "#FFDACC",
                secondary: "#3F3F3F",
                "secondary-dark": "#0D0D10",
                tertiary: "#A6A6A6",
                "tertiary-light": "#F0F0F0"
            },
            fontFamily: {
                "ibm-mono": ["var(--font-ibm-mono)"],
                "inter": ["var(--font-inter)"],
                "neue-regrade": ["var(--font-neue-regrade)"],
            },
            keyframes: {
                spin: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(-360deg)' },
                },
            },
        },
    },
} satisfies Config;
