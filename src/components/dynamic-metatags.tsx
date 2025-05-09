import Head from "next/head";
import { useRouter } from "next/router";

interface DynamicMetatagsProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  type?: "website" | "article";
}

const DynamicMetatags: React.FC<DynamicMetatagsProps> = ({
  title = "dRepWatch – Cardano dRep Insights",
  description = "Track and learn about Cardano dReps, their activity, and Q&A sessions.",
  imageUrl = "https://c-ipfs-gw.nmkr.io/ipfs/QmNWssukxYXoo2MHTu6BG9ScQpbYjDYjAm8qQsgRcWjpjd",
  type = "website"
}) => {
  const router = useRouter();
  const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://drep.watch'}${router.asPath}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={url} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="drep.watch" />
      <meta property="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Head>
  );
};

export default DynamicMetatags; 