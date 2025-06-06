import { useEffect, useState } from "react";
import Lenis from "@studio-freight/lenis";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type AppType } from "next/dist/shared/lib/utils";
import Script from "next/script";

import "~/styles/globals.css";
import { MeshProvider } from "@meshsdk/react";
import { Toaster } from "react-hot-toast";
import Layout from "~/layout";

const queryClient = new QueryClient();

const MyApp: AppType = ({ Component, pageProps }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // useEffect(() => {
  //     const lenis = new Lenis();

  //     function raf(time: number) {
  //         lenis.raf(time);
  //         requestAnimationFrame(raf);
  //     }
  //     requestAnimationFrame(raf);
  //     setIsMounted(true);
  //     return () => lenis.destroy();
  // }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MeshProvider>
        <Layout>
          {isMounted && <Toaster position="top-center" />}
          <Component {...pageProps} />
        </Layout>
      </MeshProvider>
      <Script id="plain-chatbot" strategy="lazyOnload">
        {`
          (function(d, script) {
            script = d.createElement('script');
            script.async = false; // Next/Script handles async, consider removing or testing
            script.onload = function(){
              window.Plain.init({
                appId: 'liveChatApp_01JAFM75T0VXH1PM8Y7N08M47Q',
                title: 'Welcome to the dRepWatch Support!',
                theme: 'light',
                requireAuthentication: true,
                threadDetails: { labelTypeIds: ['lt_01JSVEXTW0J9CT6WPY6TK48MKC'], },
                style: {
                  chatButtonColor: '#000000',
                  chatButtonIconColor: '#FF6641',
                },
              });
            };
            script.src = 'https://chat.cdn-plain.com/index.js';
            d.getElementsByTagName('head')[0].appendChild(script);
          }(document));
        `}
      </Script>
    </QueryClientProvider>
  );
};

export default MyApp;
