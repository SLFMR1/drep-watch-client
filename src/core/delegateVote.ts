import {
  Address,
  TransactionUnspentOutput,
  TransactionUnspentOutputs,
  TransactionOutput,
  Value,
  TransactionBuilder,
  TransactionBuilderConfigBuilder,
  LinearFee,
  BigNum,
  TransactionWitnessSet,
  Transaction as CTransaction,
  Credential,
  Certificate,
  Ed25519KeyHash,
  CertificatesBuilder,
  VoteDelegation,
  DRep,
  UnitInterval,
  ChangeConfig,
  ExUnitPrices,
} from "@emurgo/cardano-serialization-lib-asmjs";
import { BrowserWallet, resolveStakeKeyHash, Wallet } from "@meshsdk/core";

const protocolParams = {
  linearFee: {
    minFeeA: "44",
    minFeeB: "155381",
  },
  minUtxo: "1000000",
  poolDeposit: "500000000",
  keyDeposit: "2000000",
  maxValSize: 5000,
  maxTxSize: 16384,
  priceMem: 0.0577,
  priceStep: 0.0000721,
  coinsPerUTxOByte: "4310",
};

const initTransactionBuilder = async () => {
  const txBuilder = TransactionBuilder.new(
    TransactionBuilderConfigBuilder.new()
      .fee_algo(
        LinearFee.new(
          BigNum.from_str(protocolParams.linearFee.minFeeA),
          BigNum.from_str(protocolParams.linearFee.minFeeB),
        ),
      )
      .pool_deposit(BigNum.from_str(protocolParams.poolDeposit))
      .key_deposit(BigNum.from_str(protocolParams.keyDeposit))
      .coins_per_utxo_byte(BigNum.from_str(protocolParams.coinsPerUTxOByte))
      .max_value_size(protocolParams.maxValSize)
      .max_tx_size(protocolParams.maxTxSize)
      .prefer_pure_change(true)
      .ex_unit_prices(
        ExUnitPrices.new(
          UnitInterval.new(BigNum.from_str("577"), BigNum.from_str("10000")),
          UnitInterval.new(BigNum.from_str("721"), BigNum.from_str("10000000")),
        ),
      )
      .build(),
  );
  return txBuilder;
};

const buildVoteDelegationCert = async (
  wallet: BrowserWallet,
  voteDelegationTarget: string,
) => {
  let certBuilder = await getCertBuilder();
  console.log("Adding vote delegation cert to transaction");
  try {
    const [stakekey] = await wallet.getRewardAddresses();
    const stakeCred = await handleInputToCredential(
      resolveStakeKeyHash(stakekey ?? ""),
    );

    let targetDRep;
    if (voteDelegationTarget.toUpperCase() === "ABSTAIN") {
      targetDRep = DRep.new_always_abstain();
    } else if (voteDelegationTarget.toUpperCase() === "NO CONFIDENCE") {
      targetDRep = DRep.new_always_no_confidence();
    } else {
      const dRepKeyCred = await handleInputToCredential(voteDelegationTarget);

      const dRepKeyCredHash = dRepKeyCred?.to_keyhash();

      targetDRep = dRepKeyCredHash ? DRep.new_key_hash(dRepKeyCredHash) : null;
    }

    if (!stakeCred) throw Error("No Stake Cred");
    if (!targetDRep) throw Error("No target DRep");

    // Create cert object
    const voteDelegationCert = VoteDelegation.new(stakeCred, targetDRep);
    // add cert to certBuilder
    certBuilder.add(Certificate.new_vote_delegation(voteDelegationCert));

    return certBuilder;
  } catch (err) {
    console.log(err);
    return null;
  }
};

const getCertBuilder = async () => {
  const certBuilder = null;
  if (certBuilder) {
    return certBuilder;
  } else {
    return CertificatesBuilder.new();
  }
};

const handleInputToCredential = async (input: string) => {
  try {
    const keyHash = Ed25519KeyHash.from_hex(input);
    const cred = Credential.from_keyhash(keyHash);
    return cred;
  } catch (err1) {
    try {
      const keyHash = Ed25519KeyHash.from_bech32(input);
      const cred = Credential.from_keyhash(keyHash);
      return cred;
    } catch (err2) {
      console.error("Error in parsing credential, not Hex or Bech32:");
      console.error(err1, err2);
      return null;
    }
  }
};

const getUtxos = async (name: string) => {
  let Utxos = [];
  try {
    const api = await window.cardano[name]?.enable();
    if (!api) throw new Error("Failed to enable cardano API");
    const rawUtxos = await api.getUtxos();
    for (const rawUtxo of rawUtxos ?? []) {
      const utxo = TransactionUnspentOutput.from_bytes(
        Buffer.from(rawUtxo, "hex"),
      );
      const input = utxo.input();
      const txid = Buffer.from(input.transaction_id().to_bytes()).toString(
        "hex",
      );
      const txindx = input.index();
      const output = utxo.output();
      const amount = output.amount().coin().to_str(); // ADA amount in lovelace
      const multiasset = output.amount().multiasset();
      let multiAssetStr = "";
      if (multiasset) {
        const keys = multiasset.keys(); // policy Ids of the multiasset
        const N = keys.len();
        for (let i = 0; i < N; i++) {
          const policyId = keys.get(i);
          const policyIdHex = Buffer.from(policyId.to_bytes()).toString("hex");
          const assets = multiasset.get(policyId);
          if (!assets) continue;
          const assetNames = assets.keys();
          const K = assetNames.len();

          for (let j = 0; j < K; j++) {
            const assetName = assetNames.get(j);
            const assetNameString = Buffer.from(assetName.name()).toString();
            const assetNameHex = Buffer.from(assetName.name()).toString("hex");
            const multiassetAmt = multiasset.get_asset(policyId, assetName);
            multiAssetStr += `+ ${multiassetAmt.to_str()} + ${policyIdHex}.${assetNameHex} (${assetNameString})`;
          }
        }
      }
      const obj = {
        txid: txid,
        txindx: txindx,
        amount: amount,
        str: `${txid} #${txindx} = ${amount}`,
        multiAssetStr: multiAssetStr,
        TransactionUnspentOutput: utxo,
      };
      Utxos.push(obj);
    }

    return Utxos;
  } catch (err) {
    console.log(err);
  }
};

