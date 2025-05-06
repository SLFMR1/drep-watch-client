import { BsChatQuoteFill } from "react-icons/bs";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Transaction } from "@meshsdk/core";
import { useWallet } from "@meshsdk/react";
import LetterAvatar from "../letter-avatar";
import toast from "react-hot-toast";
import { useWalletStore } from "~/store/wallet";
import { buildSubmitConwayTx } from "~/core/delegateVote";

interface ProfileCardProps {
  test?: string;
  drep?: Drep;
}
interface Drep {
  drep_id: string;
  // created_at: string;
  givenName: string | null;
  image: string | null;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  drep,
}: ProfileCardProps): React.ReactNode => {
  const { wallet, connected } = useWallet();
  const { delegatedTo } = useWalletStore();
  const onDelegate = async () => {
    try {
      if (!connected) {
        toast.error("Please connect your wallet to delegate.");
        return;
      }

      const address = (await wallet.getRewardAddresses())[0];

      if (!address) {
        return;
      }

      const poolId = drep?.drep_id;

      if (!poolId) {
        return;
      }

      const txHash = await buildSubmitConwayTx(true, wallet, poolId);

      if (txHash) {
        toast.success(
          `Successfully delegated to ${poolId}. Transaction Hash: ${txHash}`,
        );
      } else {
        throw new Error("Failed to delegate. Please try again.");
      }
      
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
      console.log(error);
    }
  };
  return (
    <motion.div
      className="flex flex-col rounded-xl border border-brd-clr"
      whileHover={{ y: -6 }}
    >
      <Link
        href={`/profile/${drep?.drep_id}`}
        className="mx-[18px] my-4 flex items-center justify-between"
      >
        <LetterAvatar
          rounded
          username={(drep?.drep_id ?? "").slice(5)}
          src={drep?.image}
          dimension={55}
        />

        <div className="w-[200px] overflow-hidden text-ellipsis rounded-[10px] bg-tertiary-light px-4 py-3 font-ibm-mono text-sm font-medium tracking-wide text-tertiary">
          {drep?.drep_id.slice(0, 32)}...
        </div>
      </Link>
      <div className="border-y border-brd-clr bg-[#F5F5F5] p-3 text-center font-inter text-sm font-semibold tracking-wide text-secondary md:p-5 md:text-base">
        {drep?.givenName ?? `${drep?.drep_id.slice(0, 32)}...`}
      </div>
      <Link
        href={`/ask-question?to=${drep?.drep_id}`}
        className="mx-[18px] my-3 flex items-center  justify-center gap-2.5 rounded-[10px] border border-[#E6E6E6] bg-primary-light py-3 text-primary md:py-4 "
      >
        <BsChatQuoteFill className="text-lg md:text-xl" />
        <div className="font-inter text-xs font-semibold tracking-wide md:text-sm ">
          Ask question
        </div>
      </Link>

      <div className="mx-[18px] mb-3 flex items-center  justify-center py-3 font-inter text-xs font-medium tracking-wide text-secondary md:py-4 md:text-sm">
        <Link
          href={`/profile/${drep?.drep_id}`}
          className="flex w-full flex-1 items-center justify-center hover:text-primary "
        >
          View profile
        </Link>
        <div className="h-full w-[1px] bg-[#0000002E]"></div>
        <motion.button
          onClick={() => onDelegate()}
          className="flex w-full flex-1 items-center justify-center hover:text-primary disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:text-inherit"
          whileHover={{ scaleX: 1.05 }}
          whileTap={{ scaleX: 0.95 }}
        >
          Delegate
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ProfileCard;
