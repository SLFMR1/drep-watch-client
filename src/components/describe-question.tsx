import { type ChangeEvent, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import axios, { AxiosError } from "axios";
import User from "./user";
import { BASE_API_URL } from "~/data/api";
import { useRouter } from "next/router";
import { useWalletStore } from "~/store/wallet";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useWallet } from "@meshsdk/react";
import Loader from "./loader";
import ErrorCard from "./cards/error";

interface QuestionsProps {
  question: {
    theme: string;
    question_title: string;
    question_description: string;
  };
}

const Questions = (): React.ReactNode => {
  const { query, push, back } = useRouter();
  const [quesData, setQuesData] = useState({
    question_description: "",
    question_title: "",
    theme: "",
  });

  const [preview, setPreview] = useState<boolean>(false);

  const { stake_address } = useWalletStore();

  const { connected } = useWallet();

  const [loading, setLoading] = useState<boolean>(false);

  const handleInputChange = (fieldName: string, value: string) => {
    setQuesData((prevState) => ({
      ...prevState,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async () => {
    console.log(query);
    setLoading(true);
    try {
      if (!stake_address || stake_address.length === 0) {
        toast.error(
          "Please try connecting wallet again and submit the question!",
        );
        return;
      }
      const response = await axios.post(
        `${BASE_API_URL}/api/v1/questions/ask-question`,
        { drep_id: query.to, ...quesData, wallet_address: stake_address },
      );
      console.log(response.data);
      toast.success("Submitted Successfully");
      void push("/my-questions");
    } catch (error: unknown) {
      if (
        error instanceof AxiosError &&
        error.response &&
        error.response.data
      ) {
        toast.error("Failed to submit question");
        const responseData = error.response.data;
        console.log(responseData);
      }
      console.log(error);
    }
    setLoading(false);
  };

  const handleNextButtonClick = () => {
    if (!connected) {
      toast.error("Please connect your wallet to submit.");
    }
    const { theme, question_title, question_description } = quesData;
    if (theme && question_title && question_description && connected) {
      setPreview(true);
    }
  };

  const fetchData = async () => {
    const drepId = query.to as string;
    if (!drepId) {
      console.error("No DRep ID (query.to) available for fetching profile data in describe-question.");
      // Return a default structure or throw an error, ensuring the hook expects this outcome
      return {
        name: "DRep ID missing",
        questionsAsked: 0,
        questionsAnswers: 0,
        image: undefined,
        // Initialize other fields expected by the User component if necessary
      };
    }

    let profileDetails: any = {
      questionsAsked: 0,
      questionsAnswers: 0,
    };

    try {
      // 1. Fetch primary profile data
      const profileResponse = await axios.post(
        `${BASE_API_URL}/api/v1/drep/drep-profile`,
        { drep_id: drepId },
      );
      if (profileResponse.data && typeof profileResponse.data === 'object') {
        profileDetails = { ...profileDetails, ...profileResponse.data };
        profileDetails.questionsAsked = Number(profileDetails.questionsAsked) || 0;
        profileDetails.questionsAnswers = Number(profileDetails.questionsAnswers) || 0;
      } else {
        console.warn(`No data or unexpected format from /drep-profile for ${drepId} in describe-question.`);
      }
    } catch (error) {
      console.error(`Error fetching from /drep-profile for ${drepId} in describe-question:`, error);
      if (!profileDetails.name) profileDetails.name = "Error Loading Name";
    }

    try {
      // 2. Fetch data from indexed source for accurate counts and potentially other details
      const indexedResponse = await axios.get(
        `${BASE_API_URL}/api/v1/drep/indexed/search?query=${drepId}`
      );

      if (indexedResponse.data && Array.isArray(indexedResponse.data) && indexedResponse.data.length > 0) {
        const indexedDrep = indexedResponse.data[0];
        
        profileDetails.questionsAsked = indexedDrep.questions_asked_count ?? profileDetails.questionsAsked;
        profileDetails.questionsAnswers = indexedDrep.questions_answered_count ?? profileDetails.questionsAnswers;

        if (indexedDrep.name && (!profileDetails.name || profileDetails.name === "Error Loading Name")) {
          profileDetails.name = indexedDrep.name;
        }
        if (indexedDrep.image_url && !profileDetails.image) {
          profileDetails.image = indexedDrep.image_url;
        }
        // Add other fields like references if your User component uses them
      } else {
        console.log(`No indexed data found for DRep ID: ${drepId} in describe-question. Using existing or default counts.`);
      }
    } catch (error) {
      console.error(`Error fetching from /indexed/search for ${drepId} in describe-question:`, error);
    }
    
    console.log(`[describe-question.tsx] Merged profile data for ${drepId}:`, profileDetails);
    // Ensure the returned object matches the expected type for profileData
    // Explicitly define the return type if needed by the useQuery hook
    return profileDetails as {
      questionsAsked: number;
      questionsAnswers: number;
      image?: string;
      name?: string;
    };
  };

  const {
    data: profileData,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["drep-profile", query.to],
    queryFn: () => fetchData(),
  });

  // Form submission handler
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission
    if (preview) {
      void handleSubmit(); // Use existing submit logic in preview mode
    } else {
      handleNextButtonClick(); // Use existing next logic when not previewing
    }
  };

  if (query.to && error)
    return (
      <section className="flex w-full items-center justify-center pt-32">
        <ErrorCard />
      </section>
    );

  if (isLoading)
    return (
      <section className="flex w-full flex-col gap-[40px] pb-20 pt-[150px] md:gap-[90px] md:pt-[190px]">
        <Loader />
      </section>
    );

  return (
    <div className="flex w-full max-w-[1318px] flex-col gap-4 rounded-xl bg-[#FAFAFA] shadow lg:flex-row lg:pr-12">
      <div className="flex-[2_2_0%] py-12 lg:border-r lg:border-brd-clr">
        <div className="flex items-center gap-4 pl-6 md:pl-12">
          <div>
            <motion.button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary-light text-tertiary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={back}
            >
              <LeftArrow />
            </motion.button>
          </div>

          <h1 className="font-inter text-base font-semibold md:text-xl">
            {preview ? "Preview" : "Describe your question"}
          </h1>
        </div>

        {profileData && (
          <div className="flex flex-1 items-center justify-center pt-8 md:hidden lg:pb-0">
            <User
              user={{
                img: profileData?.image ?? "/assets/ask-questions/user.png",
                name: profileData?.name ?? `dRep ${query.to?.toString().slice(0,10)}...`,
                questionsAnswers: profileData?.questionsAnswers ?? 0,
                questionsAsked: profileData?.questionsAsked ?? 0,
                walletId: query.to as string ?? "",
              }}
            />
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="flex flex-col h-full">
          <div className="mt-12 flex flex-col gap-6 px-6 md:px-12 flex-grow">
            <TitleAndInput
              index={1}
              value={quesData.theme}
              title="Theme"
              inputPlaceholder=""
              onChange={(value: string) => handleInputChange("theme", value)}
              preview={preview}
            />
            <TitleAndInput
              index={2}
              value={quesData.question_title}
              title="Question Title"
              onChange={(value: string) =>
                handleInputChange("question_title", value)
              }
              inputPlaceholder=""
              preview={preview}
            />
            <TitleAndInput
              textArea={true}
              index={3}
              value={quesData.question_description}
              title="Question Description"
              inputPlaceholder=""
              onChange={(value: string) =>
                handleInputChange("question_description", value)
              }
              preview={preview}
            />
          </div>

          {preview ? (
            <div className="mt-3 flex justify-between border-brd-clr pl-6 pr-5 pt-6 font-inter font-medium tracking-wide md:mt-8 md:pl-12 lg:border-t">
              <motion.button
                type="button"
                className="flex h-11 items-center justify-center rounded-lg bg-tertiary-light px-8 text-sm text-secondary"
                whileHover={{ scaleX: 1.025 }}
                whileTap={{ scaleX: 0.995 }}
                onClick={() => setPreview(false)}
              >
                Back
              </motion.button>
              <motion.button
                type="submit"
                className={`text-shadow flex h-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#FFC896] from-[-47.73%] to-[#FB652B]  to-[78.41%] px-8 text-sm text-white ${loading ? "cursor-not-allowed" : "cursor-pointer"}`}
                whileHover={{ scaleX: 1.025 }}
                whileTap={{ scaleX: 0.995 }}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    Submitting <Loader colored={true} />
                  </span>
                ) : (
                  <>Submit &nbsp; &#10003;</>
                )}
              </motion.button>
            </div>
          ) : (
            <div className="mt-3 flex justify-between border-brd-clr pl-6 pr-5 pt-6 font-inter font-medium tracking-wide md:mt-8 md:pl-12 lg:border-t">
              <div>
                <motion.button
                  type="button"
                  className="flex h-11 items-center justify-center rounded-lg bg-tertiary-light px-8 text-sm text-secondary"
                  whileHover={{ scaleX: 1.025 }}
                  whileTap={{ scaleX: 0.995 }}
                  onClick={() => push("/")}
                >
                  Cancel
                </motion.button>
              </div>
              <motion.button
                type="submit"
                className="text-shadow flex h-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#FFC896] from-[-47.73%] to-[#FB652B]  to-[78.41%] px-8 text-sm text-white"
                whileHover={{ scaleX: 1.025 }}
                whileTap={{ scaleX: 0.995 }}
              >
                {connected ? "Next" : "Connect wallet to submit"} &nbsp; &#10003;
              </motion.button>
            </div>
          )}
        </form>
      </div>

      {profileData && (
        <div className="hidden flex-1 items-center justify-center lg:flex lg:pb-0">
          <User
            user={{
              img: profileData?.image ?? "/assets/ask-questions/user.png",
              name: profileData?.name ?? `dRep ${query.to?.toString().slice(0,10)}...`,
              questionsAnswers: profileData?.questionsAnswers ?? 0,
              questionsAsked: profileData?.questionsAsked ?? 0,
              walletId: query.to as string ?? "",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Questions;

function LeftArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M13.3584 4.55806C13.6025 4.80214 13.6025 5.19786 13.3584 5.44194L8.80039 10L13.3584 14.5581C13.6025 14.8021 13.6025 15.1979 13.3584 15.4419C13.1144 15.686 12.7186 15.686 12.4746 15.4419L7.47456 10.4419C7.23048 10.1979 7.23048 9.80214 7.47456 9.55806L12.4746 4.55806C12.7186 4.31398 13.1144 4.31398 13.3584 4.55806Z"
        fill="#8C8C8C"
      />
    </svg>
  );
}

interface InputProps {
  title?: string;
  inputPlaceholder?: string;
  textArea?: boolean;
  value: string | null;
  index: number;
  onChange: (value: string) => void;
  preview: boolean;
}

function TitleAndInput({
  title,
  inputPlaceholder,
  textArea,
  value,
  index,
  onChange,
  preview,
}: InputProps) {
  const [inpVal, setInpVal] = useState<string>(value ?? "");
  const [tags, setTags] = useState<string[]>([]);
  const tagInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (title?.toLowerCase() === "theme" && value) {
      const currentTagsAsString = tags.join(",");
      if (value !== currentTagsAsString) {
        setTags(value.split(",").filter(tag => tag.trim() !== ""));
      }
    }
  }, [title, value]);

  const handleOnChange = (
    e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    const newValue = e.target.value;
    
    if (e.target.name === "theme") {
      setInpVal(newValue);
      
      if (newValue.endsWith(",") || newValue.endsWith(" ")) {
        const tagText = newValue.slice(0, -1).trim();
        if (tagText) {
          addTag(tagText);
        }
      }
    } else {
      setInpVal(newValue);
      onChange(newValue);
    }
  };
  
  const addTag = (tagText: string) => {
    if (tagText && !tags.includes(tagText)) {
      const newTags = [...tags, tagText];
      setTags(newTags);
      onChange(newTags.join(","));
      setInpVal(""); 
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    onChange(newTags.join(","));
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tagText = inpVal.trim();
      if (tagText) {
        addTag(tagText);
      }
    } else if (e.key === 'Backspace' && inpVal === "" && tags.length > 0) {
      const newTags = [...tags];
      newTags.pop();
      setTags(newTags);
      onChange(newTags.join(","));
    }
  };
  
  const handleBlur = () => {
    const tagText = inpVal.trim();
    if (tagText) {
      addTag(tagText);
    }
  };
  
  const focusTagInput = () => {
    tagInputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-1 font-inter tracking-wide">
      <h2 className="font-semibold text-secondary ">
        {title === "Theme" ? "Theme/Tags" : title ?? "Lorem"}
      </h2>

      <div className="relative mt-2 font-medium">
        {textArea ? (
          <textarea
            className="w-full resize-none overflow-hidden rounded-lg bg-tertiary-light py-3 pl-5 pr-8 font-ibm-mono text-sm text-secondary outline-none"
            placeholder={inputPlaceholder}
            value={inpVal ?? ""}
            rows={6}
            onChange={handleOnChange}
            readOnly={preview}
          />
        ) : title?.toLowerCase() === "theme" && !preview ? (
          <div 
            className="flex flex-wrap items-center gap-2 w-full min-h-[48px] rounded-lg bg-tertiary-light px-3 py-2 font-ibm-mono text-sm text-secondary outline-none cursor-text"
            onClick={focusTagInput}
          >
            {tags.map((tag, i) => (
              <div key={i} className="flex items-center gap-1 bg-primary-light text-primary rounded-md px-2 py-1">
                <span>{tag}</span>
                {!preview && (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(tag);
                    }}
                    className="text-primary hover:text-primary-dark"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <input
              ref={tagInputRef}
              type="text"
              className="flex-grow bg-transparent outline-none min-w-[60px]"
              placeholder={tags.length === 0 ? inputPlaceholder ?? "Add tags (e.g., governance, technical)" : ""}
              value={inpVal}
              onChange={handleOnChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              name={title?.toLowerCase()}
            />
          </div>
        ) : title?.toLowerCase() === "theme" && preview ? (
          <div className="flex flex-wrap gap-2 w-full rounded-lg bg-tertiary-light px-5 py-3 font-ibm-mono text-sm text-secondary">
            {tags.length > 0 ? (
              tags.map((tag, i) => (
                <span key={i} className="bg-primary-light text-primary rounded-md px-2 py-1">
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-gray-400">No tags specified</span>
            )}
          </div>
        ) : (
          <input
            type="text"
            className="w-full rounded-lg bg-tertiary-light px-5 py-3 pr-10 font-ibm-mono text-sm text-secondary outline-none"
            placeholder={inputPlaceholder ?? "Lorem ipsum dolor sit amet"}
            value={inpVal ?? ""}
            onChange={handleOnChange}
            readOnly={preview}
            name={title?.toLowerCase()}
          />
        )}

        {!preview && value && title?.toLowerCase() !== "theme" && (
          <svg
            className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-gray-400"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M14.7404 1.18391C14.9845 0.939835 15.3802 0.939835 15.6243 1.18391L19.1599 4.71944C19.2771 4.83665 19.3429 4.99562 19.3429 5.16138C19.3429 5.32714 19.2771 5.48611 19.1599 5.60332L6.19623 18.5669C6.07902 18.6842 5.92004 18.75 5.75427 18.75L2.21884 18.7499C1.87368 18.7499 1.59387 18.4701 1.59386 18.1249L1.59375 14.5895C1.59374 14.4237 1.65959 14.2647 1.77681 14.1475L14.7404 1.18391ZM15.1824 2.50974L2.84376 14.8483L2.84384 17.4999L5.49541 17.5L17.834 5.16138L15.1824 2.50974Z"
              fill="#8C8C8C"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M11.2047 4.71937C11.4488 4.4753 11.8445 4.4753 12.0886 4.71937L15.6241 8.25492C15.8682 8.49899 15.8682 8.89472 15.6241 9.1388C15.3801 9.38288 14.9843 9.38288 14.7402 9.1388L11.2047 5.60326C10.9606 5.35918 10.9606 4.96345 11.2047 4.71937Z"
              fill="#8C8C8C"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
