import Answer from "~/components/answer";
import DynamicMetatags from "~/components/dynamic-metatags";
import { GetServerSideProps } from "next";
import { BASE_API_URL } from "~/data/api";

type MetaProps = {
  title: string;
  description: string;
  imageUrl: string;
  type: "article" | "website";
};

export const getServerSideProps: GetServerSideProps<{ meta: MetaProps }> = async (ctx) => {
  const { id } = ctx.query;
  if (!id || typeof id !== 'string') {
    return { notFound: true };
  }

  try {
    // Fetch question
    const questionRes = await fetch(`${BASE_API_URL}/api/v1/questions/${id}`);
    if (!questionRes.ok) return { notFound: true };
    const questionData = await questionRes.json();
    const question = questionData.question;

    // Fetch answer
    const answerRes = await fetch(`${BASE_API_URL}/api/v1/answers/${id}`);
    const answerData = answerRes.ok ? await answerRes.json() : null;

    // Generate meta title and description
    const title = question?.question_title 
      ? `${question.question_title} - dRepWatch`
      : "dRepWatch – Cardano dRep Insights";
    
    const description = answerData?.answer
      ? `${question?.question_title} - ${answerData.answer.substring(0, 150)}...`
      : "Track and learn about Cardano dReps, their activity, and Q&A sessions.";

    // Generate preview image URL
    const previewImageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://drep.watch'}/api/preview/${id}`;

    return {
      props: {
        meta: {
          title,
          description,
          imageUrl: previewImageUrl,
          type: "article" as const
        }
      }
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    return { notFound: true };
  }
};

export default function AnswerPage({ meta }: { meta: MetaProps }) {
  return (
    <>
      <DynamicMetatags {...meta} />
      <Answer />
    </>
  );
}
