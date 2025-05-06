import axios from "axios";
import { FILTER_TYPES } from "~/constants";
import { BASE_API_URL } from "~/data/api";
import { Answer, Drep, Proposal, Question } from "~/types";

// Define the expected response structure from the proposals endpoint
interface DrepProposalsResponse {
  proposals: Proposal[];
  message?: string; // Optional message for errors etc.
}

async function getDreps(page: number): Promise<{
  dreps: Drep[];
  questionAnswers: false;
  nextPage: number | null;
}> {
  const { data } = await axios.get<{
    dreps: {
      drep_id: string;
      givenName: string | null;
      image: string | null;
      active?: boolean;
    }[];
    nextPage: number | null;
  }>(`${BASE_API_URL}/api/v1/drep?page=${page}`);

  const drepsWithMetrics = await Promise.all(
    data.dreps.map(async (drep) => {
      try {
        const questionsRes = await fetch(
          `${BASE_API_URL}/api/v1/questions?drep_id=${drep.drep_id}`,
        );
        const questions = (await questionsRes.json()) as Question[];

        const answers = await Promise.all(
          questions.map((question) =>
            fetch(`${BASE_API_URL}/api/v1/answers/${question.uuid}`)
              .then((data) => data.json() as Promise<Answer>)
              .catch(() => undefined),
          ),
        );

        let activeStatus = drep.active;
        if (activeStatus === undefined) {
          try {
            const activeRes = await axios.get<{
              active: boolean;
            }>(`${BASE_API_URL}/api/v1/drep/status/${drep.drep_id}`);
            activeStatus = activeRes.data.active;
          } catch (err) {
            console.error(`Error fetching active status for ${drep.drep_id}:`, err);
            activeStatus = false;
          }
        }

        const questionsAsked = questions.length;
        const questionsAnswers = answers.filter(answer => answer !== undefined).length;

        return {
          ...drep,
          questionsAsked,
          questionsAnswers,
          active: activeStatus
        };
      } catch (error) {
        console.error(`Error fetching metrics for DREP ${drep.drep_id}:`, error);
        return {
          ...drep,
          questionsAsked: 0,
          questionsAnswers: 0,
          active: false
        };
      }
    })
  );

  return {
    dreps: drepsWithMetrics,
    nextPage: data.nextPage,
    questionAnswers: false,
  };
}

async function getLatestQuestions(): Promise<{
  answers: (Answer | undefined)[];
  questionAnswers: true;
  questions: Question[];
  nextPage: number | null;
}> {
  const res = await fetch(`${BASE_API_URL}/api/v1/questions/latest`);
  const resJson = (await res.json()) as { questions: Question[] };
  console.log(resJson.questions, "fdasdfasf");
  const questionIds = await Promise.all(
    resJson.questions.map((question) =>
      fetch(`${BASE_API_URL}/api/v1/answers/${question.uuid}`),
    ),
  );
  const answers = (await Promise.all(
    questionIds.map((questionId) => questionId.json()),
  )) as Answer[];

  // console.log("GET LATEST QUESTIONS CALLED")
  return {
    answers: answers,
    questionAnswers: true,
    questions: resJson.questions,
    nextPage: null,
  };
}

async function getUserQuestions(wallet_address: string): Promise<{
  answers: (Answer | undefined)[];
  questionAnswers: true;
  questions: Question[];
}> {
  const res = await fetch(
    `${BASE_API_URL}/api/v1/questions?wallet_address=${wallet_address}`,
  );
  const questions = (await res.json()) as Question[];
  const questionIds = await Promise.all(
    questions.map((question) =>
      fetch(`${BASE_API_URL}/api/v1/answers/${question.uuid}`),
    ),
  );
  const answers = (await Promise.all(
    questionIds.map((questionId) => questionId.json()),
  )) as Answer[];

  // console.log("GET LATEST QUESTIONS CALLED")
  return {
    answers: answers,
    questionAnswers: true,
    questions: questions,
  };
}

async function getLatestAnswers(): Promise<{
  answers: Answer[];
  questionAnswers: true;
  questions: Question[];
  nextPage: number | null;
}> {
  const res = await fetch(`${BASE_API_URL}/api/v1/answers?latest=true`);
  const resJson = (await res.json()) as { answers: Answer[] };
  // console.log(resJson.answers)
  const questionsRes = await Promise.all(
    resJson.answers.map((ans) =>
      fetch(`${BASE_API_URL}/api/v1/questions/${ans.uuid}`),
    ),
  );
  const questions = (await Promise.all(
    questionsRes.map((el) => el.json()),
  )) as { question: Question }[];
  // console.log("GET LATEST ANSWERS CALLED")
  return {
    answers: resJson.answers,
    questionAnswers: true,
    questions: questions.map((el) => el.question),
    nextPage: null,
  };
}

async function getDrepQuestions(drep_id: string): Promise<
  | {
      answers: (Answer | undefined)[];
      questionAnswers: true;
      questions: Question[];
    }
  | undefined
> {
  try {
    const res = await fetch(
      `${BASE_API_URL}/api/v1/questions?drep_id=${drep_id}`,
    );
    const questions = (await res.json()) as Question[];
    // console.log(questions, "resJson");

    // console.log(resJson.questions)
    const answers = await Promise.all(
      questions.map((question) =>
        fetch(`${BASE_API_URL}/api/v1/answers/${question.uuid}`)
          .then((data) => data.json() as Promise<Answer>)
          .catch((e) => undefined),
      ),
    );

    if (!answers) {
      return;
    }

    return {
      answers,
      questionAnswers: true,
      questions,
    };
  } catch (error) {
    console.log(error);
  }
}

async function getDrepProposals(drep_id: string): Promise<DrepProposalsResponse | undefined> {
  try {
    // Specify the expected response type for the axios call
    const res = await axios.get<DrepProposalsResponse>(
      `${BASE_API_URL}/api/v1/drep/proposals/${drep_id}`,
    );
    // The backend already returns { proposals: [...] }, so return res.data directly.
    return res.data;
  } catch (error) {
    console.error(`Error fetching DREP proposals for ${drep_id}:`, error);
    // Return undefined or handle error as appropriate for tanstack-query
    return undefined; 
  }
}

async function getData(activeNum: number, page: number) {
  if (activeNum === FILTER_TYPES.LATEST_QUESTIONS) return getLatestQuestions();
  else if (activeNum === FILTER_TYPES.EXPLORE_DREPS) return getDreps(page);
  else return getLatestAnswers();
}

export {
  getDreps,
  getLatestQuestions,
  getLatestAnswers,
  getData,
  getDrepQuestions,
  getUserQuestions,
  getDrepProposals,
};
