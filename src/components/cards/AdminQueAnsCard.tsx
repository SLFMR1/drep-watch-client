import { MdOutlineDeleteOutline, MdShare } from "react-icons/md";
import { motion } from "framer-motion";
import LetterAvatar from "../letter-avatar";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { FiEdit2 } from "react-icons/fi";
import axios from "axios";
import { BASE_API_URL } from "~/data/api";
import { useWalletStore } from "~/store/wallet";
import Link from "next/link";
import { CgArrowsExpandRight } from "react-icons/cg";
import { useWallet } from "@meshsdk/react";
import Loader from "../loader";

interface Question {
  question_title: string;
  answer: string;
}

interface QueAnsCardProps {
  id?: string;
  question: Question;
  asked_user: string;
}

const AdminQueAnsCard = ({ id, question, asked_user }: QueAnsCardProps) => {
  return (
    <motion.div
      className="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-brd-clr"
      whileHover={{ y: -6 }}
      onClick={() => {
        if (id) {
          window.location.href = `/answer/${id}`;
        }
      }}
    >
      <div className="flex flex-col items-start justify-start gap-4 border-b border-brd-clr px-[18px] py-4">
        <div className="w-full font-inter text-xs font-medium tracking-wide md:text-sm">
          <div className="flex w-full flex-col items-start justify-start gap-4">
            <div className="flex items-center gap-3 font-ibm-mono text-xs font-medium text-tertiary md:text-sm ">
              <div className="text-sm">Question asked by</div>
              <div 
                className="w-[200px] overflow-hidden text-ellipsis text-black hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation(); 
                  if (asked_user && asked_user.startsWith('stake')) {
                    window.location.href = `/profile/${asked_user}`;
                  }
                }}
              >
                {asked_user}
              </div>
              <Link
                href={`/answer/${id}`}
                className="grid h-10 w-10 place-items-center rounded-lg text-tertiary transition-all hover:bg-black hover:bg-opacity-20 cursor-pointer"
              >
                <CgArrowsExpandRight size={20} />
              </Link>
            </div>
            <div className="text-secondary-dark">
              {question?.question_title}
            </div>

            <div className="flex w-full flex-col gap-1.5">
              <div className="flex w-full items-center justify-between">
                <div className="text-primary">Answer</div>
              </div>
              <div className="min-h-[100px] w-full whitespace-pre-wrap rounded-lg border border-transparent px-3.5 py-2.5 font-normal text-secondary">
                {question.answer ? (
                  question.answer
                ) : (
                  <span className="text-gray-400">Type your answer</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export { AdminQueAnsCard };
