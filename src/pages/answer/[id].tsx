import Answer from "~/components/answer";
import DynamicMetatags from "~/components/dynamic-metatags";
import Layout from "~/layout";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { BASE_API_URL } from "~/data/api";

export default function AnswerPage() {
  const router = useRouter();
  const { id } = router.query;

  const { data: questionData } = useQuery({
    queryKey: ["question-data", id],
    queryFn: async () => {
      if (!id) return null;
      const questionRes = await fetch(`${BASE_API_URL}/api/v1/questions/${id}`);
      return questionRes.json();
    },
    enabled: !!id,
  });

  const { data: answerData } = useQuery({
    queryKey: ["answer-data", id],
    queryFn: async () => {
      if (!id) return null;
      const answerRes = await fetch(`${BASE_API_URL}/api/v1/answers/${id}`);
      return answerRes.json();
    },
    enabled: !!id,
  });

  const previewImageUrl = id ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/preview/${id}` : undefined;
  const title = questionData?.question?.question_title 
    ? `${questionData.question.question_title} - dRepWatch`
    : "dRepWatch – Cardano dRep Insights";
  
  const description = answerData?.answer?.answer
    ? `${questionData?.question?.question_title} - ${answerData.answer.answer.substring(0, 150)}...`
    : "Track and learn about Cardano dReps, their activity, and Q&A sessions.";

  return (
    <>
      <DynamicMetatags
        title={title}
        description={description}
        imageUrl={previewImageUrl}
        type="article"
      />
      <Answer />
    </>
  );
}
