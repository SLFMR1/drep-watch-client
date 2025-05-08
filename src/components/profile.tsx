import { useState, useEffect } from "react";
import { BsChatQuoteFill } from "react-icons/bs";
import { IoArrowBack } from "react-icons/io5";
import { FiShare } from "react-icons/fi";
import { motion } from "framer-motion";
import { MdContentCopy } from "react-icons/md";
import toast from "react-hot-toast";

import QueAnsCard from "./cards/que-ans";
import Vote from "./cards/vote";

import {
  P_FILTER_TYPES,
  P_FILTERS,
  P_SMALL_WIDTHS,
  P_WIDTHS,
} from "~/constants";
import useDeviceType from "~/hooks/use-device-type";
import useInView from "~/hooks/use-in-view";
import axios, { AxiosError } from "axios";
import Link from "next/link";
import { BASE_API_URL } from "~/data/api";
import { useQuery } from "@tanstack/react-query";
import { getDrepQuestions, getDrepProposals, getUserQuestions } from "~/server";
import { useRouter } from "next/router";
import LetterAvatar from "./letter-avatar";
import ErrorCard from "./cards/error";
import { useWallet } from "@meshsdk/react";
import Masonry from "react-masonry-css";
import { useWalletStore } from "~/store/wallet";
import { buildSubmitConwayTx } from "~/core/delegateVote";
import { shareDrepProfile, extractXHandle } from "~/utils/share";
import { type BrowserWallet } from '@meshsdk/core';

interface Reference {
  "@type": string;
  label: {
    "@value": string;
  } | string;
  uri: {
    "@value": string;
  } | string;
}

interface ProfileData {
  questionsAsked: number;
  questionsAnswers: number;
  image?: string;
  name?: string;
  motivations?: string;
  objectives?: string;
  qualifications?: string;
  paymentAddress?: string;
  references?: Array<Reference>;
  drep_id?: string;
  voting_power?: string;
  votesYes?: number | null;
  votesNo?: number | null;
  votesAbstain?: number | null;
}

