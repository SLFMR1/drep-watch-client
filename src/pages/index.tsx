import Home from "~/components/home";
import Metatags from "~/components/metatags";
import Layout from "~/layout";
import { getStaticProps } from "~/utils";

export default function Index() {
  return (
    <>
      <Metatags />

      <Home />
    </>
  );
}

export { getStaticProps };
