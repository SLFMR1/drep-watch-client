import Head from "next/head";

const Metatags: React.FC = (): React.ReactNode => {
  return (
    <Head>
      <title>dRepWatch – Cardano Governance Insights</title>
      <meta name="description" content="dRepWatch connects Cardano delegators and their dReps! Track dRep activity, ask questions, and stay informed about Cardano governance." />

      <meta property="og:url" content="https://www.drep.watch" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="dRepWatch – Cardano Governance Insights" />
      <meta property="og:description" content="dRepWatch connects Cardano delegators and their dReps! Track dRep activity, ask questions, and stay informed about Cardano governance." />
      <meta
        property="og:image"
        content="https://c-ipfs-gw.nmkr.io/ipfs/QmNWssukxYXoo2MHTu6BG9ScQpbYjDYjAm8qQsgRcWjpjd"
      />

      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="drep.watch" />
      <meta property="twitter:url" content="https://www.drep.watch" />
      <meta name="twitter:title" content="dRepWatch – Cardano Governance Insights" />
      <meta name="twitter:description" content="dRepWatch connects Cardano delegators and their dReps! Track dRep activity, ask questions, and stay informed about Cardano governance." />
      <meta
        name="twitter:image"
        content="https://c-ipfs-gw.nmkr.io/ipfs/QmNWssukxYXoo2MHTu6BG9ScQpbYjDYjAm8qQsgRcWjpjd"
      />

      {/* <!-- Meta Tags Generated via https://www.opengraph.xyz --></meta> */}

      <meta name="theme-color" content="#ffffff" />

      <link rel="icon" href={`/favicon_io/favicon.ico`} />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href={`/favicon_io/apple-touch-icon.png`}
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href={`/favicon_io/favicon-32x32.png`}
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href={`/favicon_io/favicon-16x16.png`}
      />
      <link rel="manifest" href="/favicon_io/manifest.json" />
    </Head>
  );
};

export default Metatags;
