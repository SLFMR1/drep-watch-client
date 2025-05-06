import { MdOutlineDeleteOutline, MdShare } from "react-icons/md";
import { motion } from "framer-motion";
import LetterAvatar from "../letter-avatar";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { FiEdit2, FiShare } from "react-icons/fi";
import { useRouter } from "next/router";
import Link from "next/link";
import { useWalletStore } from "~/store/wallet";
import { BASE_API_URL } from "~/data/api";
import axios from "axios";
import { useWallet } from "@meshsdk/react";
import Loader from "../loader";
import { shareQuestionAnswer } from "~/utils/share";
import { useQueryClient } from "@tanstack/react-query";
import type { BrowserWallet } from '@meshsdk/core';
import { convertDRepIdToCIP129 } from "~/utils/drepUtils";

interface Question {
  theme: string;
  question_title: string;
  question_description: string;
  wallet_address: string;
  drep_id: string;
}

interface Answer {
  id: number;
  answer: string;
  uuid: string;
  drep_id: string;
  drep_name?: string | undefined;
}

interface QueAnsCardProps {
  large?: boolean;
  id?: string;
  question?: Question;
  answer?: Answer;
  asked_user?: string;
  drepXHandle?: string;
}

const QueAnsCard: React.FC<QueAnsCardProps> = ({
  large = false,
  id,
  question,
  answer,
  asked_user,
  drepXHandle,
}: QueAnsCardProps): React.ReactNode => {
  const { route } = useRouter();
  const queryClient = useQueryClient();

  const [enlargeText, setEnlargeText] = useState(false);

  // add from here
  const MAX_LIMIT = 6000;
  const [value, setValue] = useState<string>(answer?.answer ?? "");
  const [newValue, setNewValue] = useState<string>(answer?.answer ?? "");

  const [currentLimit, setCurrentLimit] = useState<number>(
    MAX_LIMIT - value?.length,
  );
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const { is_admin } = useWalletStore();
  const { wallet } = useWallet();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = e.target.value;
    if (inputValue.length <= MAX_LIMIT) {
      setNewValue(inputValue);
      setCurrentLimit(MAX_LIMIT - inputValue.length);
    }
  };

  const toggleEditMode = () => {
    setIsEdit(!isEdit);
  };

  const handleCancel = () => {
    setNewValue(value); // Revert to original value
    setIsEdit(false); // Exit edit mode
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setIsEdit(false); // Exit edit mode
      setValue(newValue);

      // Use the DRep ID from the store (already converted to CIP-129 during login)
      const drepIDFromStore = is_admin.drep_id;

      if (!is_admin.active || !id || !drepIDFromStore) {
        console.error("Missing required data for saving answer:", {
          isAdminActive: is_admin.active,
          questionId: id,
          drepId: drepIDFromStore,
        });
        toast.error("Cannot save answer. Required information is missing.");
        setSaving(false); // Ensure saving state is reset
        return;
      }
      
      console.log(`(QueAnsCard) Using DRep ID from store: ${drepIDFromStore}`);

      const reqBody: {
        answer: string;
        uuid: string;
        drep_id: string; // Send the CIP-129 ID
        drep_name?: string | undefined;
      } = {
        answer: newValue,
        drep_id: drepIDFromStore, // Use the ID from the store
        uuid: id,
      };
      
      console.log("(QueAnsCard) Request body being sent:", reqBody);


      const { data } = await axios.post(
        `${BASE_API_URL}/api/v1/answers/reply`,
        reqBody,
      );

      if (data?.savedAnswer) {
        toast.success("Your answer is updated!");
        // Invalidate queries to refetch data
        // Use the *CIP-129* ID from the store for invalidation keys
        await queryClient.invalidateQueries({ queryKey: ['drep-profile', drepIDFromStore] });
        await queryClient.invalidateQueries({ queryKey: ['latest_questions'] }); // Invalidate general lists
        await queryClient.invalidateQueries({ queryKey: ['drep_questions', drepIDFromStore] }); // Invalidate specific dRep questions list

        setSaving(false);
      } else {
        // Handle potential API error where savedAnswer is not returned
        toast.error("Failed to update answer. Please try again.");
        setSaving(false);
      }
    } catch (error) {
      console.error("Error saving answer:", error); // Log the actual error
      toast.error("An error occurred while saving the answer.");
      setSaving(false); // Ensure saving state is reset on error
    }
  };

  const renderCharacterLimit = () => {
    const characterLimitText = `${currentLimit} Characters left`;
    const textColor = currentLimit < 10 ? "text-red-600" : "text-secondary/60";
    return isEdit ? (
      <div className={textColor + " text-sm"}>{characterLimitText}</div>
    ) : null;
  };

  useEffect(() => {
    setNewValue(answer?.answer ?? "");
    setValue(answer?.answer ?? "");
  }, [answer?.answer]);

  const renderButtons = (saving: boolean) => {
    return (
      <div className="flex w-full items-center justify-end gap-3">
        <button
          disabled={saving}
          className="rounded-lg border border-brd-clr px-4 py-2.5 font-semibold text-secondary-dark disabled:opacity-60"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          className="rounded-lg border border-primary bg-primary px-4 py-2.5 font-semibold text-white"
          onClick={handleSave}
        >
          {saving ? <Loader colored={true} /> : "Save"}
        </button>
      </div>
    );
  };

  useEffect(() => {
    console.log(is_admin);
  }, [is_admin]);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (id && question?.question_title) {
      shareQuestionAnswer(
        id, 
        question.question_title,
        question.drep_id,
        answer?.drep_name,
        drepXHandle
      );
    }
  };

  return (
    <motion.div
      className={`flex flex-col overflow-hidden rounded-xl border border-brd-clr ${!large && "cursor-pointer"}`}
      whileHover={{ y: large ? 0 : -6 }}
      onClick={() => {
        if (!large && id) {
          window.location.href = `/answer/${id}`;
        }
      }}
    >
      <div className="flex flex-col items-start justify-start gap-7 border-b border-brd-clr px-[18px] py-4">
        <div className="flex w-full items-center justify-between font-ibm-mono">
          <div className="flex items-center gap-3 font-ibm-mono text-xs font-medium text-tertiary md:text-sm ">
            <div>Question asked by</div>
            {asked_user && (
              <div
                className="w-[200px] overflow-hidden text-ellipsis text-black cursor-pointer hover:underline"
                onClick={(e) => {
                  e.stopPropagation(); 
                  if (asked_user && asked_user.startsWith('stake')) {
                    window.location.href = `/profile/${asked_user}`;
                  }
                }}
              >
                {asked_user}
              </div>
            )}
          </div>

          <div className="flex items-center">
            <button
              onClick={handleShare}
              className="grid h-10 w-10 place-items-center rounded-lg text-tertiary transition-all hover:bg-black hover:bg-opacity-20 cursor-pointer"
              aria-label="Share"
            >
              <FiShare size={18} />
            </button>
          </div>
        </div>

        <div className="font-inter text-sm font-medium tracking-wide text-secondary md:text-base">
          {large ? (
            <div className="text-xl">{question?.question_title}</div>
          ) : (
            <>
              {question?.question_title &&
              question?.question_title.length < 60 ? (
                question?.question_title
              ) : (
                <>{question?.question_title.slice(0, 60)}...</>
              )}
            </>
          )}
        </div>
        {large && (
          <div className="font-inter text-xs font-light tracking-wide text-secondary md:text-base">
            {question?.question_description}
          </div>
        )}

        {/*  change is_admin to original var */}
        {large && question?.drep_id && is_admin.drep_id && question.drep_id === is_admin.drep_id && (
          <>
            <div className="flex w-full flex-col gap-1.5">
              <div className="flex w-full items-center justify-between">
                <div className="text-primary">Answer</div>
                <div className="flex items-center gap-5 text-base">
                  {!isEdit && (
                    <button
                      onClick={toggleEditMode}
                      className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              {isEdit ? (
                <textarea
                  ref={textAreaRef}
                  className="w-full resize-y rounded-lg border border-brd-clr px-3.5 py-2.5 font-normal text-secondary outline-none"
                  value={newValue}
                  onChange={handleChange}
                  placeholder="Type your answer"
                  rows={5}
                  disabled={!isEdit}
                />
              ) : (
                <div
                  onClick={toggleEditMode} // Allow entering edit mode by clicking the text
                  className="min-h-[100px] w-full cursor-text whitespace-pre-wrap rounded-lg border border-transparent px-3.5 py-2.5 font-normal text-secondary"
                >
                  {value || <span className="text-gray-400">Type your answer</span>}
                </div>
              )}
              {renderCharacterLimit()}
            </div>
            {(isEdit || saving) && renderButtons(saving)}
          </>
        )}
      </div>

      {/* === START: Moved Tags Section === */}
      {question?.theme && question.theme.split(",").filter((word) => word.length > 0).length > 0 && (
        <div className="flex items-center justify-between gap-5 px-[18px] pb-4 pt-2"> {/* Added padding */}
          <div className="flex items-center gap-2">
            <div className="font-ibm-mono text-xs font-medium text-tertiary md:text-sm">
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {question?.theme
                .split(",")
                .filter((word) => word.length > 0)
                .map((i) => (
                  <div
                    className="max-w-[200px] truncate rounded-full bg-gray-100 px-3 py-1 font-inter text-xs font-medium text-[#444] md:text-[13px]" // Changed bg to gray-100 for visibility
                    title={i}
                    key={i}
                  >
                    {i}
                  </div>
                ))}
            </div>
          </div>
          {/* Share button specific to tags might not be needed if it's already in the header */}
          {/* 
            <motion.button
              className="cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async (e) => {
                e.stopPropagation(); // Prevent card click-through if needed
                try {
                  await navigator.clipboard.writeText(
                    `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ""}/answer/` +
                      id,
                  );
                  toast.success("Copied the sharing link");
                } catch (err) {
                  toast.error("Failed to copy to clipboard");
                }
              }}
            >
              <MdShare className="text-lg text-[#8c8c8c] md:text-xl" />
            </motion.button> 
          */}
        </div>
      )}
      {/* === END: Moved Tags Section === */}

      {answer?.answer && (
        <div className="flex flex-col justify-start gap-6 bg-[#F5F5F5] px-[18px] py-5"> {/* Reduced gap */}
          <div className="flex flex-col items-start justify-start gap-5">
            <Link
              href={`/profile/${answer.drep_id}`}
              className="flex items-center gap-3 rounded-[10px] bg-primary-light p-2 pl-3 text-primary cursor-pointer"
            >
              <div className="flex items-center gap-2 font-ibm-mono text-[13px] text-xs font-medium md:text-sm ">
                <div className="text-[#FF986F]">Answered by</div>
                <div>
                  {(answer.drep_name && answer.drep_name.length > 0) 
                    ? (answer.drep_name.length > 16 ? `${answer.drep_name.slice(0, 16)}...` : answer.drep_name)
                    : (answer.drep_id.length > 16 ? `${answer.drep_id.slice(0, 16)}...` : answer.drep_id)
                  }
                </div>
              </div>

              <div className="">
                <LetterAvatar
                  rounded
                  username={(answer.drep_name && answer.drep_name.length > 0) ? answer.drep_name : answer.drep_id}
                  dimension={32}
                />
              </div>
            </Link>

            <div className="font-inter text-sm font-medium tracking-wide text-secondary md:text-base">
              {large || enlargeText ? (
                <>
                  {answer?.answer.split("\n\n").map((text, i, a) => (
                    <span className="py-4" key={i}>
                      {text}
                      {i !== a.length - 1 && (
                        <>
                          <br /> <br />
                        </>
                      )}
                    </span>
                  ))}
                  {!large && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnlargeText(false);
                      }}
                      className="ml-2 text-[#cbcbcb] cursor-pointer"
                    >
                      Read less...
                    </span>
                  )}
                </>
              ) : (
                <>
                  {answer?.answer.length < 60 ? (
                    answer.answer
                  ) : (
                    <div className="">
                      {answer.answer.slice(0, 60)}...
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnlargeText(true);
                        }}
                        className="ml-2 text-[#cbcbcb] cursor-pointer"
                      >
                        Read more...
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default QueAnsCard;
