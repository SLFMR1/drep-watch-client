import { useState } from "react";
import { FaMinus, FaThumbsUp } from "react-icons/fa6";
import { motion } from "framer-motion";
import { Proposal } from "~/types";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";

const Vote = ({ title, vote, abstract, motivation, rationale }: Proposal): React.ReactNode => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-brd-clr bg-white">
      <div className="mx-[18px] my-4 flex flex-col gap-5">
        <div className="font-inter text-sm font-medium tracking-wide text-secondary md:text-base">
          {title}
        </div>

        {showDetails && (abstract || motivation || rationale) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-2 flex flex-col gap-3 border-t border-gray-200 pt-3 text-xs text-gray-700"
          >
            {abstract && (
              <div>
                <h4 className="font-semibold text-gray-800">Abstract:</h4>
                <p className="mt-1 whitespace-pre-line">{abstract}</p>
              </div>
            )}
            {motivation && (
              <div className="mt-2">
                <h4 className="font-semibold text-gray-800">Motivation:</h4>
                <p className="mt-1 whitespace-pre-line">{motivation}</p>
              </div>
            )}
            {rationale && (
              <div className="mt-2">
                <h4 className="font-semibold text-gray-800">Rationale:</h4>
                <p className="mt-1 whitespace-pre-line">{rationale}</p>
              </div>
            )}
          </motion.div>
        )}

        {(abstract || motivation || rationale) && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mt-2 flex items-center justify-center gap-1 self-start rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            {showDetails ? "Hide Details" : "Show Details"}
            {showDetails ? <IoChevronUp /> : <IoChevronDown />}
          </button>
        )}

      </div>
      <div className="flex items-center justify-center border-t border-brd-clr bg-[#F5F5F5] p-3 text-secondary md:p-5">
        <motion.button
          className={`flex items-center justify-center gap-2.5 rounded-[10px] border  border-[#E6E6E6] px-3 py-2 ${vote === "Yes" ? "bg-primary-light text-primary" : "bg-[#EAEAEA] text-[#8C8C8C]"} transition-all duration-200`}
          whileHover={{ scaleX: 1.025 }}
          whileTap={{ scaleX: 0.995 }}
        >
          {vote === "Yes" || vote === "No" ? (
            <FaThumbsUp
              className={`text-lg md:text-xl ${vote === "Yes" ? "rotate-0" : "-rotate-180"} transition-all duration-200`}
            />
          ) : (
            <FaMinus
              className={`text-lg transition-all duration-200 md:text-xl`}
            />
          )}
          <div className="font-ibm-mono text-xs font-semibold tracking-wide md:text-sm ">
            {vote}
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default Vote;
