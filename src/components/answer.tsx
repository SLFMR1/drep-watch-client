import { BsChatQuoteFill } from "react-icons/bs";
import { IoArrowBack } from "react-icons/io5";
import { FiShare } from "react-icons/fi";
import { motion } from "framer-motion";
import Image from "next/image";
import { MdContentCopy } from "react-icons/md";

import QueAnsCard from "./cards/que-ans";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { BASE_API_URL } from "~/data/api";
import type { Answer, Question } from "~/types";
import axios, { AxiosError } from "axios";
import LetterAvatar from "./letter-avatar";
import Link from "next/link";
import { getData, getDrepQuestions } from "~/server";
import Loader from "./loader";
import ErrorCard from "./cards/error";
import { useWallet } from "@meshsdk/react";
import { Transaction } from "@meshsdk/core";
import toast from "react-hot-toast";
import Masonry from "react-masonry-css";
import { useWalletStore } from "~/store/wallet";
import {
  Address,
  TransactionUnspentOutput,
  TransactionUnspentOutputs,
  TransactionOutput,
  Value,
  TransactionBuilder,
  TransactionBuilderConfigBuilder,
  LinearFee,
  BigNum,
  TransactionWitnessSet,
  Transaction as CTransaction,
  Credential,
  Certificate,
  PublicKey,
  RewardAddress,
  Ed25519KeyHash,
  CertificatesBuilder,
  VoteDelegation,
  DRep,
  Anchor,
  DRepRegistration,
  DRepUpdate,
  DRepDeregistration,
  VotingBuilder,
  Voter,
  GovernanceActionId,
  TransactionHash,
  VotingProcedure,
  VotingProposalBuilder,
  VotingProposal,
  NewConstitutionAction,
  Constitution,
  AnchorDataHash,
  URL,
  GovernanceAction,
  InfoAction,
  TreasuryWithdrawals,
  TreasuryWithdrawalsAction,
  UpdateCommitteeAction,
  Committee,
  UnitInterval,
  Credentials,
  NoConfidenceAction,
  ParameterChangeAction,
  ProtocolParamUpdate,
  HardForkInitiationAction,
  ProtocolVersion,
  ScriptHash,
  ChangeConfig,
  PlutusScript,
  PlutusWitness,
  PlutusScriptSource,
  Redeemer,
  RedeemerTag,
  ExUnits,
  PlutusData,
  PlutusMap,
  ExUnitPrices,
  PlutusScripts,
  Redeemers,
  Costmdls,
  CostModel,
  Language,
  Int,
  TxInputsBuilder,
} from "@emurgo/cardano-serialization-lib-asmjs";
import { useState } from "react";
import { buildSubmitConwayTx } from "~/core/delegateVote";
import { shareQuestionAnswer, extractXHandle, shareDrepProfile } from "~/utils/share";
import { type BrowserWallet } from '@meshsdk/core';

const protocolParams = {
  linearFee: {
    minFeeA: "44",
    minFeeB: "155381",
  },
  minUtxo: "1000000",
  poolDeposit: "500000000",
  keyDeposit: "2000000",
  maxValSize: 5000,
  maxTxSize: 16384,
  priceMem: 0.0577,
  priceStep: 0.0000721,
  coinsPerUTxOByte: "4310",
};

interface Reference {
  "@type": string;
  label: {
    "@value": string;
  } | string;
  uri: {
    "@value": string;
  } | string;
}