const getTxUnspentOutputs = async (name: string) => {
  let txOutputs = TransactionUnspentOutputs.new();
  const Utxos = await getUtxos(name);
  for (const utxo of Utxos ?? []) {
    txOutputs.add(utxo.TransactionUnspentOutput);
  }
  return txOutputs;
};

export const buildSubmitConwayTx = async (
  builderSuccess: boolean,
  wallet: BrowserWallet,
  targetDRep: string,
) => {
  try {
    console.log("Building, signing and submitting transaction");
    // Abort if error before building Tx
    if (!(await builderSuccess)) {
      throw new Error("Error before building Tx, aborting Tx build.");
    }
    // Initialize builder with protocol parameters
    const txBuilder = await initTransactionBuilder();
    const transactionWitnessSet = TransactionWitnessSet.new();

    // Add certs, votes, gov actions or donation to the transaction

    const certBuilder = await buildVoteDelegationCert(wallet, targetDRep);

    if (certBuilder) {
      txBuilder.set_certs_builder(certBuilder);
    }

    const [usedAddress] = await wallet.getUsedAddresses();
    const changeAddress = await wallet.getChangeAddress();

    // Set output and change addresses to those of our wallet
    const shelleyOutputAddress = Address.from_bech32(usedAddress ?? "");
    const shelleyChangeAddress = Address.from_bech32(changeAddress);

    // Add output of 1 ADA plus total needed for refunds
    let outputValue = BigNum.from_str("1000000");

    // Ensure the total output is larger than total implicit inputs (refunds / withdrawals)
    if (!txBuilder.get_implicit_input().is_zero()) {
      outputValue = outputValue.checked_add(
        txBuilder.get_implicit_input().coin(),
      );
    }

    // add output to the transaction
    txBuilder.add_output(
      TransactionOutput.new(shelleyOutputAddress, Value.new(outputValue)),
    );
    // Find the available UTxOs in the wallet and use them as Inputs for the transaction
    await getUtxos(wallet._walletName);
    const txUnspentOutputs = await getTxUnspentOutputs(wallet._walletName);

    // Use UTxO selection strategy 2 and add change address to be used if needed
    const changeConfig = ChangeConfig.new(shelleyChangeAddress);

    // Use UTxO selection strategy 2 if strategy 3 fails
    try {
      txBuilder.add_inputs_from_and_change(txUnspentOutputs, 3, changeConfig);
    } catch (e) {
      console.error(e);
      txBuilder.add_inputs_from_and_change(txUnspentOutputs, 2, changeConfig);
    }

    // Build transaction body
    const txBody = txBuilder.build();
    // Make a full transaction, passing in empty witness set
    const tx = CTransaction.new(
      txBody,
      TransactionWitnessSet.from_bytes(transactionWitnessSet.to_bytes()),
    );

    // Ask wallet to to provide signature (witnesses) for the transaction
    let txVkeyWitnesses;
    // Log the CBOR of tx to console
    console.log("UnsignedTx: ", Buffer.from(tx.to_bytes()).toString("hex"));
    txVkeyWitnesses = await wallet.signTx(
      Buffer.from(tx.to_bytes()).toString("hex"),
      true,
    );
    // Create witness set object using the witnesses provided by the wallet
    txVkeyWitnesses = TransactionWitnessSet.from_bytes(
      Buffer.from(txVkeyWitnesses, "hex"),
    );
    if (txVkeyWitnesses.vkeys()) {
      const vkeys = txVkeyWitnesses.vkeys();
      if (vkeys) {
        transactionWitnessSet.set_vkeys(vkeys);
      } else {
        console.error("vkeys is undefined");
        throw new Error("vkeys is undefined");
      }
    }
    // Build transaction with witnesses
    const signedTx = CTransaction.new(tx.body(), transactionWitnessSet);

    console.log("SignedTx: ", Buffer.from(signedTx.to_bytes()).toString("hex"));

    const result = await submitConwayTx(signedTx, wallet);

    if (result) {
      return result;
    }
  } catch (err) {
    console.error("App.buildSubmitConwayTx", err);
  }
};

const submitConwayTx = async (
  signedTx: CTransaction,
  wallet: BrowserWallet,
) => {
  try {
    const result = await wallet.submitTx(
      Buffer.from(signedTx.to_bytes()).toString("hex"),
    );
    console.log("Submitted transaction hash", result);
    // Set results so they can be rendered
    const cip95ResultTx = Buffer.from(signedTx.to_bytes()).toString("hex");

    console.log(cip95ResultTx);
    return cip95ResultTx;
  } catch (err) {
    console.log("Error during submission of transaction");
    console.log(err);
    return null;
  }
};
