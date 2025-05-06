import { create } from "zustand";

interface WalletState {
  connected: boolean;
  connecting: boolean;
  stake_address: string | null;
  delegatedTo: {
    pool_id: string | null;
    active: boolean;
  };
  is_admin: { active: boolean; drep_id: string | null };

  saveWallet: (props: {
    connected: boolean;
    stake_address: string | null;
    delegatedTo: {
      pool_id: string | null;
      active: boolean;
    };
    is_admin: { active: boolean; drep_id: string | null };
  }) => void;
  setConnecting: (prop: boolean) => void;
}

export const useWalletStore = create<WalletState>()((set) => ({
  connected: false,
  connecting: false,
  stake_address: null,
  delegatedTo: {
    pool_id: null,
    active: false,
  },
  is_admin: {
    active: false,
    drep_id: null
  },
  saveWallet: (props) =>
    set({
      connected: props.connected,
      stake_address: props.stake_address,
      delegatedTo: {
        active: props.delegatedTo.active,
        pool_id: props.delegatedTo.pool_id,
      },
      is_admin: props.is_admin,
    }),
  setConnecting(prop) {
    set({ connecting: prop });
  },
}));
