import { LegacyRef, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Image from "next/image";
import axios from "axios";

import ProfileCard from "./cards/profile";
import QueAnsCard from "./cards/que-ans";
import Search from "./search";

import { FILTER_TYPES, FILTERS, SMALL_WIDTHS, WIDTHS } from "~/constants";
import useDeviceType from "~/hooks/use-device-type";
import useInView from "~/hooks/use-in-view";
import { getData } from "~/server";
import Loader from "./loader";
import Link from "next/link";
import { BASE_API_URL } from "~/data/api";
import { AdminQueAnsCard } from "./cards/AdminQueAnsCard";
import { useWalletStore } from "~/store/wallet";
import Masonry from "react-masonry-css";

const Home: React.FC = (): React.ReactNode => {
  const [active, setActive] = useState<number>(FILTER_TYPES.LATEST_ANSWERS);
  const [page, setPage] = useState<number>(1);
  const [highlightStyle, setHighlightStyle] = useState({ left: 0, width: 0 });
  const filterRefs = useRef<(HTMLDivElement | null)[]>([]);

  const deviceType = useDeviceType();
  const { initialLoad, ref } = useInView();
  const {
    isLoading: isLoadingQuestions,
    data: pageData,
    refetch,
  } = useQuery({
    queryFn: () => getData(active, page),
    queryKey: ["latest_questions", active, page],
    refetchIntervalInBackground: active !== FILTER_TYPES.EXPLORE_DREPS,
    refetchOnMount: active !== FILTER_TYPES.EXPLORE_DREPS,
  });

  // Cache for drep images
  const [drepImages, setDrepImages] = useState<Record<string, string | undefined>>({});

  // Fetch DRep images for all unique drep_ids in the current page
  useEffect(() => {
    if (!pageData || !('questionAnswers' in pageData) || !pageData.questionAnswers || !('questions' in pageData) || !Array.isArray(pageData.questions)) return;
    const uniqueDrepIds = Array.from(new Set(pageData.questions.map((q: any) => q.drep_id)));
    const missingIds = uniqueDrepIds.filter((id: string) => !(id in drepImages));
    if (missingIds.length === 0) return;
    Promise.all(
      missingIds.map(async (drep_id: string) => {
        try {
          const res = await axios.get(`${BASE_API_URL}/api/v1/drep/indexed/search?query=${drep_id}`);
          if (Array.isArray(res.data) && res.data.length > 0 && res.data[0].image_url) {
            return { id: drep_id, image: res.data[0].image_url };
          }
        } catch (e) {}
        return { id: drep_id, image: undefined };
      })
    ).then(results => {
      const newImages = { ...drepImages };
      results.forEach(({ id, image }) => { if (typeof id === 'string') newImages[id] = image; });
      setDrepImages(newImages);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageData]);

  useEffect(() => {
    const activeFilterIndex = FILTERS.filter(f => f.type !== FILTER_TYPES.EXPLORE_DREPS).findIndex(filter => filter.type === active);
    const currentRef = filterRefs.current[activeFilterIndex];

    if (currentRef) {
      setHighlightStyle({
        left: currentRef.offsetLeft,
        width: currentRef.offsetWidth,
      });
    }
  }, [active, pageData]);

  const { is_admin } = useWalletStore();

  const drepsDivRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const div = drepsDivRef.current;
    if (div) {
      const { scrollTop, scrollHeight, clientHeight } = div;
      if (scrollTop + clientHeight >= scrollHeight) {
        if (pageData?.nextPage) {
          setPage(pageData?.nextPage);
        }
      }
    }
  };

  useEffect(() => {
    const div = drepsDivRef.current;

    if (div) {
      div.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (div) {
        div.removeEventListener("scroll", handleScroll);
      }
    };
  }, [drepsDivRef.current, pageData?.nextPage]);

  return (
    <section className="flex w-full flex-col gap-[40px] pb-20 pt-[150px] md:gap-[90px] md:pt-[190px]">
      <div className="flex w-full flex-col items-center justify-center">
        {/* <motion.div
          className="flex items-center gap-2 rounded-[10px] bg-primary-light p-2 text-primary"
          initial={{ opacity: 0, y: -60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div className="">
            <Image
              src={"/assets/home/top.png"}
              width={1000}
              height={1000}
              className="h-7 w-auto rounded object-cover"
              alt="profile"
            />
          </div>
          <div className="font-ibm-mono text-[13px] ">
            over 100+ dreps available here
          </div>
        </motion.div> */}

        <motion.div
          className="mt-5 flex flex-col items-center gap-1 font-neue-regrade text-[10vw] font-semibold leading-[1] md:flex-row md:gap-5 md:text-[5vw] md:leading-normal"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <span>Governance with</span>
          <span className="stroke-text">Transparency</span>
        </motion.div>

        <div className="flex items-center gap-4 mt-4">
          <Search />
        </div>
      </div>

      <div className="flex  w-full items-center justify-center bg-white px-[5%] py-7 pb-12 shadow-[-5px_0px_13px_0px_#0000001A]">
        <div
          ref={ref}
          className="flex w-full max-w-[1600px] flex-col gap-6 md:gap-10"
        >
          <div className="flex w-full flex-col items-start justify-between gap-2 font-inter font-medium tracking-wide text-secondary-dark md:flex-row md:items-center ">
            <div className="flex items-center gap-4 text-base md:text-xl">
              <div className="">
                {active === FILTER_TYPES.EXPLORE_DREPS
                  ? "DReps"
                  : "Questions and answers"}
              </div>

              <motion.div
                className="flex items-center gap-4 rounded-lg p-1.5 text-xs text-tertiary md:text-sm"
                initial={{ backgroundColor: "transparent", opacity: 0 }}
                whileInView={{ backgroundColor: "#EAEAEA", opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                <div
                  onClick={() => (page > 1 ? setPage((page) => page - 1) : {})}
                  className={`relative z-[1] cursor-pointer rounded-lg ${page <= 1 ? "bg-transparent" : "bg-white"} px-2 py-1.5 text-black hover:text-secondary`}
                >
                  Prev
                </div>
                <div className="text-black">{page}</div>
                <div
                  onClick={() =>
                    pageData?.nextPage ? setPage(pageData?.nextPage) : {}
                  }
                  className={`relative z-[1] cursor-pointer rounded-lg ${pageData?.nextPage ? "bg-white" : "bg-transparent"} px-2 py-1.5 text-black hover:text-secondary`}
                >
                  Next
                </div>
              </motion.div>
            </div>
            <motion.div
              className="rounded-lg p-1.5 text-xs text-tertiary md:text-sm"
              initial={{ backgroundColor: "transparent", opacity: 0 }}
              whileInView={{ backgroundColor: "#EAEAEA", opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <div className="relative flex">
                {FILTERS.filter(filter => filter.type !== FILTER_TYPES.EXPLORE_DREPS).map((filter, i) => (
                  <motion.div
                    key={filter.type}
                    ref={el => filterRefs.current[i] = el}
                    className={`relative z-[1] px-2 py-1.5 ${active === filter.type ? "text-black " : "text-tertiary"} cursor-pointer hover:text-secondary `}
                    onClick={() => setActive(filter.type)}
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.25 + i * 0.1, duration: 0.5 }}
                  >
                    {filter.label}
                  </motion.div>
                ))}

                <motion.div
                  className="absolute bottom-0 left-0 top-0 z-0 h-full rounded-md bg-white mix-blend-overlay shadow-md transition-[left_200ms,width_200ms]"
                  style={{ left: `${highlightStyle.left}px`, width: `${highlightStyle.width}px` }}
                  initial={{ scale: 0 }}
                  whileInView={highlightStyle.width > 0 ? { scale: 1 } : { scale: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.5, type: "spring", stiffness: 300, damping: 30 }}
                />
              </div>
            </motion.div>
          </div>

          {active === FILTER_TYPES.LATEST_ANSWERS && (
            <div
              className={`${pageData && pageData.questionAnswers ? "w-full" : "flex w-full items-center"}`}
            >
              {pageData && pageData.questionAnswers ? (
                pageData.questions.length === 0 ? (
                  <div className="w-full text-center text-sm text-gray-500">
                    {isLoadingQuestions ? "Loading..." : "No results to show"}
                  </div>
                ) : (
                  pageData.questions && (
                    <Masonry
                      breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
                      className="masonry-grid"
                      columnClassName="masonry-column"
                    >
                      {pageData.questions.map((question, i) => {
                        return (
                          <div key={pageData.answers[i]?.uuid || question.uuid || i} className="masonry-item">
                            <QueAnsCard
                              asked_user={question.wallet_address}
                              question={question}
                              answer={pageData.answers[i]}
                              id={pageData.answers[i]?.uuid}
                              drepImage={drepImages[question.drep_id]}
                              large={false}
                            />
                          </div>
                        );
                      })}
                    </Masonry>
                  )
                )
              ) : (
                <Loader />
              )}
            </div>
          )}

          {active === FILTER_TYPES.LATEST_QUESTIONS && (
            <div
              className={`${pageData && pageData.questionAnswers ? "w-full" : "flex w-full items-center"}`}
            >
              {pageData && pageData.questionAnswers ? (
                pageData.questions.length === 0 ? (
                  <div className="w-full text-center text-sm text-gray-500">
                    {isLoadingQuestions ? "Loading..." : "No results to show"}
                  </div>
                ) : (
                  pageData.questions && (
                    <Masonry
                      breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
                      className="masonry-grid"
                      columnClassName="masonry-column"
                    >
                      {pageData.questions.map((question, i) => (
                        <div key={question.uuid || i} className="masonry-item">
                          <QueAnsCard
                            asked_user={question.wallet_address}
                            question={question}
                            answer={pageData.answers[i]}
                            id={question.uuid}
                            drepImage={drepImages[question.drep_id]}
                            large={false}
                          />
                        </div>
                      ))}
                    </Masonry>
                  )
                )
              ) : (
                <Loader />
              )}
            </div>
          )}

          {active === FILTER_TYPES.EXPLORE_DREPS && (
            <div
              className={`${pageData && !pageData.questionAnswers ? "w-full" : "flex w-full items-center"}`}
            >
              {pageData && !pageData.questionAnswers ? (
                pageData.dreps.length === 0 ? (
                  <div className="w-full text-center text-sm text-gray-500">
                    {isLoadingQuestions ? "Loading..." : "No results to show"}
                  </div>
                ) : (
                  pageData.dreps && (
                    <Masonry
                      breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
                      className="masonry-grid"
                      columnClassName="masonry-column"
                    >
                      {pageData.dreps.map((drep, i) => (
                        <div key={drep.drep_id} className="masonry-item">
                          <ProfileCard drep={drep} />
                        </div>
                      ))}
                    </Masonry>
                  )
                )
              ) : (
                <Loader colored={false} />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Home;
