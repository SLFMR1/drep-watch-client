await import("./src/env.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    i18n: {
        locales: ["en"],
        defaultLocale: "en",
    },

    typescript: {
        ignoreBuildErrors: process.env.NEXT_PUBLIC_NODE_ENV !== 'development',
    },
    eslint: {
        ignoreDuringBuilds: process.env.NEXT_PUBLIC_NODE_ENV !== 'development',
    },

    swcMinify: true,
    
    // Add environment variables for Puppeteer
    env: {
        PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "true",
        PUPPETEER_EXECUTABLE_PATH: process.env.NODE_ENV === 'production' 
            ? '/usr/bin/google-chrome'
            : undefined
    },
    
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                destination: 'http://localhost:8080/api/v1/:path*',
            },
        ]
    },

    /**
     * @param {import('webpack').Configuration} config
     * @param {{isServer: boolean}} options
     * @returns {import('webpack').Configuration}
     */
    webpack: (config, { isServer }) => {
        config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
        config.output = { ...config.output, webassemblyModuleFilename: 'static/wasm/[modulehash].wasm' };
        
        // Handle canvas module in API routes
        if (isServer) {
            config.resolve = {
                ...config.resolve,
                fallback: {
                    ...config.resolve?.fallback,
                    canvas: false
                }
            };
        }
        
        return config;
    },
};

const withPWA = async () => {
    const nextPWA = (await import('next-pwa')).default;
    return nextPWA({
        dest: 'public',
        disable: process.env.NEXT_PUBLIC_NODE_ENV === 'development',
        register: true,
    });
};

export default withPWA().then((pwaConfig) => pwaConfig(nextConfig));
