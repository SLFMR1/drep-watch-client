import { useQuery } from "@tanstack/react-query";
import { Drep, DrepResponse } from "~/types";
import { useState, useEffect, useCallback } from "react";
import Loader from "~/components/loader";
import ErrorCard from "~/components/cards/error";
import Link from "next/link";
import LetterAvatar from "~/components/letter-avatar";
import { useWallet } from "@meshsdk/react";
import { useWalletStore } from "~/store/wallet";
import { motion } from "framer-motion";
import { BsChatQuoteFill } from "react-icons/bs";
import toast from "react-hot-toast";
import { buildSubmitConwayTx } from "~/core/delegateVote";
import axios from "axios";
import { BASE_API_URL } from "~/data/api";
import { MdContentCopy, MdClear } from "react-icons/md";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { IoPlayBack, IoPlayForward } from "react-icons/io5";
import { FiSearch } from "react-icons/fi";
import Metatags from "~/components/metatags";
import { BrowserWallet } from "@meshsdk/core";

// Type for the Drep object from the indexed 'dreps' table
interface IndexedDrep {
  id: number;
  created_at: string;
  name: string | null;
  drep_id: string;
  email: string | null;
  wallet_address: string | null;
  search_variants: string | null;
  image_url: string | null;
  status: string | null; // 'active' | 'inactive' | null
  questions_asked_count: number | null;
  questions_answered_count: number | null;
  voting_power: number | null; 
  vote_yes: number | null;
  vote_no: number | null;
  vote_abstain: number | null;
}

// Interface for the response from the /indexed endpoint
interface IndexedDrepPaginatedResponse {
  dreps: IndexedDrep[];
  nextPage: number | null;
  totalDreps?: number; 
  message?: string; 
}

// Kept for search, though response is now IndexedDrep[]
interface SearchResult { 
  drep_id: string;
  active: boolean;
  image: string | null;
  givenName: string | null;
}

// Type for debounce function
type DebounceFunction = (...p: any[]) => any;

// Debounce function to limit API calls
function debounce(fn: DebounceFunction, t: number): DebounceFunction {
  let timeout: ReturnType<typeof setTimeout>;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn(...args);
    }, t);
  };
}

// Constants
const DREPS_PER_PAGE = 100;

// --- Sorting Options --- 
type SortOptionValue = 
  | 'questions_answered_count_desc'
  | 'questions_asked_count_desc'
  | 'name_asc'
  | 'name_desc'
  | 'voting_power_desc'
  | 'vote_yes_desc'
  | 'vote_no_desc'
  | 'vote_abstain_desc';

const sortOptions: { value: SortOptionValue; label: string }[] = [
  { value: 'questions_answered_count_desc', label: 'Questions Answered (High to Low)' }, // Default
  { value: 'questions_asked_count_desc', label: 'Questions Asked (High to Low)' },
  { value: 'name_asc', label: 'Name (A to Z)' },
  { value: 'name_desc', label: 'Name (Z to A)' },
  { value: 'voting_power_desc', label: 'Voting Power (High to Low)' },
  { value: 'vote_yes_desc', label: 'Yes Votes (High to Low)' },
  { value: 'vote_no_desc', label: 'No Votes (High to Low)' },
  { value: 'vote_abstain_desc', label: 'Abstain Votes (High to Low)' },
];
// --- End Sorting Options --- 

