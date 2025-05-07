// export const BASE_API_URL = process.env.NODE_ENV === "production" ? "https://drepserver.vercel.app" : "http://localhost:8080"
// export const BASE_API_URL = "https://drepserver.vercel.app"
export const BASE_API_URL = process.env.NODE_ENV === "production" 
  ? "https://drepwatch-6li8u.ondigitalocean.app/drep-watch-server"
  : "http://localhost:8080";