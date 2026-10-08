import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

function getImage(slide) {
  return (
    slide?.image?.url ||
    slide?.imageUrl ||
    slide?.desktopImage ||
    slide?.image ||
    slide?.bannerImage ||
    slide?.url ||
    slide?.secure_url ||
    ""
  );
}

function getMobileImage(slide) {
  return (
    slide?.mobileImage?.url ||
    slide?.mobileImageUrl ||
    slide?.mobileImage ||
    slide?.mobileUrl ||
    ""
  );
}

function getLink(slide) {
  return slide?.buttonLink || slide?.link || slide?.ctaLink || slide?.href || "/products";
}

function getOrder(slide) {
  return Number(slide?.order ?? slide?.sortOrder ?? 0);
}

export default function HeroSlider({ slides = [], loading = false }) {
  const activeSlides = useMemo(() => {
    const list = Array.isArray(slides) ? slides : [];

    return list
      .filter((slide) => {
        return slide && slide.isActive !== false && getImage(slide);
      })
      .sort((a, b) => getOrder(a) - getOrder(b));
  }, [slides]);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (index >= activeSlides.length) {
      setIndex(0);
    }
  }, [activeSlides.length, index]);

  useEffect(() => {
    if (activeSlides.length <= 1) return;

    const timer = window.setInterval(() => {
      setDirection(1);
      setIndex((current) => (current + 1) % activeSlides.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [activeSlides.length]);

  function nextSlide() {
    if (activeSlides.length <= 1) return;

    setDirection(1);
    setIndex((current) => (current + 1) % activeSlides.length);
  }

  function previousSlide() {
    if (activeSlides.length <= 1) return;

    setDirection(-1);
    setIndex((current) =>
      current === 0 ? activeSlides.length - 1 : current - 1
    );
  }

  function goToSlide(nextIndex) {
    setDirection(nextIndex > index ? 1 : -1);
    setIndex(nextIndex);
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-5 lg:px-8">
        <div className="aspect-[16/8.8] w-full animate-pulse rounded-[24px] bg-slate-100 shadow-soft-card sm:aspect-[16/6.4] lg:aspect-[16/6]" />
      </section>
    );
  }

  if (!activeSlides.length) {
    return (
      <section className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-5 lg:px-8">
        <div className="overflow-hidden rounded-[26px] bg-lora-dark p-6 text-white shadow-soft-card sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-lora-lime">
            Lo'ra groceries
          </p>

          <h1 className="mt-3 max-w-xl text-3xl font-black leading-tight sm:text-5xl">
            Fresh groceries delivered with care.
          </h1>

          <p className="mt-3 max-w-lg text-sm font-bold leading-6 text-white/75 sm:text-base">
            Shop food, drinks, snacks and daily essentials from one clean
            grocery store.
          </p>

          <Link
            to="/products"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-lora-dark"
          >
            Shop now
          </Link>
        </div>
      </section>
    );
  }

  const slide = activeSlides[index];
  const image = getImage(slide);
  const mobileImage = getMobileImage(slide);
  const link = getLink(slide);

  return (
    <section className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-5 lg:px-8">
      <div className="relative overflow-hidden rounded-[24px] bg-white shadow-soft-card ring-1 ring-slate-100 sm:rounded-[30px]">
        <div className="relative aspect-[16/8.8] w-full bg-white sm:aspect-[16/6.4] lg:aspect-[16/6]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide._id || `${image}-${index}`}
              custom={direction}
              initial={{
                opacity: 0,
                x: direction > 0 ? 24 : -24,
                scale: 0.995
              }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1
              }}
              exit={{
                opacity: 0,
                x: direction > 0 ? -24 : 24,
                scale: 0.995
              }}
              transition={{
                duration: 0.38,
                ease: [0.22, 1, 0.36, 1]
              }}
              className="absolute inset-0"
            >
              <Link to={link} className="block h-full w-full">
                <picture>
                  {mobileImage && (
                    <source media="(max-width: 640px)" srcSet={mobileImage} />
                  )}

                  <img
                    src={image}
                    alt={slide.title || "Lo'ra grocery banner"}
                    className="h-full w-full object-contain"
                    draggable="false"
                    loading="eager"
                  />
                </picture>
              </Link>
            </motion.div>
          </AnimatePresence>

          {activeSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={previousSlide}
                className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur transition hover:bg-white sm:grid"
                aria-label="Previous hero slide"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={nextSlide}
                className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur transition hover:bg-white sm:grid"
                aria-label="Next hero slide"
              >
                <ChevronRight size={20} />
              </button>

              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
                {activeSlides.map((item, dotIndex) => (
                  <button
                    key={item._id || dotIndex}
                    type="button"
                    onClick={() => goToSlide(dotIndex)}
                    className={`h-2 rounded-full transition-all ${
                      dotIndex === index
                        ? "w-7 bg-lora-green"
                        : "w-2 bg-slate-300"
                    }`}
                    aria-label={`Go to hero slide ${dotIndex + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}