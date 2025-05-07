import * as CSL from "@emurgo/cardano-serialization-lib-asmjs";
import { BASE_API_URL } from "../data/api"; // Import the BASE_API_URL

// For debugging the entire CSL import:
console.log("Entire CSL module object:", CSL);

import { BrowserWallet, resolveStakeKeyHash } from "@meshsdk/core";
import { convertDRepIdToCIP129 } from "../utils/drepUtils";

const fetchProtocolParametersFromServer = async () => {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching protocol parameters (attempt ${attempt}/${maxRetries})...`);
      console.log(`Using API URL: ${BASE_API_URL}/api/v1/network/protocol-parameters`);
      
      // Add timestamp for request start
      const requestStartTime = Date.now();
      console.log(`[${new Date().toISOString()}] Protocol parameters request started`);
      
      const response = await fetch(`${BASE_API_URL}/api/v1/network/protocol-parameters`, {
        // Add timeout and cache control
        signal: AbortSignal.timeout(30000), 
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // Calculate and log response time
      const responseTime = Date.now() - requestStartTime;
      console.log(`[${new Date().toISOString()}] Protocol parameters response received in ${responseTime}ms with status ${response.status}`);

      if (!response.ok) {
        // Enhanced error logging with response details
        try {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
            console.error(`API Error (${response.status}):`, errorData);
          } catch (e) {
            console.error(`API Error (${response.status}): Non-JSON response:`, errorText.substring(0, 200));
          }
        } catch (readError) {
          console.error(`API Error (${response.status}): Failed to read error response`, readError);
        }
        
        // If we get a 504 or 500, it might be a temporary server issue
        if (response.status === 504 || response.status === 500) {
          throw new Error(`Server temporarily unavailable (${response.status}): Response time: ${responseTime}ms`);
        }
        
        throw new Error(
          `Failed to fetch protocol parameters from server: ${response.status}. Response time: ${responseTime}ms`,
        );
      }

      // Sample the beginning of the response for debugging
      const responseText = await response.text();
      console.log(`Protocol parameters raw response (first 200 chars): ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
      
      let params;
      try {
        params = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse protocol parameters response as JSON:", parseError);
        throw new Error(`Invalid JSON in protocol parameters response`);
      }

      if (!params.linearFee || !params.coinsPerUTxOByte) {
        console.error("Invalid protocol parameters received:", params);
        throw new Error("Fetched protocol parameters are missing crucial fields.");
      }

      console.log("Successfully fetched protocol parameters:", params);
      return params;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Attempt ${attempt} failed: ${errorMessage}`);
      
      if (attempt === maxRetries) {
        // On final attempt, try to use fallback values
        console.warn("All retry attempts failed, using fallback protocol parameters");
        return {
          linearFee: {
            minFeeA: "44",
            minFeeB: "155381"
          },
          coinsPerUTxOByte: "4310",
          poolDeposit: "500000000",
          keyDeposit: "2000000",
          maxValSize: 5000,
          maxTxSize: 16384,
          priceMem: 0.0577,
          priceStep: 0.0000721
        };
      }

      // Wait before retrying with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error("Failed to fetch protocol parameters after all retry attempts");
};

const initTransactionBuilder = async () => {
  const currentProtocolParams = await fetchProtocolParametersFromServer();

  const txBuilder = CSL.TransactionBuilder.new(
    CSL.TransactionBuilderConfigBuilder.new()
      .fee_algo(
        CSL.LinearFee.new(
          CSL.BigNum.from_str(currentProtocolParams.linearFee.minFeeA),
          CSL.BigNum.from_str(currentProtocolParams.linearFee.minFeeB),
        ),
      )
      .pool_deposit(CSL.BigNum.from_str(currentProtocolParams.poolDeposit))
      .key_deposit(CSL.BigNum.from_str(currentProtocolParams.keyDeposit))
      .coins_per_utxo_byte(CSL.BigNum.from_str(currentProtocolParams.coinsPerUTxOByte))
      .max_value_size(currentProtocolParams.maxValSize)
      .max_tx_size(currentProtocolParams.maxTxSize)
      .prefer_pure_change(true)
      .ex_unit_prices(
        CSL.ExUnitPrices.new(
          CSL.UnitInterval.new(
            CSL.BigNum.from_str(String(Math.round(currentProtocolParams.priceMem * 10000))),
            CSL.BigNum.from_str("10000"),
          ),
          CSL.UnitInterval.new(
            CSL.BigNum.from_str(String(Math.round(currentProtocolParams.priceStep * 10000000))),
            CSL.BigNum.from_str("10000000"),
          ),
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

    let targetDRep: CSL.DRep | undefined;
    const upperVoteDelegationTarget = voteDelegationTarget.toUpperCase();

    if (upperVoteDelegationTarget === "ABSTAIN") {
      targetDRep = CSL.DRep.new_always_abstain();
    } else if (upperVoteDelegationTarget === "NO CONFIDENCE") {
      targetDRep = CSL.DRep.new_always_no_confidence();
    } else {
      let dRepIdToParse = voteDelegationTarget;
      try {
        const parsedDRep = CSL.DRep.from_bech32(dRepIdToParse);
        console.log(`Parsed DRep from bech32 ('${dRepIdToParse}'), kind:`, parsedDRep.kind());

        switch (parsedDRep.kind()) {
          case CSL.DRepKind.KeyHash:
            const keyHash = parsedDRep.to_key_hash();
            if (keyHash) {
              targetDRep = CSL.DRep.new_key_hash(keyHash);
            } else {
              throw new Error("Failed to extract key hash from DRep (KeyHash kind).");
            }
            break;
          case CSL.DRepKind.ScriptHash:
            const scriptHash = parsedDRep.to_script_hash();
            if (scriptHash) {
              targetDRep = CSL.DRep.new_script_hash(scriptHash);
            } else {
              throw new Error("Failed to extract script hash from DRep (ScriptHash kind).");
            }
            break;
          case CSL.DRepKind.AlwaysAbstain:
            targetDRep = CSL.DRep.new_always_abstain();
            break;
          case CSL.DRepKind.AlwaysNoConfidence:
            targetDRep = CSL.DRep.new_always_no_confidence();
            break;
          default:
            throw new Error(`Unsupported DRep kind from direct parse: ${parsedDRep.kind()}`);
        }
      } catch (initialParseError) {
        console.warn(
          `Initial DRep.from_bech32 parse failed for '${voteDelegationTarget}': ${initialParseError}. Attempting CIP-105 to CIP-129 conversion.`,
        );
        const convertedDRepId = convertDRepIdToCIP129(voteDelegationTarget);
        if (convertedDRepId) {
          console.log(`Successfully converted DRep ID to CIP-129: '${convertedDRepId}'`);
          try {
            const originalDRepForDebug = CSL.DRep.from_bech32(voteDelegationTarget);
            if (originalDRepForDebug.kind() === CSL.DRepKind.KeyHash) {
              const originalKeyHash = originalDRepForDebug.to_key_hash()?.to_hex();
              const convertedDRepForDebug = CSL.DRep.from_bech32(convertedDRepId);
              if (convertedDRepForDebug.kind() === CSL.DRepKind.KeyHash) {
                const convertedKeyHash = convertedDRepForDebug.to_key_hash()?.to_hex();
                console.log(`[DEBUG] Original DRep KeyHash (CIP-105 style): ${originalKeyHash}, Converted DRep KeyHash (CIP-129 style): ${convertedKeyHash}`);
                if (originalKeyHash !== convertedKeyHash) {
                  console.error("[CRITICAL DEBUG] KeyHash mismatch after conversion! This should not happen.");
                }
              } else {
                console.log("[DEBUG] Converted DRep is not a key hash, skipping direct hash comparison for this path.");
              }
            } else {
              console.log("[DEBUG] Original DRep is not a key hash, skipping direct hash comparison for this path.");
            }
          } catch (debugParseError) {
            console.log("[DEBUG] Could not parse original DRep for key hash comparison:", debugParseError);
          }

          dRepIdToParse = convertedDRepId;
          try {
            const parsedConvertedDRep = CSL.DRep.from_bech32(dRepIdToParse);
            console.log(
              `Parsed DRep from bech32 after conversion ('${dRepIdToParse}'), kind:`,
              parsedConvertedDRep.kind(),
            );
            switch (parsedConvertedDRep.kind()) {
              case CSL.DRepKind.KeyHash:
                const keyHash = parsedConvertedDRep.to_key_hash();
                if (keyHash) {
                  targetDRep = CSL.DRep.new_key_hash(keyHash);
                } else {
                  throw new Error("Failed to extract key hash from converted DRep (KeyHash kind).");
                }
                break;
              case CSL.DRepKind.ScriptHash:
                const scriptHash = parsedConvertedDRep.to_script_hash();
                if (scriptHash) {
                  targetDRep = CSL.DRep.new_script_hash(scriptHash);
                } else {
                  throw new Error("Failed to extract script hash from converted DRep (ScriptHash kind).");
                }
                break;
              default:
                throw new Error(
                  `Unsupported DRep kind after conversion and parse: ${parsedConvertedDRep.kind()}`,
                );
            }
          } catch (parseAfterConversionError) {
            console.error(
              `Error parsing DRep ID '${dRepIdToParse}' even after CIP-129 conversion:`,
              parseAfterConversionError,
            );
            throw new Error(
              `Invalid DRep ID: Failed to parse as standard bech32 or after CIP-129 conversion. Original: '${voteDelegationTarget}'. Attempted: '${dRepIdToParse}'. Error: ${parseAfterConversionError}`,
            );
          }
        } else {
          console.error(
            `CIP-105 to CIP-129 conversion failed for '${voteDelegationTarget}'. Original parse error: ${initialParseError}`,
          );
          throw new Error(
            `Invalid DRep ID: Must be 'ABSTAIN', 'NO CONFIDENCE', a valid CIP-129 DRep ID, or a convertible CIP-105 DRep ID. Original error: ${initialParseError}`,
          );
        }
      }
    }

    if (!stakeCred || !stakeCred.cred) {
      console.error("Stake credential is undefined or invalid for vote delegation.");
      throw Error("No Stake Credential provided or resolved.");
    }
    if (!targetDRep) {
      console.error("Target DRep could not be determined from input:", voteDelegationTarget);
      throw Error("No target DRep could be constructed for vote delegation.");
    }

    const voteDelegationCert = CSL.VoteDelegation.new(stakeCred.cred, targetDRep);
    console.log("Created vote delegation certificate");

    certBuilder.add(CSL.Certificate.new_vote_delegation(voteDelegationCert));
    console.log("Added certificate to builder");

    return certBuilder;
  } catch (err) {
    console.error("Error in buildVoteDelegationCert:", err);
    return null;
  }
};

const getCertBuilder = async () => {
  return CSL.CertificatesBuilder.new();
};

const handleInputToCredential = async (input: string) => {
  try {
    const keyHash = CSL.Ed25519KeyHash.from_hex(input);
    const cred = CSL.Credential.from_keyhash(keyHash);
    return { type: "keyhash", cred: cred };
  } catch (errHex) {
    try {
      const drep = CSL.DRep.from_bech32(input);
      if (drep.kind() === CSL.DRepKind.KeyHash) {
        const keyHash = drep.to_key_hash();
        if (!keyHash) {
          console.error("DRep.from_bech32 parsed as KeyHash, but to_key_hash() returned undefined.");
          return null;
        }
        const cred = CSL.Credential.from_keyhash(keyHash);
        return { type: "keyhash", cred: cred };
      } else if (drep.kind() === CSL.DRepKind.ScriptHash) {
        const scriptHash = drep.to_script_hash();
        if (!scriptHash) {
          console.error("DRep.from_bech32 parsed as ScriptHash, but to_script_hash() returned undefined.");
          return null;
        }
        const cred = CSL.Credential.from_scripthash(scriptHash);
        return { type: "scripthash", cred: cred };
      } else {
        console.error(
          "DRep.from_bech32 parsed a DRep type not suitable for direct credential extraction (e.g., Abstain/NoConfidence):",
          drep.kind(),
        );
        return null;
      }
    } catch (errBech32DRep) {
      console.error(
        "Error parsing credential: Input was not a valid Hex Ed25519KeyHash nor a valid Bech32 DRep ID parsable by DRep.from_bech32().",
      );
      console.error({ errHex_details: errHex, errBech32DRep_details: errBech32DRep });
      return null;
    }
  }
};

const getUtxos = async (name: string): Promise<CSL.TransactionUnspentOutput[]> => {
  const UtxosToProcess: CSL.TransactionUnspentOutput[] = [];
  try {
    const api = await window.cardano[name]?.enable();
    if (!api) throw new Error("Failed to enable cardano API");
    const rawUtxos = await api.getUtxos();

    if (!rawUtxos || rawUtxos.length === 0) {
      console.warn("No UTxOs found in the wallet.");
      return [];
    }

    for (const rawUtxo of rawUtxos) {
      const utxo = CSL.TransactionUnspentOutput.from_bytes(
        new Uint8Array(Buffer.from(rawUtxo, "hex")),
      );
      UtxosToProcess.push(utxo);
    }
    console.log(`Processed ${UtxosToProcess.length} UTxOs from wallet.`);
    return UtxosToProcess;
  } catch (err) {
    console.error("Error in getUtxos:", err);
    throw err;
  }
};

const toTransactionUnspentOutputs = (utxos: CSL.TransactionUnspentOutput[]): CSL.TransactionUnspentOutputs => {
  const txOutputs = CSL.TransactionUnspentOutputs.new();
  for (const utxo of utxos) {
    txOutputs.add(utxo);
  }
  return txOutputs;
};

const fetchCurrentSlotFromServer = async (): Promise<number> => {
  try {
    console.log(`Using API URL: ${BASE_API_URL}/api/v1/network/current-slot`);
    
    // Add timestamp for request start
    const requestStartTime = Date.now();
    console.log(`[${new Date().toISOString()}] Current slot request started`);
    
    const response = await fetch(`${BASE_API_URL}/api/v1/network/current-slot`, {
      signal: AbortSignal.timeout(30000), // Increased to 30 second timeout for production
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    // Calculate and log response time
    const responseTime = Date.now() - requestStartTime;
    console.log(`[${new Date().toISOString()}] Current slot response received in ${responseTime}ms with status ${response.status}`);
    
    if (!response.ok) {
      // Enhanced error logging with response details
      try {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error(`API Error (${response.status}):`, errorData);
        } catch (e) {
          console.error(`API Error (${response.status}): Non-JSON response:`, errorText.substring(0, 200));
        }
      } catch (readError) {
        console.error(`API Error (${response.status}): Failed to read error response`, readError);
      }
      
      throw new Error(
        `Failed to fetch current slot from server: ${response.status}. Response time: ${responseTime}ms`,
      );
    }
    
    // Sample the beginning of the response for debugging
    const responseText = await response.text();
    console.log(`Current slot raw response (first 200 chars): ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse current slot response as JSON:", parseError);
      throw new Error(`Invalid JSON in current slot response`);
    }
    
    if (typeof data.currentSlot !== 'number') {
      console.error("Invalid current slot data from server:", data);
      throw new Error("Invalid current slot data from server: 'currentSlot' is not a number or missing.");
    }
    
    console.log(`Successfully fetched current slot: ${data.currentSlot}`);
    return data.currentSlot;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching current slot from server:", errorMessage);
    throw error;
  }
};

