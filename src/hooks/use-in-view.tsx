import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
    root?: Element | null;
    rootMargin?: string;
    threshold?: number | number[];
}

interface UseInViewResult {
    ref: React.RefObject<HTMLDivElement>;
    initialLoad: boolean;
}

const useInView = (options: UseInViewOptions = {}): UseInViewResult => {
    const [initialLoad, setInitialLoad] = useState(true);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting && initialLoad) {
                    // Element is in view for the first time
                    setTimeout(() => {
                        setInitialLoad(false);
                    }, 1250);
                }
            },
            options
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [initialLoad, options]);

    return { initialLoad, ref };
};

export default useInView;