const Answer: React.FC = (): React.ReactNode => {
  const { query, back } = useRouter();

  const { connected, wallet, name } = useWallet();

  const { delegatedTo } = useWalletStore();

  // const [certBuilder, setCertBuilder] = useState<CertificatesBuilder | null>(
  //   null,
  // );

  const { data, error: err1 } = useQuery({
    queryKey: ["question-data", query.id],
    queryFn: async () => {
      try {
        const questionRes = await fetch(
          `${BASE_API_URL}/api/v1/questions/${query.id}`,
        );

        const question = (await questionRes.json()) as { question: Question };

        return {
          question: question.question,
        };
      } catch (error) {
        console.log(error);
        return null;
      }
    },
  });

  const { data: answerData, error } = useQuery({
    queryKey: ["answer-data", query.id],
    queryFn: async () => {
      try {
        const answerRes = await fetch(
          `${BASE_API_URL}/api/v1/answers/${query.id}`,
        );

        const answer = (await answerRes.json()) as Answer;

        return {
          answer,
        };
      } catch (error) {
        console.log(error);
        return null;
      }
    },
  });

  const fetchData = async () => {
    try {
      if (!data?.question.drep_id) return null; 

      let originalProfileData: any = {}; 
      try {
        const profileResponse = await axios.post(
          `${BASE_API_URL}/api/v1/drep/drep-profile`,
          { drep_id: data.question.drep_id },
        );
        originalProfileData = profileResponse.data || {};
         // Ensure baseline counts exist, even if 0, before attempting to overwrite
        originalProfileData.questionsAsked = originalProfileData.questionsAsked ?? 0;
        originalProfileData.questionsAnswers = originalProfileData.questionsAnswers ?? 0;
      } catch (profileError) {
        console.error("Error fetching from /drep-profile:", profileError);
        // Initialize with default structure if main profile fetch fails, to prevent undefined errors
        originalProfileData = { name: "Error Loading Name", questionsAsked: 0, questionsAnswers: 0, references: [] };
      }

      // 2. Fetch accurate counts from indexed search
      try {
        const countsResponse = await axios.get(
          `${BASE_API_URL}/api/v1/drep/indexed/search?query=${data.question.drep_id}`
        );

        if (countsResponse.data && Array.isArray(countsResponse.data) && countsResponse.data.length > 0) {
          const indexedDrepData = countsResponse.data[0];
          if (indexedDrepData) { // Check if indexedDrepData is not null/undefined
            originalProfileData.questionsAsked = indexedDrepData.questions_asked_count ?? originalProfileData.questionsAsked;
            originalProfileData.questionsAnswers = indexedDrepData.questions_answered_count ?? originalProfileData.questionsAnswers;
            // Preserve other fields from originalProfileData, like 'name' and 'references'
            // Only update counts if available from indexed source
            if (indexedDrepData.name && !originalProfileData.name) { // Populate name if missing
                 originalProfileData.name = indexedDrepData.name;
            }
            if (indexedDrepData.references && (!originalProfileData.references || originalProfileData.references.length === 0)) {
                originalProfileData.references = indexedDrepData.references;
            }
          }
        } else {
          console.log(`No indexed data found for DRep ID: ${data.question.drep_id}. Using counts from /drep-profile or defaults.`);
        }
      } catch (countsError) {
        console.error("Error fetching from /indexed/search:", countsError);
        // If counts fetch fails, we'll use whatever was in originalProfileData (or its defaults)
      }
      
      console.log("(Merged) Profile data with updated counts:", originalProfileData);
      return originalProfileData;

    } catch (error: unknown) { // General catch for the outer try
      console.error("Error in fetchData (outer):", error);
      // Return a default structure on general failure to ensure UI stability
      return { name: "Error Loading Profile", questionsAsked: 0, questionsAnswers: 0, references: [] };
    }
  };

  const { data: profileData, error: err2 } = useQuery({
    queryKey: ["drep-profile", data?.question.drep_id],
    queryFn: () => fetchData(),
    enabled: !!data?.question.drep_id,
  });

  const { isLoading, data: pageData } = useQuery({
    queryFn: () => data?.question.drep_id ? getDrepQuestions(data.question.drep_id) : null,
    queryKey: ["drep_questions", data?.question.drep_id],
    enabled: !!data?.question.drep_id,
  });

  const onDelegate = async () => {
    try {
      if (!connected) {
        toast.error("Please connect your wallet to delegate.");
        return;
      }

      const address = (await wallet.getRewardAddresses())[0];

      if (!address) {
        return;
      }

      const poolId = answerData?.answer.drep_id;

      if (!poolId) {
        toast.error("This question hasn't been answered yet. Cannot delegate.");
        return;
      }

      const txHash = await buildSubmitConwayTx(true, wallet as BrowserWallet, poolId);

      if (txHash) {
        toast.success(
          `Successfully delegated to ${answerData?.answer.drep_id}. Transaction Hash: ${txHash}`,
        );
      } else {
        throw new Error('Failed to delegate. Please try again.');
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
      console.log(error);
    }
  };

  const handleShare = () => {
    if (query.id && typeof query.id === 'string' && data?.question.question_title) {
      let xHandle: string | undefined = undefined;
      
      if (profileData?.references && profileData.references.length > 0) {
        const xRef = profileData.references.find((ref: Reference) => {
          const uri = typeof ref.uri === 'string' ? ref.uri : ref.uri["@value"];
          return uri && (uri.includes('twitter.com') || uri.includes('x.com'));
        });
        
        if (xRef) {
          const uri = typeof xRef.uri === 'string' ? xRef.uri : xRef.uri["@value"];
          const handle = extractXHandle(uri);
          if (handle) {
            xHandle = handle;
          }
        }
      }
      
      shareQuestionAnswer(
        query.id, 
        data.question.question_title, 
        data.question.drep_id,
        profileData?.name,
        xHandle
      );
    }
  };

  if (err1)
    return (
      <section className="flex w-full items-center justify-center pt-32">
        <ErrorCard />
      </section>
    );

  if (!data) {
    return (
      <section className="flex w-full flex-col gap-[40px] pb-20 pt-[150px] md:gap-[90px] md:pt-[190px]">
        <Loader />
      </section>
    );
  }

  return (
    <section className="flex w-full flex-col gap-[40px] pb-20 pt-[150px] md:gap-[90px] md:pt-[190px]">
      <div className="container mx-auto px-4 relative">
        <button 
          onClick={() => back()}
          className="absolute left-4 top-[-100px] md:top-[-130px] flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors cursor-pointer"
          aria-label="Go back"
        >
          <IoArrowBack className="text-gray-700 text-xl" />
        </button>
      
        {profileData ? (
          <div className="">
            <div className="relative flex items-center justify-center">
              <div className="absolute top-0 -translate-y-1/2 rounded-[10px] bg-primary-light px-5 py-3 font-ibm-mono text-xs text-primary md:text-[13px]">
                {profileData?.questionsAnswers}/{profileData?.questionsAsked}{" "}
                Question answered
              </div>

              <div className="flex w-[90%] flex-col items-center gap-6 rounded-xl border border-primary-light bg-white px-5  pb-7  pt-9 shadow-color md:w-auto md:flex-row ">
                <Link href={`/profile/${data?.question.drep_id}`} className="cursor-pointer">
                  <div>
                    <LetterAvatar
                      username={data?.question.drep_id}
                      dimension={130}
                      src={profileData?.image || undefined}
                    />
                  </div>
                </Link>
                <div className="flex flex-col items-center md:items-start">
                  <div className="flex items-center gap-1 max-w-xs overflow-hidden text-ellipsis text-center font-ibm-mono text-xs tracking-wide text-tertiary md:max-w-max md:text-left md:text-sm">
                    {/* Shorten dRep ID for mobile */}
                    {data?.question.drep_id && data?.question.drep_id.length > 12 ? (
                      <>
                        <span className="block md:hidden">
                          {data?.question.drep_id.slice(0, 7)}....{data?.question.drep_id.slice(-5)}
                        </span>
                        <span className="hidden md:block">
                          {data?.question.drep_id}
                        </span>
                      </>
                    ) : (
                      data?.question.drep_id ?? ""
                    )}
                    <button
                      onClick={() => {
                        if (!data?.question.drep_id) return;
                        navigator.clipboard.writeText(data.question.drep_id)
                          .then(() => toast.success("ID copied to clipboard"))
                          .catch(() => toast.error("Failed to copy"));
                      }}
                      className="text-gray-400 hover:text-primary transition-colors"
                      title="Copy full ID"
                    >
                      <MdContentCopy size={16} />
                    </button>
                  </div>
                  <Link href={`/profile/${data?.question.drep_id}`}>
                    <div className="cursor-pointer font-neue-regrade text-[36px] font-semibold text-black hover:underline">
                      {(profileData?.name && profileData.name !== "undefined" && profileData.name !== "null") 
                        ? profileData.name 
                        : `${data?.question.drep_id.slice(0, 16)}...`}
                    </div>
                  </Link>
                  <div className="mt-5 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2.5 w-full">
                    <div className="flex flex-row gap-2.5 w-full md:w-auto">
                      <Link
                        href={`/ask-question?to=${data?.question.drep_id}`}
                        className="flex flex-1 items-center gap-2.5 rounded-lg bg-gradient-to-b from-[#FFC896] from-[-47.73%] to-[#FB652B] to-[78.41%] px-4 py-2.5 text-white justify-center"
                      >
                        <BsChatQuoteFill className="text-[24px]" />
                        <div className="text-shadow font-inter text-xs font-medium md:text-sm ">
                          Ask question
                        </div>
                      </Link>
                      <motion.button
                        onClick={() => onDelegate()}
                        className="flex flex-1 items-center gap-2.5 rounded-lg bg-[#EAEAEA] px-4 py-2.5 text-secondary disabled:cursor-not-allowed disabled:opacity-65 justify-center"
                        whileHover={{ scaleX: 1.025 }}
                        whileTap={{ scaleX: 0.995 }}
                      >
                        <div className="font-inter text-xs font-medium md:text-sm ">
                          Delegate
                        </div>
                      </motion.button>
                    </div>
                    <motion.button
                      onClick={() => {
                        if (data?.question.drep_id) {
                          let xHandle: string | undefined = undefined;
                          if (profileData?.references && profileData.references.length > 0) {
                            const xRef = profileData.references.find((ref: Reference) => {
                              const uri = typeof ref.uri === 'string' ? ref.uri : ref.uri["@value"];
                              return uri && (uri.includes('twitter.com') || uri.includes('x.com'));
                            });
                            if (xRef) {
                              const uri = typeof xRef.uri === 'string' ? xRef.uri : xRef.uri["@value"];
                              const handle = extractXHandle(uri);
                              if (handle) {
                                xHandle = handle;
                              }
                            }
                          }
                          shareDrepProfile(data.question.drep_id, profileData?.name, xHandle);
                        }
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg bg-black px-3 py-2 text-white w-full max-w-[160px] mx-auto md:w-auto md:ml-2 md:px-4 md:py-2.5"
                      whileHover={{ scaleX: 1.025 }}
                      whileTap={{ scaleX: 0.995 }}
                    >
                      <FiShare className="text-[18px]" />
                      <div className="font-inter text-xs font-medium md:text-sm ">
                        Share
                      </div>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Loader />
        )}
      </div>

      {data && (
        <div className="flex w-full items-center justify-center bg-white px-[5%] py-7 pb-12 shadow-[-5px_0px_13px_0px_#0000001A]">
          <div className="flex w-full max-w-[1600px] flex-col gap-6 md:gap-10">
            <div>
              <QueAnsCard
                answer={answerData?.answer}
                asked_user={data?.question.wallet_address}
                question={data.question}
                large={true}
                id={query.id as string}
                drepXHandle={(() => {
                  // Extract X handle from profile references
                  if (profileData?.references && profileData.references.length > 0) {
                    const xRef = profileData.references.find((ref: Reference) => {
                      const uri = typeof ref.uri === 'string' ? ref.uri : ref.uri["@value"];
                      return uri && (uri.includes('twitter.com') || uri.includes('x.com'));
                    });
                    
                    if (xRef) {
                      const uri = typeof xRef.uri === 'string' ? xRef.uri : xRef.uri["@value"];
                      const handle = extractXHandle(uri);
                      if (handle) {
                        return handle;
                      }
                    }
                  }
                  return undefined;
                })()}
                drepImage={profileData?.image}
              />
            </div>

            <div className="flex w-full flex-col items-start justify-between gap-2 font-inter font-medium tracking-wide text-secondary-dark md:flex-row md:items-center ">
              <div className="text-base md:text-xl">
                Other questions for this dRep
              </div>
            </div>

            <div
              className={`${pageData && pageData.questionAnswers ? "w-full" : "flex w-full items-center"}`}
            >
              {pageData && pageData.questionAnswers ? (
                pageData.questions.filter(q => q.uuid !== query.id).length > 0 ? (
                  <Masonry
                    breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
                    className="masonry-grid"
                    columnClassName="masonry-column"
                  >
                    {pageData.questions
                      .filter(q => q.uuid !== query.id)
                      .map((question, i) => {
                        const answerIndex = pageData.answers.findIndex(a => a && a.uuid === question.uuid);
                        return (
                          <div key={i} className="masonry-item">
                            <QueAnsCard
                              asked_user={question.wallet_address}
                              question={question}
                              answer={answerIndex !== -1 ? pageData.answers[answerIndex] : undefined}
                              id={question.uuid}
                              drepXHandle={(() => {
                                if (profileData?.references && profileData.references.length > 0) {
                                  const xRef = profileData.references.find((ref: Reference) => {
                                    const uri = typeof ref.uri === 'string' ? ref.uri : ref.uri["@value"];
                                    return uri && (uri.includes('twitter.com') || uri.includes('x.com'));
                                  });
                                  
                                  if (xRef) {
                                    const uri = typeof xRef.uri === 'string' ? xRef.uri : xRef.uri["@value"];
                                    const handle = extractXHandle(uri);
                                    if (handle) {
                                      return handle;
                                    }
                                  }
                                }
                                return undefined;
                              })()}
                              drepImage={profileData?.image}
                            />
                          </div>
                        );
                      })}
                  </Masonry>
                ) : (
                  <div className="w-full text-center py-10 text-gray-500">
                    No other questions for this dRep yet
                  </div>
                )
              ) : (
                <Loader />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Answer;
