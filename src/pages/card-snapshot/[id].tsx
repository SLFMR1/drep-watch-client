import QueAnsCard from '~/components/cards/que-ans';
import { getDrepQuestions } from '~/server';
import { GetServerSideProps } from 'next';
import axios from 'axios';
import { BASE_API_URL } from '~/data/api';
import DynamicMetatags from '~/components/dynamic-metatags';
import Image from 'next/image';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { id } = ctx.query;
  if (!id || typeof id !== 'string') {
    return { notFound: true };
  }

  let question = null;
  let answer = null;
  let drepImage = undefined;
  let drepXHandle = undefined;
  let drepName = undefined;
  let asked_user = '';

  try {
    // Fetch question
    const questionRes = await fetch(`${BASE_API_URL}/api/v1/questions/${id}`);
    if (!questionRes.ok) return { notFound: true };
    const questionData = await questionRes.json();
    question = questionData.question;
    asked_user = question?.wallet_address || '';

    // Fetch answer
    const answerRes = await fetch(`${BASE_API_URL}/api/v1/answers/${id}`);
    if (answerRes.ok) {
      const answerData = await answerRes.json();
      answer = answerData;
    }

    // Fetch dRep image and name
    if (question?.drep_id) {
      try {
        const profileRes = await axios.post(`${BASE_API_URL}/api/v1/drep/drep-profile`, { drep_id: question.drep_id });
        if (profileRes.data) {
          drepImage = profileRes.data.image || undefined;
          drepName = profileRes.data.name || undefined;
          // Try to extract X handle from references
          if (profileRes.data.references && Array.isArray(profileRes.data.references)) {
            const xRef = profileRes.data.references.find((ref: any) => {
              const uri = typeof ref.uri === 'string' ? ref.uri : ref.uri["@value"];
              return uri && (uri.includes('twitter.com') || uri.includes('x.com'));
            });
            if (xRef) {
              const uri = typeof xRef.uri === 'string' ? xRef.uri : xRef.uri["@value"];
              drepXHandle = uri.split('/').pop();
            }
          }
        }
      } catch (error) {
        console.error('Error fetching dRep profile:', error);
      }
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return { notFound: true };
  }

  return {
    props: {
      question,
      answer,
      asked_user,
      drepXHandle,
      drepImage,
      drepName,
    },
  };
};

export default function CardSnapshot(props: any) {
  const { question, answer, drepName } = props;
  
  // Generate meta title and description
  const title = question?.question_title 
    ? `${question.question_title} - dRepWatch`
    : "dRepWatch – Cardano dRep Insights";
  
  const description = answer?.answer
    ? `${question?.question_title} - ${answer.answer.substring(0, 150)}...`
    : "Track and learn about Cardano dReps, their activity, and Q&A sessions.";

  // Generate preview image URL - only if we have a question ID
  const previewImageUrl = question?.id 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/preview/${question.id}`
    : undefined;

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#f5f5f5'
    }}>
      <DynamicMetatags
        title={title}
        description={description}
        imageUrl={previewImageUrl}
        type="article"
      />
      <div style={{
        width: 600,
        maxHeight: '90vh',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        position: 'relative'
      }} className="card-snapshot-root">
        <QueAnsCard 
          large 
          id={question?.id}
          question={{
            ...question,
            question_title: question?.question_title?.length > 100 
              ? `${question.question_title.substring(0, 100)}...` 
              : question?.question_title,
            question_description: question?.question_description?.length > 500
              ? `${question.question_description.substring(0, 500)}...`
              : question?.question_description
          }}
          answer={answer?.answer ? {
            ...answer,
            answer: answer.answer.length > 500
              ? `${answer.answer.substring(0, 500)}...`
              : answer.answer
          } : undefined}
          asked_user={props.asked_user}
          drepXHandle={props.drepXHandle}
          drepImage={props.drepImage}
          drepName={props.drepName}
        />
        <div style={{
          position: 'absolute',
          top: '18px',
          right: '18px',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}>
          <Image
            src="/assets/logo.svg"
            alt="dRepWatch"
            width={64}
            height={64}
            style={{
              objectFit: 'contain'
            }}
          />
        </div>
      </div>
    </div>
  );
}
