import { MdOutlineDeleteOutline, MdShare } from "react-icons/md";
import { motion } from "framer-motion";
import LetterAvatar from "../letter-avatar";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { FiEdit2 } from "react-icons/fi";
import { useRouter } from "next/router";
import Link from "next/link";
import { useWalletStore } from "~/store/wallet";
import { BASE_API_URL } from "~/data/api";
import axios from "axios";
import { CgArrowsExpandRight } from "react-icons/cg";
import { useWallet } from "@meshsdk/react";
import Loader from "../loader";

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
}

const QueAnsCard: React.FC<QueAnsCardProps> = ({
  large = false,
  id,
  question,
  answer,
  asked_user,
}: QueAnsCardProps): React.ReactNode => {
  const { route } = useRouter();

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

  const { is_admin } = useWalletStore();

  const { wallet } = useWallet();

  const handleSave = async () => {
    try {
      setSaving(true);
      setIsEdit(false); // Exit edit mode
      setValue(newValue);

      const drepID = await wallet.getPubDRepKey();

      if (!is_admin.active || !id || !drepID) {
        return;
      }

      const reqBody: {
        answer: string;
        uuid: string;
        drep_id: string;
        drep_name?: string | undefined;
      } = {
        answer: newValue,
        drep_id: drepID.dRepIDBech32,
        uuid: id,
      };

      const { data } = await axios.post(
        `${BASE_API_URL}/api/v1/answers/reply`,
        reqBody,
      );

      if (data?.savedAnswer) {
        toast.success("Your answer is updated!");

        setSaving(false);
      }
    } catch (error) {
      console.log(error);
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

  return (
    <motion.div
      className={`flex flex-col overflow-hidden rounded-xl border border-brd-clr ${!large && "cursor-pointer"}`}
      whileHover={{ y: large ? 0 : -6 }}
    >
      <div className="flex flex-col items-start justify-start gap-7 border-b border-brd-clr px-[18px] py-4">
        <div className="flex w-full items-center justify-between font-ibm-mono">
          <div className="flex items-center gap-3 font-ibm-mono text-xs font-medium text-tertiary md:text-sm ">
            <div>Question asked by</div>
            <div
              // href={`/profile/${id}`}
              className="w-[200px] overflow-hidden text-ellipsis text-black"
            >
              {asked_user}
            </div>
          </div>

          <Link
            href={`/answer/${id}`}
            className="grid h-10 w-10 place-items-center rounded-lg text-tertiary transition-all hover:bg-black hover:bg-opacity-20"
          >
            <CgArrowsExpandRight size={20} />
            {/* <svg
              width="10"
              height="17"
              viewBox="0 0 10 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.44479 4.96303C9.44583 3.87067 9.0861 2.80854 8.42149 1.94161C7.75688 1.07469 6.82459 0.451507 5.76942 0.168859C4.71426 -0.113789 3.59529 -0.0400783 2.58632 0.378541C1.57735 0.79716 0.734859 1.53725 0.189711 2.48387C0.0018498 2.80943 -0.0489884 3.19629 0.048382 3.55934C0.145752 3.92238 0.383355 4.23188 0.70892 4.41974C1.03448 4.6076 1.42134 4.65844 1.78439 4.56107C2.14744 4.4637 2.45693 4.2261 2.64479 3.90053C2.83175 3.57758 3.10029 3.30944 3.42352 3.12296C3.74674 2.93648 4.1133 2.83823 4.48646 2.83803C5.05005 2.83803 5.59055 3.06192 5.98906 3.46043C6.38758 3.85895 6.61146 4.39945 6.61146 4.96303C6.61146 5.52662 6.38758 6.06712 5.98906 6.46564C5.59055 6.86415 5.05005 7.08803 4.48646 7.08803H4.48221C4.39084 7.09722 4.30065 7.11573 4.21305 7.14328C4.11792 7.15295 4.02397 7.17194 3.93254 7.19995C3.85478 7.24244 3.78126 7.29224 3.71296 7.3487C3.63158 7.39307 3.55472 7.44526 3.48346 7.50453C3.41977 7.5807 3.36422 7.66331 3.31771 7.75103C3.26595 7.81483 3.21996 7.8831 3.18029 7.95503C3.14943 8.05271 3.12901 8.15339 3.11938 8.25537C3.095 8.33672 3.0784 8.42021 3.06979 8.5047V9.92137L3.07263 9.93695V10.6325C3.07338 11.0078 3.22296 11.3674 3.48856 11.6324C3.75416 11.8975 4.11406 12.0464 4.48929 12.0464H4.49355C4.67958 12.046 4.86373 12.009 5.03546 11.9374C5.2072 11.8659 5.36316 11.7612 5.49445 11.6294C5.62574 11.4976 5.72978 11.3412 5.80063 11.1692C5.87148 10.9972 5.90775 10.8129 5.90738 10.6269L5.90454 9.68903C6.92407 9.38617 7.81893 8.76297 8.45657 7.91176C9.09422 7.06054 9.44073 6.02659 9.44479 4.96303ZM3.49054 14.5822C3.29161 14.7795 3.15566 15.0314 3.09986 15.3059C3.04406 15.5805 3.07094 15.8654 3.17708 16.1247C3.28323 16.384 3.46387 16.606 3.69618 16.7627C3.92849 16.9193 4.20203 17.0035 4.48221 17.0047C4.8577 17.0015 5.21767 16.8544 5.48804 16.5939C5.75108 16.3251 5.89839 15.9641 5.89839 15.588C5.89839 15.212 5.75108 14.8509 5.48804 14.5822C5.21688 14.3295 4.85998 14.1889 4.48929 14.1889C4.11861 14.1889 3.76171 14.3295 3.49054 14.5822Z"
                fill="#8C8C8C"
              />
            </svg> */}
          </Link>
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
        {large && question?.drep_id === is_admin.drep_id && (
          <>
            <div className="flex w-full flex-col gap-1.5">
              <div className="flex w-full items-center justify-between">
                <div className="text-primary">Answer</div>
                <div className="flex items-center gap-5 text-base">
                  <div
                    onClick={toggleEditMode}
                    className="cursor-pointer text-[#006AB5]"
                  >
                    <FiEdit2 />
                  </div>
                </div>
              </div>
              <div
                onClick={() => setIsEdit(true)}
                className="cursor-pointer rounded-lg border border-brd-clr px-3.5 py-2.5 font-normal text-secondary"
              >
                <textarea
                  ref={textAreaRef}
                  className="w-full resize-y outline-none disabled:bg-transparent"
                  value={newValue}
                  onChange={handleChange}
                  placeholder="Type your answer"
                  rows={5}
                  //   disabled={!isEdit}
                />
              </div>
              {renderCharacterLimit()}
            </div>
            {(isEdit || saving) && renderButtons(saving)}
          </>
        )}
      </div>

      {answer?.answer && question?.drep_id !== is_admin.drep_id && (
        <div className="flex flex-col justify-start gap-11 bg-[#F5F5F5] px-[18px] py-5">
          <div className="flex flex-col items-start justify-start gap-5">
            <Link
              href={`/profile/${answer.drep_id}`}
              className="flex items-center gap-3 rounded-[10px] bg-primary-light p-2 pl-3 text-primary"
            >
              <div className="flex items-center gap-2 font-ibm-mono text-[13px] text-xs font-medium md:text-sm ">
                <div className="text-[#FF986F]">Answered by</div>
                <div>
                  {(answer.drep_name ?? "")?.slice(0, 16) ??
                    answer.drep_id.slice(0, 16)}
                  ...
                </div>
              </div>

              <div className="">
                <LetterAvatar
                  rounded
                  username={answer.drep_name ?? ""}
                  dimension={32}
                />
              </div>
            </Link>

            <div className="font-inter text-sm font-medium tracking-wide text-secondary md:text-base">
              {enlargeText ? (
                <>
                  {answer?.answer.split("\n\n").map((text, i, a) => (
                    <span className="py-4">
                      {text}
                      {i !== a.length - 1 && (
                        <>
                          <br /> <br />
                        </>
                      )}
                    </span>
                  ))}
                  <span
                    onClick={() => setEnlargeText((prev) => !prev)}
                    className="ml-2 text-[#cbcbcb]"
                  >
                    Read less...
                  </span>
                </>
              ) : (
                <>
                  {answer?.answer.length < 60 ? (
                    answer.answer
                  ) : (
                    <div className="">
                      {answer.answer.slice(0, 60)}...
                      <span
                        onClick={() => setEnlargeText((prev) => !prev)}
                        className="ml-2 text-[#cbcbcb]"
                      >
                        Read more...
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-2">
              <div className="font-ibm-mono text-xs font-medium text-tertiary md:text-sm">
                Tags
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {question?.theme
                  .split(",")
                  .filter((word) => word.length > 0)
                  .map((i) => (
                    <div
                      className="max-w-[200px] truncate rounded-full bg-white px-3 py-1 font-inter text-xs font-medium text-[#444] md:text-[13px]"
                      title={i}
                      key={i}
                    >
                      {i}
                    </div>
                  ))}
              </div>
            </div>

            <motion.button
              className="cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
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
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default QueAnsCard;
