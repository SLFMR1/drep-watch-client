import Image from "next/image";

import { type UserType } from "~/types";
import LetterAvatar from "./letter-avatar";

interface UserProps {
  user: UserType;
}

const User: React.FC<UserProps> = ({ user }: UserProps): React.ReactNode => {
  const percentage = Math.floor(
    (user.questionsAnswers / user.questionsAsked) * 100,
  );

  return (
    <div className="flex flex-col gap-7">
      <p className="text-center font-ibm-mono text-sm font-semibold text-tertiary ">
        You’re asking question to
      </p>
      <div className="flex flex-col items-center ">
        <div>
          <LetterAvatar username={user.name} dimension={140} src={user.img} />
        </div>
        <div className="mt-4 w-[200px] overflow-hidden text-ellipsis rounded-lg bg-primary-light px-[18px] py-2 font-ibm-mono text-xs font-semibold tracking-wide text-primary md:text-[13px]">
          {user.walletId}
        </div>
      </div>

      <h2 className="text-center font-neue-regrade text-4xl font-semibold leading-[1]">
        {user.name}
      </h2>

      <div className="flex h-[100px] w-[280px] rounded-2xl border border-brd-clr bg-[#F5F5F5] px-[18px] py-3.5">
        <div className="relative flex-1">
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <circle
              style={{
                fill: "transparent",
                stroke: "#FFDACC",
                strokeWidth: "6",
              }}
              cx="50"
              cy="50"
              r="40"
            ></circle>
            <circle
              style={{
                fill: "transparent",
                stroke: "#FF4700",
                strokeDasharray: "250",
                strokeDashoffset: `calc(250 - (250 * ${Number.isNaN(percentage) ? 0 : percentage}) / 100)`,
                strokeLinecap: "round",
                strokeWidth: "6",
              }}
              cx="50"
              cy="50"
              r="40"
            ></circle>
          </svg>
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-ibm-mono text-base font-semibold tracking-wide text-orange-500 ">
            {Number.isNaN(percentage) ? 0 : percentage + "%"}
          </span>
        </div>

        <div className="flex flex-[2_2_0%] flex-col justify-center gap-2 pl-3 text-xl md:text-2xl">
          <p className="font-inter font-medium tracking-wide">
            <span className="font-semibold">{user.questionsAnswers}</span>
            <span className="font-semibold text-gray-400">
              {" / " + user.questionsAsked}
            </span>
          </p>
          <span className="inline-block font-ibm-mono text-xs font-semibold text-tertiary md:text-sm">
            questions answered
          </span>
        </div>
      </div>
    </div>
  );
};

export default User;