const Profile: React.FC = (): React.ReactNode => {
  const { query, back, replace } = useRouter();
  const { connected, wallet } = useWallet();
  const { delegatedTo } = useWalletStore();
  const [isDrepActive, setIsDrepActive] = useState<boolean>(true);

  const [active, setActive] = useState<number>(
    P_FILTER_TYPES.QUESTIONS_ANSWERS,
  );

  const [isFundsPopupVisible, setIsFundsPopupVisible] = useState({
    icon: false,
    popup: false,
  });

  const [selectedFund, setSelectedFund] = useState(12);

  const deviceType = useDeviceType();
  const { ref } = useInView();

  const getLeftOffset = (): string => {
    const ACTIVE_WIDTHS = deviceType === "mobile" ? P_SMALL_WIDTHS : P_WIDTHS;

    const activeKeys = Object.keys(ACTIVE_WIDTHS).slice(0, active - 1);
    const sum = activeKeys.reduce(
      (acc, key) => acc + parseInt(ACTIVE_WIDTHS[parseInt(key)]!, 10),
      0,
    );

    return `${sum}px`;
  };

  const getWidth = () => {
    const ACTIVE_WIDTHS = deviceType === "mobile" ? P_SMALL_WIDTHS : P_WIDTHS;
    return ACTIVE_WIDTHS[active];
  };

  const copyToClipboard = (text: string | undefined | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => toast.success("ID copied to clipboard"))
      .catch(() => toast.error("Failed to copy"));
  };

  useEffect(() => {
    const checkDrepStatus = async () => {
      if (query.id && typeof query.id === 'string' && query.id.startsWith("drep")) {
        try {
          const response = await axios.get(`${BASE_API_URL}/api/v1/drep/status/${query.id}`);
          setIsDrepActive(response.data.active);
        } catch (err) {
          console.error("Error checking dRep status:", err);
          setIsDrepActive(false);
        }
      }
    };
    
    checkDrepStatus();
  }, [query.id]);

  const { data: profileData, error: err1 } = useQuery<ProfileData, Error>({
    queryKey: ["drep-profile", query?.id],
    queryFn: async () => {
      const currentDrepId = query.id as string;
      if (!currentDrepId) {
        console.error("No DRep ID available for fetching profile data.");
        throw new Error("DRep ID is required to fetch profile data.");
      }

      let profileDetails: Partial<ProfileData> = {
        questionsAsked: 0,
        questionsAnswers: 0,
        references: [],
        votesYes: 0,
        votesNo: 0,
        votesAbstain: 0,
      };

      try {
        const profileResponse = await axios.post<ProfileData>(
          `${BASE_API_URL}/api/v1/drep/drep-profile`,
          { drep_id: currentDrepId },
        );
        if (profileResponse.data && typeof profileResponse.data === 'object') {
          profileDetails = { ...profileDetails, ...profileResponse.data };
          profileDetails.questionsAsked = Number(profileDetails.questionsAsked) || 0;
          profileDetails.questionsAnswers = Number(profileDetails.questionsAnswers) || 0;
        } else {
          console.warn(`No data or unexpected format from /drep-profile for ${currentDrepId}`);
        }
      } catch (error) {
        console.error(`Error fetching from /drep-profile for ${currentDrepId}:`, error);
        if (!profileDetails.name) profileDetails.name = "Error Loading Name";
      }

      try {
        const indexedResponse = await axios.get(
          `${BASE_API_URL}/api/v1/drep/indexed/search?query=${currentDrepId}`
        );

        if (indexedResponse.data && Array.isArray(indexedResponse.data) && indexedResponse.data.length > 0) {
          const indexedDrep = indexedResponse.data[0];
          
          profileDetails.questionsAsked = indexedDrep.questions_asked_count ?? profileDetails.questionsAsked;
          profileDetails.questionsAnswers = indexedDrep.questions_answered_count ?? profileDetails.questionsAnswers;
          profileDetails.drep_id = indexedDrep.drep_id ?? profileDetails.drep_id;
          profileDetails.voting_power = indexedDrep.voting_power?.toString() ?? profileDetails.voting_power;
          profileDetails.votesYes = (indexedDrep as any).vote_yes ?? profileDetails.votesYes;
          profileDetails.votesNo = (indexedDrep as any).vote_no ?? profileDetails.votesNo;
          profileDetails.votesAbstain = (indexedDrep as any).vote_abstain ?? profileDetails.votesAbstain;

          if (indexedDrep.name && (!profileDetails.name || profileDetails.name === "Error Loading Name")) {
            profileDetails.name = indexedDrep.name;
          }
          if (indexedDrep.image_url && !profileDetails.image) {
            profileDetails.image = indexedDrep.image_url;
          }
          if (indexedDrep.references && (!profileDetails.references || profileDetails.references.length === 0)) {
             profileDetails.references = indexedDrep.references;
          }
          
        } else {
          console.log(`No indexed data found for DRep ID: ${currentDrepId}. Counts might be from /drep-profile or default to 0.`);
        }
      } catch (error) {
        console.error(`Error fetching from /indexed/search for ${currentDrepId}:`, error);
      }
      
      console.log(`[profile.tsx] Merged profile data for ${currentDrepId}:`, profileDetails);
      return profileDetails as ProfileData;
    },
    enabled: !!query.id,
  });

  const {
    data: questions,
    error: err2,
    isLoading: isLoadingQuestions,
  } = useQuery({
    queryKey: ["profile-questions", query?.id],
    queryFn: () => {
      if (!query.id) return null;
      const id = query.id as string;
      
      if (id.startsWith("drep")) {
        return getDrepQuestions(id);
      } else if (id.startsWith("stake")) {
        return getUserQuestions(id);
      }
      return null;
    },
    enabled: !!query.id,
  });

  const {
    data: proposals,
    error: err3,
    isLoading: isLoadingProposals,
  } = useQuery({
    queryKey: ["drep-profile-proposals", query?.id],
    queryFn: () => (query.id ? getDrepProposals(query?.id as string) : null),
    enabled: !!query.id,
  });

  // Define the canonical DRep ID to use throughout the component
  const canonicalDrepId = profileData?.drep_id ?? (query.id as string | undefined);
  const queriedDrepId = query.id as string | undefined;
  const isIdMismatch = canonicalDrepId && queriedDrepId && canonicalDrepId !== queriedDrepId;

  // useEffect hook to redirect if the canonical ID differs from the queried ID
  // Moved after variable declarations to fix linter errors
  useEffect(() => {
    if (profileData && canonicalDrepId && queriedDrepId && canonicalDrepId !== queriedDrepId) {
      console.log(`[Profile Component] ID mismatch detected. Replacing URL from ${queriedDrepId} to ${canonicalDrepId}`);
      replace(`/profile/${canonicalDrepId}`, undefined, { shallow: true });
    }
    // Depend on the fetched profileData (which contains the canonical ID) and the query ID
  }, [profileData, canonicalDrepId, queriedDrepId, replace]);

  if (query?.id && err1) {
    console.error("Error loading profile:", err1);
    return (
      <section className="flex w-full items-center justify-center pt-32">
        <ErrorCard message="Failed to load dRep profile. Please try again later." />
      </section>
    );
  }

  if (!query?.id) {
    return (
      <section className="flex w-full items-center justify-center pt-32">
        <ErrorCard message="No dRep ID specified. Please check the URL." />
      </section>
    );
  }

  const handleShare = () => {
    if (canonicalDrepId && profileData) {
      let xHandle: string | undefined = undefined;
      if (profileData.references && profileData.references.length > 0) {
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
      shareDrepProfile(canonicalDrepId, profileData.name, xHandle);
    }
  };

  const onDelegate = async () => {
    try {
      if (!connected) {
        toast.error("Please connect your wallet to delegate.");
        return;
      }

      if (!isDrepActive) {
        toast.error("Cannot delegate to an inactive dRep.");
        return;
      }

      const address = (await wallet.getRewardAddresses())[0];

      if (!address || !canonicalDrepId) {
        toast.error("Required information for delegation is missing.");
        return;
      }

      const txHash = await buildSubmitConwayTx(true, wallet as BrowserWallet, canonicalDrepId);

      if (txHash) {
        toast.success(
          `Successfully delegated to ${profileData?.name || canonicalDrepId}. Transaction Hash: ${txHash}`,
        );
      } else {
        throw new Error('Failed to delegate. Please try again.');
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
      console.log("Delegation error:", error);
    }
  };

  return (
    <section className="flex w-full flex-col gap-[40px] pb-20 pt-[150px] md:gap-[90px] md:pt-[190px]">
      <div className="container mx-auto px-4 relative">
        <button 
          onClick={() => back()}
          className="absolute left-4 top-[-100px] md:top-[-130px] flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
          aria-label="Go back"
        >
          <IoArrowBack className="text-gray-700 text-xl" />
        </button>
        
        <div className="relative flex items-center justify-center">
          <div className="absolute top-0 -translate-y-1/2 rounded-[10px] bg-primary-light px-5 py-3 font-ibm-mono text-xs text-primary md:text-[13px]">
            {profileData?.questionsAnswers}/{profileData?.questionsAsked}{" "}
            Question answered
          </div>

          <div className="flex w-[90%] flex-col items-center gap-6 rounded-xl border border-primary-light bg-white px-5 pb-7 pt-9 shadow-color md:w-auto md:flex-row">
            <div className="relative">
              <LetterAvatar
                rounded
                username={profileData?.name && profileData.name !== "undefined" && profileData.name !== "null" 
                  ? profileData.name 
                  : (canonicalDrepId as string)}
                dimension={130}
                src={profileData?.image}
              />
              {canonicalDrepId && canonicalDrepId.startsWith("drep") && (
                <div className={`absolute -top-3 -right-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isDrepActive 
                    ? "bg-green-100 text-green-800 border border-green-200" 
                    : "bg-red-100 text-red-800 border border-red-200"
                }`}>
                  {isDrepActive ? "Active" : "Inactive"}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1 justify-center md:justify-start">
                <div className="w-auto overflow-hidden text-ellipsis text-center font-ibm-mono text-xs tracking-wide text-tertiary md:text-left md:text-sm">
                  {canonicalDrepId ?? ""}
                </div>
                <button 
                  onClick={() => copyToClipboard(canonicalDrepId)}
                  className="text-gray-400 hover:text-primary transition-colors"
                  title="Copy full ID"
                >
                  <MdContentCopy size={16} />
                </button>
              </div>
              {/* Voting Power Display */}
              {profileData?.voting_power && (
                    <p className="pt-1 text-sm text-grey-100">
                      Voting Power: {(parseInt(profileData.voting_power) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₳
                    </p>
                  )}
                  {/* End Voting Power Display */}
              <div className="text-center font-neue-regrade text-[36px] font-semibold text-black md:text-start">
                {profileData?.name ?? `${canonicalDrepId?.slice(0, 16) ?? ''}...`}
              </div>
              
              {isIdMismatch && (
                <div className="mt-2 text-center md:text-left text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                  Note: You searched for <code>{queriedDrepId}</code>, which is associated with the current canonical ID <code>{canonicalDrepId}</code>.
                </div>
              )}
              
              <div className="mt-5 flex items-center justify-center md:justify-start gap-2.5">
                {canonicalDrepId && canonicalDrepId.startsWith("drep") && (
                  <>
                    <Link
                      href={isDrepActive ? `/ask-question?to=${canonicalDrepId}` : "#"}
                      onClick={(e) => !isDrepActive && e.preventDefault()}
                      className={`flex items-center gap-2.5 rounded-lg px-4 py-2.5 ${
                        isDrepActive 
                          ? "bg-gradient-to-b from-[#FFC896] from-[-47.73%] to-[#FB652B] to-[78.41%] text-white" 
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      <BsChatQuoteFill className="text-[24px]" />
                      <div className="text-shadow font-inter text-xs font-medium md:text-sm">
                        {isDrepActive ? "Ask question" : "Inactive dRep"}
                      </div>
                    </Link>

                    <motion.button
                      className={`flex items-center gap-2.5 rounded-lg px-4 py-2.5 ${
                        isDrepActive 
                          ? "bg-[#EAEAEA] text-secondary" 
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                      whileHover={isDrepActive ? { scaleX: 1.025 } : undefined}
                      whileTap={isDrepActive ? { scaleX: 0.995 } : undefined}
                      onClick={onDelegate}
                      disabled={!isDrepActive}
                    >
                      <div className="font-inter text-xs font-medium md:text-sm">
                        Delegate
                      </div>
                    </motion.button>
                    
                    <motion.button
                      className="flex items-center gap-2.5 rounded-lg bg-black px-4 py-2.5 text-white"
                      whileHover={{ scaleX: 1.025 }}
                      whileTap={{ scaleX: 0.995 }}
                      onClick={handleShare}
                    >
                      <FiShare className="text-[18px]" />
                      <div className="font-inter text-xs font-medium md:text-sm">
                        Share
                      </div>
                    </motion.button>
                  </>
                )}
                
                {canonicalDrepId && !canonicalDrepId.startsWith("drep") && (
                  <motion.button
                    className="flex items-center gap-2.5 rounded-lg bg-black px-4 py-2.5 text-white"
                    whileHover={{ scaleX: 1.025 }}
                    whileTap={{ scaleX: 0.995 }}
                    onClick={handleShare}
                  >
                    <FiShare className="text-[18px]" />
                    <div className="font-inter text-xs font-medium md:text-sm">
                      Share
                    </div>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Drep Metadata Section - Only display for dReps, not for delegators */}
        {canonicalDrepId && canonicalDrepId.startsWith("drep") && (
          <div className="mt-12 flex justify-center">
            <div className="w-[70%] rounded-xl border border-primary-light bg-white p-6 shadow-color md:w-[70%] md:px-8 md:py-7">
              <h2 className="mb-6 font-neue-regrade text-xl font-semibold text-black border-b border-primary-light pb-3">
                Profile Information
                {!isDrepActive && (
                  <span className="ml-3 text-sm font-normal text-red-500">(Inactive dRep)</span>
                )}
              </h2>
              
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-lg hover:shadow-sm transition-shadow">
                  <h3 className="font-ibm-mono text-sm font-semibold text-tertiary border-b border-gray-200 pb-2">Objectives</h3>
                  {profileData?.objectives ? (
                    <p className="font-inter text-sm text-secondary pt-1">{profileData.objectives}</p>
                  ) : (
                    <p className="font-inter text-sm text-gray-400 italic pt-1">No objectives provided by the dRep during registration.</p>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-lg hover:shadow-sm transition-shadow">
                  <h3 className="font-ibm-mono text-sm font-semibold text-tertiary border-b border-gray-200 pb-2">Motivations</h3>
                  {profileData?.motivations ? (
                    <p className="font-inter text-sm text-secondary pt-1">{profileData.motivations}</p>
                  ) : (
                    <p className="font-inter text-sm text-gray-400 italic pt-1">No motivations provided by the dRep during registration.</p>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex flex-col gap-2 bg-gray-50 p-4 rounded-lg hover:shadow-sm transition-shadow">
                <h3 className="font-ibm-mono text-sm font-semibold text-tertiary border-b border-gray-200 pb-2">Qualifications</h3>
                {profileData?.qualifications ? (
                  <div className="font-inter text-sm text-secondary whitespace-pre-line pt-1">{profileData.qualifications}</div>
                ) : (
                  <p className="font-inter text-sm text-gray-400 italic pt-1">No qualifications provided by the dRep during registration.</p>
                )}
              </div>
              
              <div className="mt-6 flex flex-col gap-2">
                <h3 className="font-ibm-mono text-sm font-semibold text-tertiary border-b border-gray-200 pb-2">References</h3>
                {profileData?.references && profileData.references.length > 0 ? (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {(() => {
                      console.log("Rendering references:", JSON.stringify(profileData.references, null, 2));
                      return null;
                    })()}
                    {profileData.references.map((ref, index) => (
                      <a 
                        key={index}
                        href={typeof ref.uri === 'string' ? ref.uri : ref.uri["@value"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAEAEA] px-3 py-2 font-inter text-xs text-secondary transition-all hover:bg-primary-light hover:shadow-sm cursor-pointer"
                      >
                        {typeof ref.label === 'string' ? ref.label : ref.label["@value"]}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="font-inter text-sm text-gray-400 italic pt-1">No references provided by the dRep during registration.</p>
                )}
              </div>
              
              <div className="mt-6 flex flex-col gap-2">
                <h3 className="font-ibm-mono text-sm font-semibold text-tertiary border-b border-gray-200 pb-2">Payment Address</h3>
                {profileData?.paymentAddress ? (
                  <div className="font-ibm-mono text-xs text-tertiary break-all bg-gray-50 p-3 rounded-lg mt-1">
                    {profileData.paymentAddress}
                  </div>
                ) : (
                  <p className="font-inter text-sm text-gray-400 italic pt-1">No payment address provided by the dRep during registration.</p>
                )}
              </div>

              {/* Vote Counts Section */}
              <div className="mt-6 flex flex-col gap-2">
                <h3 className="font-ibm-mono text-sm font-semibold text-tertiary border-b border-gray-200 pb-2">Voting Record</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="flex flex-col items-center justify-center bg-gray-50 p-3 rounded-lg hover:shadow-sm transition-shadow">
                    <span className="font-neue-regrade text-2xl font-semibold text-green-600">{profileData?.votesYes ?? 0}</span>
                    <span className="font-inter text-xs text-tertiary mt-1">Yes Votes</span>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-gray-50 p-3 rounded-lg hover:shadow-sm transition-shadow">
                    <span className="font-neue-regrade text-2xl font-semibold text-red-600">{profileData?.votesNo ?? 0}</span>
                    <span className="font-inter text-xs text-tertiary mt-1">No Votes</span>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-gray-50 p-3 rounded-lg hover:shadow-sm transition-shadow">
                    <span className="font-neue-regrade text-2xl font-semibold text-gray-600">{profileData?.votesAbstain ?? 0}</span>
                    <span className="font-inter text-xs text-tertiary mt-1">Abstain Votes</span>
                  </div>
                </div>
              </div>
              {/* End Vote Counts Section */}

            </div>
          </div>
        )}
      </div>
      
      <div className="flex w-full items-center justify-center bg-white px-[5%] py-7 pb-12 shadow-[-5px_0px_13px_0px_#0000001A]">
        <div
          ref={ref}
          className="flex w-full max-w-[1600px] flex-col gap-6 md:gap-10"
        >
          <div className="flex w-full flex-col items-start justify-between gap-2 font-inter font-medium tracking-wide text-secondary-dark md:flex-row md:items-center ">
            {/* Different Funds */}
            <div className="flex items-center gap-x-4">
              <div className="text-base md:text-xl">
                {active === P_FILTER_TYPES.QUESTIONS_ANSWERS
                  ? canonicalDrepId && canonicalDrepId.startsWith("drep")
                    ? "Questions and answers"
                    : "Questions asked by this user"
                  : "Voting Records:"}{" "}
              </div>
              
              {/* Only show for inactive dReps */}
              {canonicalDrepId && canonicalDrepId.startsWith("drep") && !isDrepActive && (
                <div className="text-xs text-red-500 bg-red-50 py-1 px-2 rounded-lg">
                  Inactive dRep - No longer accepting questions
                </div>
              )}
            </div>

            <motion.div
              className="rounded-lg p-1.5 text-xs text-tertiary md:text-sm"
              initial={{ backgroundColor: "transparent", opacity: 0 }}
              whileInView={{ backgroundColor: "#EAEAEA", opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.75, duration: 0.5 }}
            >
              <div className="relative flex  ">
                {P_FILTERS.filter(filter => 
                  // Only show voting tab for dRep profiles
                  !(filter.type === P_FILTER_TYPES.VOTES && canonicalDrepId && !canonicalDrepId.startsWith("drep"))
                ).map((filter, i) => (
                  <motion.div
                    key={filter.type}
                    className={`relative z-[1] px-2 py-1.5 ${active === filter.type ? "text-black " : "text-tertiary"} cursor-pointer hover:text-secondary `}
                    onClick={() => setActive(filter.type)}
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1 + i * 0.1, duration: 0.5 }}
                  >
                    {filter.label}
                  </motion.div>
                ))}

                <motion.div
                  className="absolute bottom-0 left-0 top-0 z-0 h-full rounded-md bg-white mix-blend-overlay shadow-md transition-[left_200ms,width_200ms]"
                  style={{ left: getLeftOffset(), width: getWidth() }}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.25, duration: 0.5 }}
                />
              </div>
            </motion.div>
          </div>

          {active === P_FILTER_TYPES.QUESTIONS_ANSWERS && (
            <div className="w-full">
              {questions?.questions ? (
                questions.questions.length > 0 ? (
                  <Masonry
                    breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
                    className="masonry-grid"
                    columnClassName="masonry-column"
                  >
                    {questions.questions.map((question, i) => (
                      <div key={i} className="masonry-item">
                        <QueAnsCard
                          asked_user={question.wallet_address}
                          question={question}
                          answer={questions.answers[i]}
                          id={question.uuid}
                        />
                      </div>
                    ))}
                  </Masonry>
                ) : (
                  <div className="w-full text-center text-sm text-gray-500">
                    {isLoadingQuestions ? "Loading..." : "No results to show"}
                  </div>
                )
              ) : null}
              
              {/* Display message about inactive status if relevant */}
              {canonicalDrepId && 
                canonicalDrepId.startsWith("drep") && 
                !isDrepActive && 
                questions?.questions?.length === 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-gray-600">This dRep is currently inactive and cannot answer new questions.</p>
                </div>
              )}
            </div>
          )}

          {active === P_FILTER_TYPES.VOTES &&
            (() => {
              console.log('[Votes Render] Active Tab:', active === P_FILTER_TYPES.VOTES);
              console.log('[Votes Render] proposals object:', proposals);
              console.log('[Votes Render] proposals.proposals:', proposals?.proposals);
              console.log('[Votes Render] proposals.proposals.length:', proposals?.proposals?.length);
              const conditionMet = !!(proposals && proposals.proposals && proposals.proposals.length > 0);
              console.log('[Votes Render] Condition (proposals && proposals.proposals.length > 0):', conditionMet);
              console.log('[Votes Render] isLoadingProposals:', isLoadingProposals);

              if (conditionMet) {
                console.log('[Votes Render] Rendering proposals grid...');
                return (
                  <Masonry
                    breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
                    className="masonry-grid"
                    columnClassName="masonry-column"
                  >
                    {proposals.proposals.map((proposalItem, i) => {
                      console.log(`[Votes Render] Mapping item ${i}:`, proposalItem);
                      if (!proposalItem || typeof proposalItem.title === 'undefined' || typeof proposalItem.vote === 'undefined') {
                         console.error(`[Votes Render] Invalid proposal item at index ${i}:`, proposalItem);
                         return <div key={i} className="p-2 border border-red-500 text-red-700 rounded masonry-item">Invalid proposal data at index {i}</div>;
                      }
                      return (
                        <div key={i} className="masonry-item">
                          <Vote 
                            title={proposalItem.title} 
                            vote={proposalItem.vote} 
                            abstract={proposalItem.abstract} 
                            motivation={proposalItem.motivation} 
                            rationale={proposalItem.rationale} 
                          />
                        </div>
                      );
                    })}
                  </Masonry>
                );
              } else {
                console.log('[Votes Render] Rendering fallback (Loading or No Votes)...');
                return (
                  <div className="w-full text-center text-sm text-tertiary">
                    {isLoadingProposals ? "Loading..." : (
                      <>
                        No votes to show
                        {canonicalDrepId && canonicalDrepId.startsWith("drep") && !isDrepActive && (
                          <p className="mt-2 text-red-500">This dRep is currently inactive and cannot participate in voting.</p>
                        )}
                      </>
                    )}
                  </div>
                );
              }
            })()
          }
        </div>
      </div>
    </section>
  );
};

export default Profile;