interface TransactionError {
  code?: number;
  info?: string;
  message?: string;
  stack?: string;
}

export const buildSubmitConwayTx = async (
  builderSuccess: boolean,
  wallet: BrowserWallet,
  targetDRep: string,
) => {
  try {
    console.log(`[${new Date().toISOString()}] Starting transaction build process for wallet: ${wallet._walletName}, target DRep: ${targetDRep}`);
    console.log("Building transaction: simple ADA output, CSL handles token change.");
    if (!builderSuccess) {
      throw new Error("Pre-condition for building Tx failed, aborting Tx build.");
    }

    // Fetch protocol parameters
    console.log(`[${new Date().toISOString()}] Fetching protocol parameters...`);
    const protocolParams = await fetchProtocolParametersFromServer();
    console.log(`[${new Date().toISOString()}] Protocol parameters fetched successfully, initializing transaction builder...`);
    const txBuilder = await initTransactionBuilder();
    
    console.log(`[${new Date().toISOString()}] Fetching current slot...`);
    const currentSlot = await fetchCurrentSlotFromServer();

    if (currentSlot !== undefined) {
      console.log(`[${new Date().toISOString()}] Setting transaction validity window: start=${currentSlot}, ttl=${currentSlot + 3600 * 2}`);
      txBuilder.set_validity_start_interval(currentSlot);
      txBuilder.set_ttl(currentSlot + 3600 * 2);
    } else {
      throw new Error("Failed to set TTL, current slot undefined.");
    }

    console.log(`[${new Date().toISOString()}] Building vote delegation certificate...`);
    const certBuilder = await buildVoteDelegationCert(wallet, targetDRep);
    if (!certBuilder) throw new Error("Failed to build vote delegation certificate");
    console.log(`[${new Date().toISOString()}] Vote delegation certificate built successfully, setting certificates in transaction...`);
    txBuilder.set_certs_builder(certBuilder);

    console.log(`[${new Date().toISOString()}] Getting change address...`);
    const changeAddress = await wallet.getChangeAddress();
    console.log(`[${new Date().toISOString()}] Change address: ${changeAddress}`);
    const shelleyChangeAddress = CSL.Address.from_bech32(changeAddress);

    // Fetch all UTxOs from the wallet
    console.log(`[${new Date().toISOString()}] Fetching UTXOs from wallet: ${wallet._walletName}...`);
    const allUtxosFromWallet = await getUtxos(wallet._walletName);
    if (allUtxosFromWallet.length === 0) {
      throw new Error("No UTxOs available in the wallet to build the transaction.");
    }
    
    // Add detailed UTxO logging
    console.log(`[${wallet._walletName}] Processing ${allUtxosFromWallet.length} UTxOs`);
    let totalLovelace = CSL.BigNum.from_str("0");
    for (const utxo of allUtxosFromWallet) {
      const amount = utxo.output().amount().coin();
      totalLovelace = totalLovelace.checked_add(amount);
      console.log(`[${wallet._walletName}] UTxO amount: ${amount.to_str()} lovelace`);
    }
    console.log(`[${wallet._walletName}] Total available lovelace: ${totalLovelace.to_str()}`);

    const txUnspentOutputs = toTransactionUnspentOutputs(allUtxosFromWallet);

    // Let CSL handle input selection and change output automatically
    const strategies = [
      { id: 3, name: "largest first" },
      { id: 2, name: "random improve" },
      { id: 1, name: "random" },
    ];

    let lastError = null;
    for (const strategy of strategies) {
      try {
        console.log(`[${wallet._walletName}] Attempting coin selection strategy ${strategy.id} (${strategy.name})...`);
        
        // For Typhon, we need to ensure we select UTxOs that can cover the minimum UTxO requirement
        // when tokens are present
        if (wallet._walletName.toLowerCase().includes('typhon')) {
          console.log(`[${wallet._walletName}] Using Typhon-specific coin selection approach...`);
          // Find UTxOs that can cover the minimum UTxO requirement
          const selectedUtxos = CSL.TransactionUnspentOutputs.new();
          let totalSelected = CSL.BigNum.from_str("0");
          const minRequired = CSL.BigNum.from_str("5000000"); // 5 ADA minimum
          
          // Sort UTxOs by amount in descending order
          const sortedUtxos = [...allUtxosFromWallet].sort((a, b) => {
            const amountA = a.output().amount().coin();
            const amountB = b.output().amount().coin();
            return amountB.compare(amountA);
          });
          
          // Select UTxOs until we have enough to cover the fee and minimum UTxO
          for (const utxo of sortedUtxos) {
            const amount = utxo.output().amount().coin();
            selectedUtxos.add(utxo);
            totalSelected = totalSelected.checked_add(amount);
            
            // If we have enough to cover the fee and minimum UTxO, stop
            if (totalSelected.compare(minRequired) > 0) {
              break;
            }
          }
          
          if (totalSelected.compare(minRequired) <= 0) {
            throw new Error("No UTxOs found with sufficient ADA to cover minimum UTxO requirement");
          }
          
          console.log(`[${wallet._walletName}] Selected ${selectedUtxos.len()} UTxOs with total of ${totalSelected.to_str()} lovelace for Typhon`);
          
          const changeConfig = CSL.ChangeConfig.new(shelleyChangeAddress);
          txBuilder.add_inputs_from_and_change(selectedUtxos, strategy.id, changeConfig);
        } else {
          // Original behavior for other wallets
          console.log(`[${wallet._walletName}] Using standard coin selection approach...`);
          const changeConfig = CSL.ChangeConfig.new(shelleyChangeAddress);
          txBuilder.add_inputs_from_and_change(txUnspentOutputs, strategy.id, changeConfig);
        }
        
        console.log(`[${wallet._walletName}] Successfully used coin selection strategy ${strategy.id}`);
        
        // Log transaction details after input selection
        const selectedInputs = txBuilder.get_explicit_input();
        console.log(`[${wallet._walletName}] Selected inputs total: ${selectedInputs.coin().to_str()} lovelace`);
        
        // Log fee estimation
        const estimatedFee = txBuilder.min_fee();
        console.log(`[${wallet._walletName}] Estimated fee: ${estimatedFee.to_str()} lovelace`);
        
        break;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn(`[${wallet._walletName}] Coin selection strategy ${strategy.id} (${strategy.name}) failed: ${errorMessage}`);
        lastError = e;
        if (strategy.id === 1) {
          throw new Error(
            `All coin selection strategies failed. Last error: ${lastError}. Please ensure you have enough ADA to cover the transaction fee.`,
          );
        }
      }
    }

    // Build transaction body
    console.log(`[${new Date().toISOString()}] Building transaction body...`);
    const txBody = txBuilder.build();
    console.log(`[${new Date().toISOString()}] Transaction body built. Fee: ${txBuilder.get_fee_if_set()?.to_str() || "unknown"}`);

    // Log outputs for debugging
    const outputs = txBody.outputs();
    console.log(`[${new Date().toISOString()}] Transaction has ${outputs.len()} outputs:`);
    for (let i = 0; i < outputs.len(); i++) {
      const output = outputs.get(i);
      console.log(`[${new Date().toISOString()}] Output ${i} value: ${output.amount().coin().to_str()} lovelace, address: ${output.address().to_bech32()}`);
    }

    console.log(`[${new Date().toISOString()}] Preparing transaction for signing...`);
    const unsignedWitnessSet = CSL.TransactionWitnessSet.new();
    const unsignedTx = CSL.Transaction.new(txBody, unsignedWitnessSet);
    const unsignedTxCborHex = Buffer.from(unsignedTx.to_bytes()).toString("hex");
    console.log(`[${new Date().toISOString()}] Unsigned transaction size: ${unsignedTx.to_bytes().length} bytes`);

    console.log(`[${new Date().toISOString()}] Requesting wallet signature from ${wallet._walletName}...`);
    try {
      const signedTxCborHex = await wallet.signTx(unsignedTxCborHex, false);
      console.log(`[${new Date().toISOString()}] Transaction signed successfully by ${wallet._walletName}`);
      console.log(`[${new Date().toISOString()}] Signed Transaction CBOR Hex (first 100 chars): ${signedTxCborHex.substring(0, 100)}...`);

      const signedTx = CSL.Transaction.from_bytes(new Uint8Array(Buffer.from(signedTxCborHex, "hex")));
      console.log(`[${new Date().toISOString()}] Signed transaction size: ${signedTx.to_bytes().length} bytes`);

      return await submitConwayTx(signedTx, wallet, targetDRep);
    } catch (signError) {
      const errorMessage = signError instanceof Error ? signError.message : String(signError);
      console.error(`[${new Date().toISOString()}] Error during transaction signing with ${wallet._walletName}: ${errorMessage}`);
      throw new Error(`Transaction signing failed with ${wallet._walletName}: ${errorMessage}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[${new Date().toISOString()}] App.buildSubmitConwayTx error: ${errorMessage}`);
    throw new Error(`Delegation failed: ${errorMessage}`);
  }
};

const submitConwayTx = async (
  signedTx: CSL.Transaction,
  wallet: BrowserWallet,
  targetDRep?: string,
) => {
  try {
    console.log(`[${new Date().toISOString()}] Preparing to submit transaction with wallet: ${wallet._walletName}`);
    const txBytes = signedTx.to_bytes();
    const txHex = Buffer.from(txBytes).toString("hex");

    console.log(`[${new Date().toISOString()}] Transaction details before submission:`, {
      size: txBytes.length,
      bodySize: signedTx.body().to_bytes().length,
      witnessSetSize: signedTx.witness_set().to_bytes().length,
      inputs: signedTx.body().inputs().len(),
      outputs: signedTx.body().outputs().len(),
      fee: signedTx.body().fee().to_str(),
      ttl: signedTx.body().ttl(),
      validityStart: signedTx.body().validity_start_interval()
    });

    // Special handling for Typhon
    if (wallet._walletName.toLowerCase().includes('typhon')) {
      console.log(`[${new Date().toISOString()}] [Typhon] Attempting to submit transaction with special handling`);
      try {
        // Log the full transaction details
        console.log(`[${new Date().toISOString()}] [Typhon] Full transaction details:`, {
          txHexLength: txHex.length,
          bodyHexLength: signedTx.body().to_hex().length,
          witnessSetHexLength: signedTx.witness_set().to_hex().length,
          size: txBytes.length,
          inputs: signedTx.body().inputs().len(),
          outputs: signedTx.body().outputs().len(),
          fee: signedTx.body().fee().to_str(),
          ttl: signedTx.body().ttl(),
          validityStartInterval: signedTx.body().validity_start_interval()
        });

        // For Typhon, we need to ensure we have a proper change output
        const outputs = signedTx.body().outputs();
        if (outputs.len() === 1 && targetDRep) {
          console.log(`[${new Date().toISOString()}] [Typhon] Single output detected, attempting to add change output`);
          const txBuilder = await initTransactionBuilder();
          const changeAddress = await wallet.getChangeAddress();
          const shelleyChangeAddress = CSL.Address.from_bech32(changeAddress);
          
          // Rebuild the transaction with proper change output
          const certBuilder = await buildVoteDelegationCert(wallet, targetDRep);
          if (!certBuilder) throw new Error("Failed to build vote delegation certificate");
          txBuilder.set_certs_builder(certBuilder);
          
          // Use the same UTxO selection strategy
          const allUtxosFromWallet = await getUtxos(wallet._walletName);
          const txUnspentOutputs = toTransactionUnspentOutputs(allUtxosFromWallet);
          const changeConfig = CSL.ChangeConfig.new(shelleyChangeAddress);
          txBuilder.add_inputs_from_and_change(txUnspentOutputs, 3, changeConfig);
          
          // Build and sign the new transaction
          const newTxBody = txBuilder.build();
          const newUnsignedWitnessSet = CSL.TransactionWitnessSet.new();
          const newUnsignedTx = CSL.Transaction.new(newTxBody, newUnsignedWitnessSet);
          const newUnsignedTxCborHex = Buffer.from(newUnsignedTx.to_bytes()).toString("hex");
          
          console.log(`[${new Date().toISOString()}] [Typhon] Requesting signature for rebuilt transaction`);
          const newSignedTxCborHex = await wallet.signTx(newUnsignedTxCborHex, false);
          const newSignedTx = CSL.Transaction.from_bytes(new Uint8Array(Buffer.from(newSignedTxCborHex, "hex")));
          
          console.log(`[${new Date().toISOString()}] [Typhon] New transaction details:`, {
            size: newSignedTx.to_bytes().length,
            inputs: newSignedTx.body().inputs().len(),
            outputs: newSignedTx.body().outputs().len(),
            fee: newSignedTx.body().fee().to_str()
          });
          
          // Submit the new transaction
          console.log(`[${new Date().toISOString()}] [Typhon] Submitting rebuilt transaction...`);
          const submitStartTime = Date.now();
          const result = await wallet.submitTx(Buffer.from(newSignedTx.to_bytes()).toString("hex"));
          const submitDuration = Date.now() - submitStartTime;
          console.log(`[${new Date().toISOString()}] [Typhon] Successfully submitted rebuilt transaction in ${submitDuration}ms:`, result);
          return Buffer.from(newSignedTx.to_bytes()).toString("hex");
        }

        // If we already have multiple outputs, try submitting as is
        try {
          console.log(`[${new Date().toISOString()}] [Typhon] Submitting original transaction...`);
          const submitStartTime = Date.now();
          const result = await wallet.submitTx(txHex);
          const submitDuration = Date.now() - submitStartTime;
          console.log(`[${new Date().toISOString()}] [Typhon] Successfully submitted original transaction in ${submitDuration}ms:`, result);
          return txHex;
        } catch (rawTxError) {
          const errorMessage = rawTxError instanceof Error ? rawTxError.message : String(rawTxError);
          console.warn(`[${new Date().toISOString()}] [Typhon] Raw transaction submission failed: ${errorMessage}`);
          throw rawTxError;
        }
      } catch (typhonError) {
        const errorMessage = typhonError instanceof Error ? typhonError.message : String(typhonError);
        console.error(`[${new Date().toISOString()}] [Typhon] Error with special submission: ${errorMessage}`);
        throw typhonError;
      }
    }

    // Normal submission for all wallets
    console.log(`[${new Date().toISOString()}] Submitting transaction using ${wallet._walletName}...`);
    const submitStartTime = Date.now();
    const result = await wallet.submitTx(txHex);
    const submitDuration = Date.now() - submitStartTime;
    console.log(`[${new Date().toISOString()}] Transaction submitted successfully in ${submitDuration}ms, hash: ${result}`);
    return txHex;
  } catch (err) {
    const txError = err as TransactionError;
    console.error(`[${new Date().toISOString()}] Error during submission of transaction:`, {
      error: err,
      code: txError.code,
      info: txError.info,
      message: txError.message,
      stack: txError.stack,
    });

    if (txError.code === 2) {
      throw new Error(
        `Transaction submission failed: ${txError.info || "Unknown validation error"}. Please check your wallet balance and network connection.`,
      );
    } else if (txError.code === 1) {
      throw new Error("Transaction submission failed: Network error. Please check your internet connection.");
    } else {
      throw new Error(`Transaction submission failed: ${txError.message || "Unknown error"}`);
    }
  }
};