await import("./src/env.js");

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
    
    webpack: (config,options) => {
        config.experiments = {
            asyncWebAssembly: true,
            layers: true,
        };
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
