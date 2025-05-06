type LoaderType = {
    colored?: boolean;
}

const Loader: React.FC<LoaderType> = ({colored = false}): React.ReactNode => {
    return (
        <div className="h-full w-auto m-auto gap-5 flex justify-center items-center">
            {/* <div className="w-8 h-8 relative rounded-full animate-spin" style={{ backgroundImage: "conic-gradient(white 225deg, #ffffff10 90deg, #01020d)" }}> */}
            <div className="w-5 h-5 relative rounded-full animate-spin" style={{ backgroundImage: "conic-gradient(#FF4700 45deg, #FF470010 250deg, #fff)" }}>
                <div className={`inset-[3px] bg-white ${colored ? "bg-gradient-to-b from-[#fc844c] to-[#fc6c33]" : "bg-white"} absolute rounded-full`} />
            </div>
        </div>
    );
};

export default Loader;