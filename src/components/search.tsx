import { useState } from "react";
import { BsChatQuoteFill } from "react-icons/bs";
import { FiSearch } from "react-icons/fi";
import { motion } from "framer-motion";
import Image from "next/image";

import Loader from "./loader";
import { BASE_API_URL } from "~/data/api";
import Link from "next/link";
import LetterAvatar from "./letter-avatar";
import axios from "axios";
import { Drep } from "~/types"; // Import Drep type for consistency

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
}

// Update Drep type to include canonical drep_id if potentially different
// (Assuming the backend now returns the canonical ID)
// interface Drep {
//   drep_id: string; // This should now be the canonical ID
//   givenName: string | null;
//   image: string | null;
//   active: boolean;
//   questionsAsked?: number;
//   questionsAnswers?: number;
// }

// Using Drep type directly now for search results
// interface SearchResult {
//   drep_id: string;
//   active: boolean;
//   image: string | null;
//   givenName: string | null;
// }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DebounceFunction = (...p: any[]) => any;

const Search: React.FC = (): React.ReactNode => {
  const [searchText, setSearchText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  // Use Drep type for search results state
  const [searchResults, setSearchResults] = useState<Drep[]>([]);

  function debounce(fn: DebounceFunction, t: number): DebounceFunction {
    let timeout: ReturnType<typeof setTimeout>;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        fn(...args);
      }, t);
    };
  }

  // Align search logic with explorer page's handleSearch
  const handleInputChange = debounce(async (value: string) => {
    const query = value.trim(); // Use trimmed value
    if (!query) {
      setSearchResults([]);
      setSearchText("");
      setLoading(false); // Ensure loading is stopped
      return;
    }
    
    setSearchText(value); // Keep original value for input display
    setLoading(true);
    let resultsFoundInIndex = false;
    let formattedResults: Drep[] = [];

    try {
      // --- Step 1: Try searching the indexed endpoint --- 
      console.log(`[Search Component] Attempting indexed search for: "${query}"`);
      const { data: indexedData } = await axios.get<IndexedDrep[]>(
        // Use 'query' parameter and encodeURIComponent
        `${BASE_API_URL}/api/v1/drep/indexed/search?query=${encodeURIComponent(query)}` 
      );
      
      if (Array.isArray(indexedData) && indexedData.length > 0) {
        console.log(`[Search Component] Found ${indexedData.length} result(s) in index.`);
        resultsFoundInIndex = true;
        // Map IndexedDrep to Drep for UI consistency
        formattedResults = indexedData.map(item => ({
          drep_id: item.drep_id,
          givenName: item.name, 
          image: item.image_url,
          active: item.status === 'active', 
          // Include counts from index
          questionsAsked: item.questions_asked_count ?? 0, 
          questionsAnswers: item.questions_answered_count ?? 0 
        }));
      } else {
        console.log(`[Search Component] No results found in index for: "${query}"`);
      }

      // --- Step 2: If indexed search failed AND it looks like an ID, try fallback --- 
      if (!resultsFoundInIndex && query.startsWith('drep1')) {
        console.log(`[Search Component] Indexed search failed for ID, attempting fallback query to /drep/query...`);
        try {
          // Define expected type from fallback endpoint more precisely
          type FallbackResult = { 
            drep_id: string;
            active: boolean;
            image: string | null;
            givenName: string | null;
          };
          const { data: fallbackData } = await axios.get<FallbackResult[] | FallbackResult>(
            `${BASE_API_URL}/api/v1/drep/query?search_query=${encodeURIComponent(query)}`
          );
          
          const fallbackArray = Array.isArray(fallbackData) ? fallbackData : (fallbackData ? [fallbackData] : []);

          if (fallbackArray.length > 0 && fallbackArray[0]?.drep_id) {
             console.log(`[Search Component] Found ${fallbackArray.length} result(s) via fallback /query.`);
             // Map fallback data to Drep type, defaulting counts to 0
             formattedResults = fallbackArray.map(item => ({
               drep_id: item.drep_id,
               givenName: item.givenName,
               image: item.image,
               active: item.active, 
               questionsAsked: 0, 
               questionsAnswers: 0 
             }));
          } else {
            console.log(`[Search Component] No results found via fallback /query for: "${query}"`);
          }
        } catch (fallbackError) {
           // Handle specific 404 for drep_id search in fallback
           if (axios.isAxiosError(fallbackError) && fallbackError.response?.status === 404 && query.startsWith('drep1')) {
             console.log(`[Search Component] Fallback query 404 for drep1 ID, creating inactive result.`);
             formattedResults = [{
                 active: false,
                 drep_id: query,
                 image: null,
                 givenName: null,
                 questionsAsked: 0,
                 questionsAnswers: 0
             }];
           } else {
             console.error(`[Search Component] Fallback /query error for "${query}":`, fallbackError);
             // Leave formattedResults empty if fallback fails generally
           }
        }
      }
      
      // --- Step 3: Update state with results --- 
      setSearchResults(formattedResults);

    } catch (err) {
      // Catch errors from the initial indexed search attempt
      console.error("[Search Component] Initial indexed search error:", err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, 300);
  
  return (
    <motion.div
      className="relative z-[2] mt-5 flex w-[90%] items-center gap-3 rounded-xl border border-primary-light bg-white p-4 shadow-color md:w-[680px] md:p-5 "
      initial={{ opacity: 0, y: 120 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.75, duration: 0.5 }}
    >
      {/* Group input and search/loader icon */}
      <div className="flex flex-1 items-center gap-2 border-r border-gray-200 pr-3 mr-3">
        <input
          type="text"
          className="w-full flex-1 bg-transparent font-ibm-mono text-[13px] font-medium text-secondary outline-none placeholder:text-secondary/60"
          placeholder="Search for DRep by name or ID"
          // Let state control the input value if needed, or keep as is for simplicity
          // value={searchText}
          onChange={(e) => handleInputChange(e.target.value)}
        />

        {/* Show loader when loading AND search text exists */}
        {loading && searchText ? <Loader /> : <FiSearch className="text-gray-400" />}
      </div>

      {/* Explore dReps Button */}
      <Link href="/explorer">
        <button
          className="whitespace-nowrap border border-orange-500 text-orange-500 px-3 py-1.5 rounded hover:bg-orange-100 text-xs" // Adjusted padding and text size
        >
          Explore dReps
        </button>
      </Link>

      {/* Results dropdown */} 
      <div
        // Use searchText presence and length to control visibility/height
        className={`absolute left-0 top-full w-full translate-y-4 overflow-y-auto rounded-lg border-brd-clr bg-white shadow-lg ${searchText && searchResults.length > 0 ? "max-h-[415px] border md:max-h-[350px] " : (searchText && !loading ? "max-h-[80px] border p-3 md:px-5 md:py-4" : "max-h-0 border-0")} transition-all duration-300`}
      >
        {/* Render results only if searchResults has items */} 
        {searchResults.length > 0 ? (
          <div className="p-3 md:px-5 md:py-4">
            {(searchResults ?? []).map((el, i) => (
              <div
                key={el.drep_id || i} // Use canonical drep_id as key
                className={`flex flex-col items-center justify-between gap-2 border-b border-primary-light p-3 md:flex-row`}
              >
                <div className="flex items-center justify-center gap-3">
                  <div>
                    <LetterAvatar
                      rounded
                      username={el?.givenName ?? el.drep_id}
                      dimension={50}
                      src={el?.image}
                    />
                  </div>
                  <div className="flex w-full max-w-none flex-col gap-1 md:max-w-[290px]">
                    <Link
                      href={`/profile/${el.drep_id}`}
                      className="font-inter text-xs font-medium tracking-wide text-secondary hover:underline md:text-sm"
                    >
                      {el?.givenName ?? el.drep_id} {/* Show canonical ID if no name */}
                      <span className={`ml-2 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${ 
                        el.active 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {el.active ? "Active" : "Inactive"}
                      </span>
                    </Link>
                    {/* Show truncated canonical ID only if name exists */} 
                    {el.givenName && (
                      <div className="w-full overflow-hidden text-ellipsis font-inter text-[10px] font-medium tracking-wide text-tertiary md:text-xs">
                        {el.drep_id}
                      </div>
                    )}
                  </div>
                </div>
                <Link
                  href={el.active ? `/ask-question?to=${el.drep_id}` : '#'} // Link to canonical drep_id for asking question
                  className={`flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-[#E6E6E6] ${ 
                    el.active 
                      ? "bg-primary-light text-primary hover:bg-primary/10" // Add hover effect
                      : "bg-gray-100 text-gray-500 cursor-not-allowed"
                  } px-3 py-2 md:w-auto md:px-[18px] md:py-4 transition-colors`}
                  onClick={e => !el.active && e.preventDefault()}
                >
                  <BsChatQuoteFill className="text-lg md:text-xl" />
                  <div className="font-inter text-xs font-semibold tracking-wide md:text-sm ">
                    {el.active ? "Ask question" : "Inactive dRep"}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : searchText && !loading ? (
          // Display "No results" inside the container when applicable
          <div className="font-inter text-xs font-medium tracking-wide text-secondary md:text-sm p-3 md:px-5 md:py-4">
            No results found for "{searchText}"
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

export default Search;
