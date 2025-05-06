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

  // Editing state for large view, unanswered, and dRep only
  const MAX_LIMIT = 6000;
  const [newValue, setNewValue] = useState<string>("");
  const [currentLimit, setCurrentLimit] = useState<number>(MAX_LIMIT);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const { is_admin } = useWalletStore();
  const { wallet } = useWallet();

  // Only allow editing if large, unanswered, and user is dRep
  const canEdit = large && question?.drep_id && is_admin.drep_id && question.drep_id === is_admin.drep_id && !answer?.answer;

  // Initialize edit mode if canEdit
  useEffect(() => {
    if (canEdit) {
      setIsEdit(true);
    } else {
      setIsEdit(false);
      setNewValue("");
    }
  }, [canEdit, answer]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = e.target.value;
    if (inputValue.length <= MAX_LIMIT) {
      setNewValue(inputValue);
      setCurrentLimit(MAX_LIMIT - inputValue.length);
    }
  };

  const handleCancel = () => {
    setNewValue("");
    setIsEdit(false);
    setCurrentLimit(MAX_LIMIT);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setIsEdit(false);
      // Use the DRep ID from the store (already converted to CIP-129 during login)
      const drepIDFromStore = is_admin.drep_id;
      if (!is_admin.active || !id || !drepIDFromStore) {
        toast.error("Cannot save answer. Required information is missing.");
        setSaving(false);
        return;
      }
      const reqBody = {
        answer: newValue,
        drep_id: drepIDFromStore,
        uuid: id,
      };
      const { data } = await axios.post(
        `${BASE_API_URL}/api/v1/answers/reply`,
        reqBody,
      );
      if (data?.savedAnswer) {
        toast.success("Your answer is updated!");
        await queryClient.invalidateQueries({ queryKey: ['drep-profile', drepIDFromStore] });
        await queryClient.invalidateQueries({ queryKey: ['latest_questions'] });
        await queryClient.invalidateQueries({ queryKey: ['drep_questions', drepIDFromStore] });
        await queryClient.invalidateQueries({ queryKey: ['answer-data', id] });
        setSaving(false);
      } else {
        toast.error("Failed to update answer. Please try again.");
        setSaving(false);
      }
    } catch (error) {
      toast.error("An error occurred while saving the answer.");
      setSaving(false);
    }
  };

  // Autofocus textarea when entering edit mode
  useEffect(() => {
    if (isEdit && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [isEdit]);

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

        {/* Editable only if large, unanswered, and dRep */}
        {canEdit && isEdit && (
          <div className="flex w-full flex-col gap-1.5">
            <div className="flex w-full items-center justify-between">
              <div className="text-primary">Answer</div>
            </div>
            <textarea
              ref={textAreaRef}
              className="w-full resize-y rounded-lg border border-brd-clr px-3.5 py-2.5 font-normal text-secondary outline-none"
              value={newValue}
              onChange={handleChange}
              placeholder="Type your answer"
              rows={5}
              disabled={saving}
            />
            <div className={currentLimit < 10 ? "text-red-600 text-sm" : "text-secondary/60 text-sm"}>
              {currentLimit} Characters left
            </div>
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
                disabled={saving || newValue.trim().length === 0}
              >
                {saving ? <Loader colored={true} /> : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* If not editable, show static placeholder for unanswered in large view only */}
        {large && question?.drep_id && is_admin.drep_id && question.drep_id === is_admin.drep_id && !answer?.answer && !isEdit && (
          <div className="flex w-full flex-col gap-1.5">
            <div className="flex w-full items-center justify-between">
              <div className="text-primary">Answer</div>
            </div>
            <div className="min-h-[100px] w-full whitespace-pre-wrap rounded-lg border border-transparent px-3.5 py-2.5 font-normal text-secondary">
              <span className="text-gray-400">Type your answer</span>
            </div>
          </div>
        )}

        {/* In small view, show 'Answer' button for unanswered questions by dRep */}
        {!large && question?.drep_id && is_admin.drep_id && question.drep_id === is_admin.drep_id && !answer?.answer && (
          <div className="flex w-full flex-col gap-1.5 items-start mt-2">
            <button
              className="rounded-lg bg-gradient-to-b from-[#FFC896] from-[-47.73%] to-[#FB652B] to-[78.41%] px-4 py-2.5 text-white font-semibold text-sm shadow-md hover:brightness-105 transition"
              onClick={e => {
                e.stopPropagation();
                if (id) window.location.href = `/answer/${id}`;
              }}
            >
              Answer
            </button>
          </div>
        )}
      </div>

      {/* === START: Moved Tags Section === */}
      {question?.theme && question.theme.split(",").filter((word) => word.length > 0).length > 0 && (
        <div className="flex items-center justify-between gap-5 px-[18px] pb-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="font-ibm-mono text-xs font-medium text-tertiary md:text-sm">
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {question?.theme
                .split(",")
                .filter((word) => word.length > 0)
                .map((i) => (
                  <div
                    className="max-w-[200px] truncate rounded-full bg-gray-100 px-3 py-1 font-inter text-xs font-medium text-[#444] md:text-[13px]"
                    title={i}
                    key={i}
                  >
                    {i}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
      {/* === END: Moved Tags Section === */}

      {answer?.answer && (
        <div className="flex flex-col justify-start gap-6 bg-[#F5F5F5] px-[18px] py-5">
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
