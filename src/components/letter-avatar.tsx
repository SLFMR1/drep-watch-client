import Image from "next/image";

const LetterAvatar = ({
  username,
  dimension,
  rounded,
  src,
}: {
  username: string;
  dimension?: number;
  rounded?: boolean;
  src?: string | null;
}) => {
  const size = dimension ?? 50;
  
  let processedUsername = username;
  
  if (typeof username === 'string' && username.startsWith('drep')) {
    processedUsername = 'drep';
    
    if (username.includes(' ')) {
      processedUsername = username;
    }
  }
  
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(processedUsername)}&background=random&size=${size}`;
  
  return (
    <Image
      width={size}
      height={size}
      className={`${rounded ? "rounded-full" : "rounded-xl"}`}
      src={src ? src : fallbackUrl}
      alt={`${username}'s avatar`}
      unoptimized
      onError={(e) => {
        e.currentTarget.src = fallbackUrl;
      }}
    />
  );
};

export default LetterAvatar;