const ExplorerPage = () => {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDreps, setTotalDreps] = useState(0);
  const { connected, wallet } = useWallet();
  const { delegatedTo } = useWalletStore();
  const [processedData, setProcessedData] = useState<{
    dreps: Drep[];
    nextPage: number | null;
  } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [fetchSource, setFetchSource] = useState<"indexed" | "fallback" | "unknown">("unknown");

  // --- Sorting State --- 
  const [sortBy, setSortBy] = useState<SortOptionValue>('questions_answered_count_desc'); // Default sort
  // --- End Sorting State --- 

  // Search related state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Drep[]>([]); 

  // Query to fetch the total count of indexed DREPs
  const { data: countData, isLoading: isLoadingCount, error: countError, refetch: refetchCount } = useQuery<{ count: number }>({
    queryKey: ["indexed-dreps-count"],
    queryFn: async () => {
      console.log("Fetching total indexed DREPs count...");
      const response = await axios.get(`${BASE_API_URL}/api/v1/drep/indexed/count`);
      console.log("Received count data:", response.data);
      if (!response.data || typeof response.data.count !== 'number') {
        throw new Error("Invalid count data received");
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, 
    refetchOnWindowFocus: false,
  });

  // Effect to update totalDreps and totalPages based on the fetched count
  useEffect(() => {
    if (countData && countData.count > 0) {
      const fetchedTotalDreps = countData.count;
      const calculatedTotalPages = Math.ceil(fetchedTotalDreps / DREPS_PER_PAGE);
      console.log(`Setting totals from count: Dreps=${fetchedTotalDreps}, Pages=${calculatedTotalPages}`);
      setTotalDreps(fetchedTotalDreps);
      setTotalPages(calculatedTotalPages);
    } else if (countError) {
      console.error("Error fetching total count, cannot set totals:", countError);
      setTotalDreps(0);
      setTotalPages(0);
    }
  }, [countData, countError]);

  // Search function with debounce (uses /indexed/search, with fallback to /query)
  const handleSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      let resultsFoundInIndex = false;
      let formattedResults: Drep[] = [];

      try {
        // --- Step 1: Try searching the indexed endpoint --- 
        console.log(`[Search] Attempting indexed search for: "${query}"`);
        const { data: indexedData } = await axios.get<IndexedDrep[]>(
          `${BASE_API_URL}/api/v1/drep/indexed/search?query=${encodeURIComponent(query)}` // Use 'query' param
        );
        
        if (Array.isArray(indexedData) && indexedData.length > 0) {
          console.log(`[Search] Found ${indexedData.length} result(s) in index.`);
          resultsFoundInIndex = true;
          // Map IndexedDrep to Drep for UI consistency
          formattedResults = indexedData.map(item => ({
            drep_id: item.drep_id,
            givenName: item.name, 
            image: item.image_url,
            active: item.status === 'active', 
            questionsAsked: item.questions_asked_count ?? 0, 
            questionsAnswers: item.questions_answered_count ?? 0,
            voting_power: item.voting_power,
            votesYes: item.vote_yes ?? 0,
            votesNo: item.vote_no ?? 0,
            votesAbstain: item.vote_abstain ?? 0
          }));
        } else {
          console.log(`[Search] No results found in index for: "${query}"`);
        }

        // --- Step 2: If indexed search failed AND it looks like an ID, try fallback --- 
        if (!resultsFoundInIndex && query.startsWith('drep1')) {
          console.log(`[Search] Indexed search failed for ID, attempting fallback query to /drep/query...`);
          try {
            const { data: fallbackData } = await axios.get<{
              drep_id: string;
              active: boolean;
              image: string | null;
              givenName: string | null;
            }[] | { // Handle single object response as well
              drep_id: string;
              active: boolean;
              image: string | null;
              givenName: string | null;
            }>(
              `${BASE_API_URL}/api/v1/drep/query?search_query=${encodeURIComponent(query)}`
            );
            
            // Normalize fallback data (can be single object or array)
            const fallbackArray = Array.isArray(fallbackData) ? fallbackData : [fallbackData];

            if (fallbackArray.length > 0 && fallbackArray[0]?.drep_id) {
               console.log(`[Search] Found ${fallbackArray.length} result(s) via fallback /query.`);
               // Map fallback data to Drep type (needs questions counts - default to 0)
               // NOTE: Fallback data from /query likely won't have question counts readily available.
               // We might need another call or just display 0 for fallback search results.
               formattedResults = fallbackArray.map(item => ({
                 drep_id: item.drep_id,
                 givenName: item.givenName,
                 image: item.image,
                 active: item.active, 
                 questionsAsked: 0, // Fallback doesn't provide this easily
                 questionsAnswers: 0, // Fallback doesn't provide this easily
                 voting_power: null, // Keep as null (consistent with number | null)
                 votesYes: 0,
                 votesNo: 0,
                 votesAbstain: 0
               }));
            } else {
              console.log(`[Search] No results found via fallback /query for: "${query}"`);
            }
          } catch (fallbackError) {
            console.error(`[Search] Fallback /query error for "${query}":`, fallbackError);
            // Keep formattedResults empty if fallback also fails
          }
        }
        
        // --- Step 3: Update state with results (if any) --- 
        setSearchResults(formattedResults);

      } catch (err) {
        // Catch errors from the initial indexed search attempt
        console.error("[Search] Initial indexed search error:", err);
        setSearchResults([]); // Clear results on error
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );
  
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  // --- Updated Query with Sorting --- 
  const { data: drepsData, isLoading, error, refetch } = useQuery<DrepResponse>({
    // Query key now includes sort criteria
    queryKey: ["explorer-dreps", page, sortBy], 
    queryFn: async (): Promise<DrepResponse> => {
      let source: "indexed" | "fallback" = "indexed"; 
      try {
        // Extract sortBy field and sortOrder from state
        const [sortField, sortDirection] = sortBy.split('_').slice(-2);
        const sortParam = sortBy.replace(`_${sortDirection}`, '');
        const orderParam = sortDirection;

        console.log(`Attempting indexed fetch: page ${page}, sortBy ${sortParam}, sortOrder ${orderParam}`);
        
        const response = await axios.get<IndexedDrepPaginatedResponse>(
          `${BASE_API_URL}/api/v1/drep/indexed?page=${page}&limit=${DREPS_PER_PAGE}&sortBy=${sortParam}&sortOrder=${orderParam}`
        );
        const data = response.data;
        
        // Log the raw data received from the indexed endpoint
        console.log("[Explorer Fetch] Raw indexed data received:", data);
        
        if (response.status !== 200 || !data || !Array.isArray(data.dreps)) {
           throw new Error(data.message || 'Invalid response from indexed endpoint');
        }

        console.log(`Success: Fetched ${data.dreps.length} from indexed.`);
        setFetchSource("indexed"); // Set source to indexed on success

        // Filter out unnamed dreps only if sorting by name
        const filteredDreps = (sortBy === 'name_asc' || sortBy === 'name_desc')
          ? data.dreps.filter(item => item.name && item.name.trim() !== '')
          : data.dreps;

        console.log(`Mapped ${filteredDreps.length} dreps after potential name filtering.`);

        const mappedDreps: Drep[] = filteredDreps.map(item => ({
          drep_id: item.drep_id,
          givenName: item.name,
          image: item.image_url,
          active: item.status === 'active',
          questionsAsked: item.questions_asked_count ?? 0,
          questionsAnswers: item.questions_answered_count ?? 0,
          voting_power: item.voting_power,
          votesYes: item.vote_yes ?? 0,
          votesNo: item.vote_no ?? 0,
          votesAbstain: item.vote_abstain ?? 0
        }));

        return {
          dreps: mappedDreps,
          nextPage: data.nextPage,
          questionAnswers: false, 
        };

      } catch (indexedError) {
        console.warn("Indexed fetch failed, attempting fallback:", indexedError);
        source = "fallback";
        setFetchSource("fallback"); // Set source to fallback on error

        try {
          console.log(`Fallback fetch: page ${page} (sorting disabled)`);
          // Fallback doesn't support sorting
          const fallbackResponse = await axios.get(`${BASE_API_URL}/api/v1/drep?page=${page}`);
          const fallbackData = fallbackResponse.data;
          
          let dreps = [];
          let nextPage = null;
          
          if (fallbackData && typeof fallbackData === 'object' && 'dreps' in fallbackData && 
              (fallbackData.dreps === 'Memcached server authentication failed!' || 
               fallbackData.dreps === 'Database connection error')) {
            console.error("DB error in fallback:", fallbackData.dreps);
            throw new Error("Database connection error"); 
          }
          
          if (Array.isArray(fallbackData)) {
            dreps = fallbackData;
            nextPage = dreps.length < DREPS_PER_PAGE ? null : page + 1;
          } else if (fallbackData && typeof fallbackData === 'object') {
            if (Array.isArray(fallbackData.dreps)) {
              dreps = fallbackData.dreps;
              nextPage = fallbackData.nextPage || (dreps.length < DREPS_PER_PAGE ? null : page + 1);
            }
          }
          
          console.log(`Success: Fetched ${dreps.length} from fallback.`);
          return {
            dreps: dreps.map((drep: any) => ({
              ...drep,
              questionsAsked: drep.questionsAsked || 0,
              questionsAnswers: drep.questionsAnswers || 0,
              active: drep.active !== undefined ? drep.active : true,
              voting_power: drep.voting_power,
              votesYes: 0,
              votesNo: 0,
              votesAbstain: 0
            })),
            nextPage: nextPage,
            questionAnswers: false,
          };
        } catch (fallbackError) {
          console.error("Both indexed and fallback failed:", fallbackError);
          return {
            dreps: [],
            nextPage: null,
            questionAnswers: false,
            serverError: fallbackError instanceof Error ? fallbackError.message : "Failed to fetch data"
          };
        }
      }
    },
    retry: 1, 
    retryDelay: 1000,
    enabled: totalPages > 0 || !!countError,
    staleTime: 2 * 60 * 1000, 
    refetchOnWindowFocus: false,
  });
  // --- End Updated Query --- 

  // Effect to update processed data
  useEffect(() => {
    if (drepsData) {
      try {
        if ('serverError' in drepsData && drepsData.serverError) {
           console.error("Server error flag set:", drepsData.serverError);
          setProcessedData({ dreps: [], nextPage: null });
          return; 
        }
        
        console.log("Processing new drepsData. Source:", fetchSource);
        setProcessedData({
          dreps: drepsData.dreps,
          nextPage: drepsData.nextPage
        });
      } catch (e) {
        console.error("Error processing data:", e);
        setProcessedData({ dreps: [], nextPage: null });
      }
    } else if (error) {
        console.error("Query failed, clearing processed data.");
        setProcessedData({ dreps: [], nextPage: null });
    }
  }, [drepsData, error, fetchSource]);

  // --- Handle Sort Change --- 
  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortValue = event.target.value as SortOptionValue;
    console.log("Sort changed to:", newSortValue);
    setSortBy(newSortValue);
    setPage(1); // Reset to page 1 when sorting changes
    window.scrollTo(0, 0);
  };
  // --- End Handle Sort Change --- 

  const handleRetry = () => {
    setIsRetrying(true);
    if (countError) {
      console.log("Retrying count query...");
      refetchCount();
    }
    console.log("Retrying main data fetch...");
    refetch().finally(() => {
      setIsRetrying(false);
    });
  };

  const onDelegate = async (drepId: string, isActive: boolean) => {
    try {
      if (!connected) {
        toast.error("Please connect your wallet to delegate.");
        return;
      }

      if (!isActive) {
        toast.error("Cannot delegate to an inactive dRep.");
        return;
      }

      const address = (await wallet.getRewardAddresses())[0];

      if (!address) {
        return;
      }

      const txHash = await buildSubmitConwayTx(true, wallet as BrowserWallet, drepId);

      if (txHash) {
        toast.success(
          `Successfully delegated to ${drepId}. Transaction Hash: ${txHash}`,
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

  const formatDrepId = (id: string) => {
    if (!id) return "";
    if (id.length <= 15) return id;
    return `${id.slice(0, 10)}...${id.slice(-5)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("ID copied to clipboard"))
      .catch(() => toast.error("Failed to copy"));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    if (totalPages > 0 && newPage > totalPages) {
        console.log(`Rejecting page change to ${newPage} - exceeds total pages ${totalPages}`);
        return;
    }
    console.log(`Changing to page ${newPage}`);
    setPage(newPage);
    window.scrollTo(0, 0);
  };
  
  const renderPagination = () => {
    if (totalPages === 0 || !processedData) return null;

    const pageNumbers = [];
    const maxButtonsToShow = 5;
    let startPage = Math.max(1, page - Math.floor(maxButtonsToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxButtonsToShow - 1);
    
    if (endPage - startPage + 1 < maxButtonsToShow) {
      startPage = Math.max(1, endPage - maxButtonsToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    // --- Updated Pagination Text based on source and sort --- 
    let sortLabel = '';
    if (fetchSource === 'indexed') {
      sortLabel = sortOptions.find(opt => opt.value === sortBy)?.label || 'Sorted';
    } else if (fetchSource === 'fallback') {
      sortLabel = 'Sorted by Newest First (Fallback Data)';
    } else {
      sortLabel = 'Loading Sort Order...';
    }
    // --- End Updated Text --- 

    return (
      <div className="flex flex-col items-center justify-center mt-6 mb-10">
        <div className="text-sm text-tertiary mb-3">
          Page {page} of {totalPages} • Total dReps: {totalDreps} • {sortLabel}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* First Page Button */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            className={`flex items-center justify-center w-10 h-10 rounded-md ${ 
              page === 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gray-100 text-tertiary hover:bg-gray-200"
            }`}
            aria-label="First page"
          >
            <IoPlayBack size={18} />
          </button>
          
          {/* Previous Page Button */}
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className={`flex items-center justify-center w-10 h-10 rounded-md ${ 
              page === 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gray-100 text-tertiary hover:bg-gray-200"
            }`}
            aria-label="Previous page"
          >
            <IoChevronBack size={18} />
          </button>
          
          {/* Page Number Buttons */}
          {pageNumbers.map((num) => (
            <button
              key={num}
              onClick={() => handlePageChange(num)}
              className={`flex items-center justify-center w-10 h-10 rounded-md ${ 
                page === num
                  ? "bg-gradient-to-b from-[#FFC896] from-[-47.73%] to-[#FB652B] to-[78.41%] text-white"
                  : "bg-gray-100 text-tertiary hover:bg-gray-200"
              }`}
            >
              {num}
            </button>
          ))}
          
          {/* Next Page Button */}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className={`flex items-center justify-center w-10 h-10 rounded-md ${ 
              page === totalPages
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gray-100 text-tertiary hover:bg-gray-200"
            }`}
            aria-label="Next page"
          >
            <IoChevronForward size={18} />
          </button>
          
          {/* Last Page Button */}
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={page === totalPages}
            className={`flex items-center justify-center w-10 h-10 rounded-md ${ 
              page === totalPages
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gray-100 text-tertiary hover:bg-gray-200"
            }`}
            aria-label="Last page"
          >
            <IoPlayForward size={18} />
          </button>
        </div>
      </div>
    );
  };

  if (isLoading || isLoadingCount || isRetrying) {
    return (
      <section className="flex w-full items-center justify-center pt-32">
        <Loader />
      </section>
    );
  }

  const mainQueryFailed = !!error || (drepsData && 'serverError' in drepsData && !!drepsData.serverError);
  if (countError || mainQueryFailed) {
    const errorMessage = countError
      ? "Failed to load total dRep count. Pagination may be unavailable." // Specific count error message
      : (drepsData?.serverError || (error ? String(error) : "Failed to load dReps after fallback."));

    console.error("Error in explorer page:", errorMessage);
    return (
      <section className="flex w-full flex-col items-center justify-center gap-4 pt-32">
        <ErrorCard message={errorMessage} />
        <button
          onClick={handleRetry}
          className="mt-4 rounded-lg bg-primary px-6 py-2 text-white hover:bg-primary-dark transition-colors"
        >
          Retry
        </button>
      </section>
    );
  }

  if ((totalPages === 0 && !countError) || !processedData) {
     return (
       <section className="flex w-full items-center justify-center pt-32">
         <Loader />
       </section>
     );
  }
  
  if (processedData.dreps.length === 0 && page === 1) {
      return (
        <section className="flex w-full flex-col items-center justify-center gap-4 pt-32">
          <ErrorCard message="No DREPs found for the first page, even after checking fallback." />
          {/* Optional: Add Retry button here too if desired */}
        </section>
      );
  }

  return (
    <>
      <Metatags />
      
      <div className="container mx-auto px-6 py-8">
        <h1 className="mb-6 mt-4 pl-2 font-neue-regrade text-3xl font-bold text-black">dRep Explorer</h1>
        
        <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-grow">
            <div className="flex items-center w-full rounded-xl border border-primary-light bg-white p-3 shadow-color">
              <FiSearch className="text-gray-400 mr-2" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  handleSearch(value);
                }}
                placeholder="Search for DRep by name or ID"
                className="w-full flex-1 bg-transparent font-ibm-mono text-sm font-medium text-secondary outline-none placeholder:text-secondary/60"
              />
              {isSearching && (
                <div className="mx-2">
                  <Loader />
                </div>
              )}
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-primary transition-colors"
                  title="Clear search"
                >
                  <MdClear size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <select 
              value={sortBy}
              onChange={handleSortChange}
              disabled={fetchSource === 'fallback' || searchQuery.trim() !== ""}
              className={`appearance-none w-full md:w-auto rounded-xl border border-primary-light bg-white p-3 pr-8 shadow-color font-ibm-mono text-sm font-medium text-secondary outline-none ${fetchSource === 'fallback' || searchQuery.trim() !== "" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
              aria-label="Sort dReps by"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.481 1.576 0l2.908 2.908 2.908-2.908c.533-.481 1.141-.446 1.574 0 .436.445.408 1.197 0 1.615l-3.715 3.715c-.44.44-.984.66-1.574.66s-1.135-.22-1.574-.66L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto rounded-xl border border-primary-light bg-white shadow-color">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">
                    DREP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">
                    Questions Answered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">
                    Questions Asked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">
                    Voting Power
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">
                    Yes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">
                    No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">
                    Abstain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {(searchQuery.trim() !== "" ? searchResults : processedData.dreps).map((drep: Drep) => (
                  <tr key={drep.drep_id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link href={`/profile/${drep.drep_id}`} className="flex items-center gap-3">
                        <LetterAvatar
                          username={drep.givenName || drep.drep_id}
                          dimension={40}
                          rounded
                          src={drep.image || null}
                        />
                        <div className="flex flex-col">
                          <span className="font-neue-regrade font-medium text-black">
                            {drep.givenName || "Unnamed DREP"}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-inter text-sm text-secondary">{drep.questionsAnswers ?? 0}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-inter text-sm text-secondary">{drep.questionsAsked ?? 0}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-inter text-sm text-secondary">
                        {drep.voting_power !== null && drep.voting_power !== undefined ? 
                          (drep.voting_power / 1000000).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                          : '0'
                        } ₳
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-inter text-sm text-secondary">{(drep as any).votesYes ?? 0}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-inter text-sm text-secondary">{(drep as any).votesNo ?? 0}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-inter text-sm text-secondary">{(drep as any).votesAbstain ?? 0}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={drep.active ? `/ask-question?to=${drep.drep_id}` : "#"}
                          onClick={(e) => !drep.active && e.preventDefault()}
                          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-white ${ 
                            drep.active 
                              ? "bg-gradient-to-b from-[#FFC896] from-[-47.73%] to-[#FB652B] to-[78.41%]" 
                              : "bg-gray-300 cursor-not-allowed"
                          }`}
                        >
                          <BsChatQuoteFill className="text-[20px]" />
                          <span className="text-shadow font-inter text-xs font-medium">
                            {drep.active ? "Ask" : "Inactive"}
                          </span>
                        </Link>
                        <motion.button
                          onClick={() => onDelegate(drep.drep_id, Boolean(drep.active))}
                          disabled={!drep.active}
                          className={`flex items-center gap-2 rounded-lg px-4 py-2 ${ 
                            drep.active 
                              ? "bg-[#EAEAEA] text-secondary" 
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          }`}
                          whileHover={drep.active ? { scaleX: 1.025 } : undefined}
                          whileTap={drep.active ? { scaleX: 0.995 } : undefined}
                        >
                          <span className="font-inter text-xs font-medium">Delegate</span>
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {searchQuery.trim() !== "" && searchResults.length === 0 && !isSearching && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-tertiary">
                      No DREPs found for "{searchQuery}". Try a different search term.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            {(searchQuery.trim() !== "" ? searchResults : processedData.dreps).map((drep: Drep) => (
              <div key={drep.drep_id} className="border-b border-gray-200 p-4 last:border-b-0">
                <div className="flex items-center gap-3 mb-3">
                  <Link href={`/profile/${drep.drep_id}`} className="flex items-center gap-3">
                    <LetterAvatar
                      username={drep.givenName || drep.drep_id}
                      dimension={40}
                      rounded
                      src={drep.image || null}
                    />
                    <div className="flex flex-col">
                      <span className="font-neue-regrade font-medium text-black">
                        {drep.givenName || "Unnamed DREP"}
                      </span>
                    </div>
                  </Link>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-tertiary">Questions Answered:</span>
                    <span className="text-secondary">{drep.questionsAnswers ?? 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-tertiary">Questions Asked:</span>
                    <span className="text-secondary">{drep.questionsAsked ?? 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-tertiary">Voting Power:</span>
                    <span className="text-secondary">
                      {drep.voting_power !== null && drep.voting_power !== undefined ? 
                        (drep.voting_power / 1000000).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                        : '0'
                      } ₳
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-tertiary">Votes Yes:</span>
                    <span className="text-secondary">{(drep as any).votesYes ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-tertiary">Votes No:</span>
                    <span className="text-secondary">{(drep as any).votesNo ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-tertiary">Votes Abstain:</span>
                    <span className="text-secondary">{(drep as any).votesAbstain ?? 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Link
                    href={drep.active ? `/ask-question?to=${drep.drep_id}` : "#"}
                    onClick={(e) => !drep.active && e.preventDefault()}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-white ${ 
                      drep.active 
                        ? "bg-gradient-to-b from-[#FFC896] from-[-47.73%] to-[#FB652B] to-[78.41%]" 
                        : "bg-gray-300 cursor-not-allowed"
                    }`}
                  >
                    <BsChatQuoteFill className="text-[20px]" />
                    <span className="text-shadow font-inter text-xs font-medium">
                      {drep.active ? "Ask" : "Inactive"}
                    </span>
                  </Link>
                  <motion.button
                    onClick={() => onDelegate(drep.drep_id, Boolean(drep.active))}
                    disabled={!drep.active}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 ${ 
                      drep.active 
                        ? "bg-[#EAEAEA] text-secondary" 
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                    whileHover={drep.active ? { scaleX: 1.025 } : undefined}
                    whileTap={drep.active ? { scaleX: 0.995 } : undefined}
                  >
                    <span className="font-inter text-xs font-medium">Delegate</span>
                  </motion.button>
                </div>
              </div>
            ))}
            
            {searchQuery.trim() !== "" && searchResults.length === 0 && !isSearching && (
              <div className="px-6 py-10 text-center text-tertiary">
                No DREPs found for "{searchQuery}". Try a different search term.
              </div>
            )}
          </div>
        </div>

        {searchQuery.trim() === "" && renderPagination()}

        <div className="mt-4 flex justify-center gap-4">
          <motion.button
            onClick={handleRetry}
            className="rounded-lg bg-[#EAEAEA] px-6 py-2 text-secondary"
            whileHover={{ scaleX: 1.025 }}
            whileTap={{ scaleX: 0.995 }}
          >
            Refresh
          </motion.button>
          
          {searchQuery.trim() !== "" && (
            <motion.button
              onClick={clearSearch}
              className="rounded-lg bg-gray-100 px-6 py-2 text-tertiary"
              whileHover={{ scaleX: 1.025 }}
              whileTap={{ scaleX: 0.995 }}
            >
              Clear Search
            </motion.button>
          )}
        </div>
      </div>
    </>
  );
};

export default ExplorerPage; 