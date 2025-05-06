/**
 * Utility functions for sharing content on social media platforms
 */

/**
 * Extract X (Twitter) handle from URL
 * @param url - The URL to an X.com or Twitter profile
 * @returns The handle without the @ symbol, or null if not found
 */
export const extractXHandle = (url: string): string | null => {
  // Handle both x.com and twitter.com URLs
  const regex = /(?:twitter\.com|x\.com)\/([^/?\s]+)/i;
  const match = url.match(regex);
  
  if (match && match[1]) {
    // Return the handle without the @ symbol
    return match[1];
  }
  
  return null;
};

/**
 * Share content on X.com (formerly Twitter)
 * @param url - The URL to share
 * @param text - The text to share with the URL
 */
export const shareOnX = (url: string, text: string): void => {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  const shareUrl = `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  window.open(shareUrl, '_blank');
};

/**
 * Share a DREP profile on X.com
 * @param drepId - The DREP ID
 * @param drepName - The DREP name (optional)
 * @param xHandle - The DRep's X.com handle (optional)
 */
export const shareDrepProfile = (drepId: string, drepName?: string, xHandle?: string): void => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${baseUrl}/profile/${drepId}`;
  
  let text = '';
  if (xHandle) {
    text = drepName 
      ? `Check out @${xHandle} dRep profile on @dRepWatch!`
      : `Check out @${xHandle}'s dRep profile on @dRepWatch!`;
  } else {
    text = drepName 
      ? `Check out ${drepName}'s dRep profile on @dRepWatch!`
      : `Check out this dRep profile on @dRepWatch!`;
  }
  
  shareOnX(url, text);
};

/**
 * Share a question/answer on X.com
 * @param questionId - The question ID
 * @param questionTitle - The question title
 * @param drepId - The DREP ID (optional)
 * @param drepName - The DREP name (optional)
 * @param xHandle - The DRep's X.com handle (optional)
 */
export const shareQuestionAnswer = (
  questionId: string, 
  questionTitle: string, 
  drepId?: string,
  drepName?: string,
  xHandle?: string
): void => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${baseUrl}/answer/${questionId}`;
  
  let text = '';
  if (xHandle) {
    text = `"${questionTitle}" - Check out this Q&A for @${xHandle} on @dRepWatch!`;
  } else if (drepName) {
    text = `"${questionTitle}" - Check out this Q&A for ${drepName} on @dRepWatch!`;
  } else {
    text = `"${questionTitle}" - Check out this Q&A on @dRepWatch!`;
  }
  
  shareOnX(url, text);
}; 