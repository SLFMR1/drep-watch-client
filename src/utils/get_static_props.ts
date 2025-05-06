import type { GetStaticProps } from "next";

type Data = {
    // Define your data structure here
};

export const getStaticProps: GetStaticProps = () => {
    // Fetch your data here and return it as props
    const data: Data = {
        // Fetch your data
    };

    return {
        props: {
            data,
        },
    };
};