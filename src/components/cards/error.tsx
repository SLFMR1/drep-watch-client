export default function ErrorCard({ message = "Page not found" }: { message?: string }) {
    return (
        <div
            style={{ width: "calc(100% - 100px)" }}
            className="m-auto max-w-[1000px] bg-white flex h-[600px] flex-col items-center justify-center gap-6 rounded-lg p-5 shadow-2xl"
        >
            <h1 className="text-6xl font-semibold text-orange-600">404</h1>
            <p className="text-2xl font-medium">{message}</p>
            <button className="text-shadow flex h-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#FFC896] from-[-47.73%] to-[#FB652B]  to-[78.41%] px-8 text-sm text-white">
                Back to Home
            </button>
        </div>
    );
}
