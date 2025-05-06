import { GoArrowRight } from "react-icons/go";
import { motion } from "framer-motion";
import Image from "next/image";

import QueAnsCard from "./cards/que-ans";

import useInView from "~/hooks/use-in-view";
import { useWalletStore } from "~/store/wallet";
import LetterAvatar from "./letter-avatar";
import Link from "next/link";
import { getData, getDrepQuestions, getUserQuestions } from "~/server";
import { useQuery } from "@tanstack/react-query";
import Loader from "./loader";
import Masonry from "react-masonry-css";
import axios, { AxiosError } from "axios";
import { BASE_API_URL } from "~/data/api";
import { AdminQueAnsCard } from "./cards/AdminQueAnsCard";

const MyQuestions: React.FC = (): React.ReactNode => {
  const { ref } = useInView();

  const { stake_address, delegatedTo, is_admin } = useWalletStore();

  const { isLoading, data: pageData } = useQuery({
    queryFn: () =>
      is_admin.active && is_admin?.drep_id
        ? getDrepQuestions(is_admin?.drep_id)
        : stake_address
          ? getUserQuestions(stake_address)
          : null,
    queryKey: ["my_questions", stake_address],
  });

  const fetchData = async () => {
    try {
      const response = await axios.post(
        `${BASE_API_URL}/api/v1/drep/drep-profile`,
        { drep_id: is_admin?.drep_id },
      );

      return response.data;
      //   console.log(data);
    } catch (error: unknown) {
      if (
        error instanceof AxiosError &&
        error.response &&
        error.response.data
      ) {
        const responseData = error.response.data;
        console.log(responseData);
      }
      console.log(error);
    }
  };

  const { data: profileData, error: err1 } = useQuery<{
    name: string;
  } | null>({
    queryKey: ["drep-profile", is_admin?.drep_id],
    queryFn: () => (is_admin.active && is_admin?.drep_id ? fetchData() : null),
  });

  return (
    <section className="flex w-full flex-col gap-[40px] pb-20 pt-[120px] md:gap-[90px] md:pt-[190px]">
      <div className="relative flex items-center justify-center">
        <motion.div
          className="flex w-[90%] flex-col items-center gap-6 rounded-xl border border-primary-light bg-white shadow-color md:w-auto md:flex-row "
          whileHover={{ scale: 1.025 }}
        >
          <div className="flex flex-col divide-y divide-brd-clr md:flex-row md:divide-x ">
            <div className="flex flex-col items-center gap-3 p-8 pb-6 md:flex-row md:gap-6 md:pr-6 ">
              <LetterAvatar
                username={
                  (is_admin.active && is_admin?.drep_id ? profileData?.name : stake_address) ?? "A"
                }
                dimension={140}
              />

              <div className="max-w-[290px] truncate font-neue-regrade text-[28px] font-medium text-black md:text-[36px]">
                {is_admin.active && is_admin?.drep_id
                  ? profileData?.name
                  : stake_address ?? "Connect Wallet"}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-2 p-8 pt-6 md:py-4 md:pl-6 ">
              <div className="font-ibm-mono text-xs text-tertiary md:text-sm">
                {is_admin.active && is_admin?.drep_id ? "Your dRep ID" : "Delegated to"}
              </div>
              {/* <Image
                src={"/assets/profile/img.png"}
                width={1000}
                height={1000}
                className="aspect-square w-[60px] object-cover"
                alt="img"
              /> */}

              <div className="rounded-lg bg-primary-light px-[18px] py-2  font-ibm-mono text-xs tracking-wide text-primary md:text-[13px]">
                {is_admin.active && is_admin?.drep_id
                  ? `${is_admin?.drep_id?.slice(0, 24)}...`
                  : delegatedTo.pool_id
                    ? `${delegatedTo.pool_id?.slice(0, 24)}...`
                    : "Not Active"}
              </div>

              {delegatedTo.pool_id && (
                <Link
                  href={`/profile/${delegatedTo.pool_id}`}
                  className="group mt-2 flex items-center gap-1 font-inter text-sm font-medium tracking-wide text-primary"
                >
                  <div>View profile</div>

                  <GoArrowRight className="text-lg transition-all duration-200 group-hover:translate-x-1 group-active:translate-x-0.5 md:text-xl" />
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {stake_address && (
        <div className="flex  w-full items-center justify-center bg-white px-[5%] py-7 pb-12 shadow-[-5px_0px_13px_0px_#0000001A]">
          <div
            ref={ref}
            className="flex w-full max-w-[1600px] flex-col gap-6 md:gap-10"
          >
            <div className="flex w-full flex-col items-start justify-between gap-2 font-inter font-medium tracking-wide text-secondary-dark md:flex-row md:items-center ">
              <div className="text-base md:text-xl">
                Your Question & Answers
              </div>
            </div>

            <div className="w-full">
              {pageData && pageData.questionAnswers ? (
                <Masonry
                  breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
                  className="masonry-grid"
                  columnClassName="masonry-column"
                >
                  {pageData.questions.map((question, i) => (
                    <div key={i} className="masonry-item">
                      {is_admin.active && question.drep_id === is_admin?.drep_id ? (
                        <AdminQueAnsCard
                          asked_user={question.wallet_address}
                          id={question.uuid}
                          question={{
                            question_title: question.question_title,
                            answer: pageData.answers[i]?.answer ?? "",
                          }}
                        />
                      ) : (
                        <QueAnsCard
                          asked_user={question.wallet_address}
                          question={question}
                          answer={pageData.answers[i]}
                          id={question.uuid}
                        />
                      )}
                    </div>
                  ))}
                </Masonry>
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

export default MyQuestions;
